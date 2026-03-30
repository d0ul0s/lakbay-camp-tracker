const express = require('express');
const router = express.Router();
const Registrant = require('../models/Registrant');
const logActivity = require('../utils/logger');
const { attachPermissions, requirePermission } = require('../middleware/permissions');

// Always attach fresh permissions matrix for these routes
router.use(attachPermissions);

// GET all registrants with pagination and filtering
router.get('/', requirePermission('registrants', 'view'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 30, 
      search = '', 
      church = 'All', 
      status = 'All', 
      ministry = 'All',
      merchStatus = 'All',
      verification = 'All'
    } = req.query;

    const query = {};

    if (verification !== 'All') {
      query.verifiedByTreasurer = verification === 'Verified';
    }
    console.log('DEBUG: Registrants Query:', { verification, query });
    
    // Role-based visibility: Non-admins might only see their own church depending on permissions
    // But the current controller design seems to return all by default for 'view' permission.
    // We maintain that but allow church filter.
    if (church !== 'All') query.church = church;
    if (status !== 'All') query.paymentStatus = status;
    if (ministry !== 'All') query.ministry = ministry;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { idNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Merch Status logic
    if (merchStatus && merchStatus !== 'All') {
      if (merchStatus === 'Fully Claimed') {
        query['merchClaims.tshirt'] = true;
        query['merchClaims.bag'] = true;
        query['merchClaims.notebook'] = true;
        query['merchClaims.pen'] = true;
      } else if (merchStatus === 'Unclaimed') {
        query['merchClaims.tshirt'] = false;
        query['merchClaims.bag'] = false;
        query['merchClaims.notebook'] = false;
        query['merchClaims.pen'] = false;
      } else if (merchStatus === 'Partial') {
        query.$or = [
          { 'merchClaims.tshirt': true },
          { 'merchClaims.bag': true },
          { 'merchClaims.notebook': true },
          { 'merchClaims.pen': true }
        ];
        // But NOT all True
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { 'merchClaims.tshirt': false },
            { 'merchClaims.bag': false },
            { 'merchClaims.notebook': false },
            { 'merchClaims.pen': false }
          ]
        });
      }
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Registrant.countDocuments(query);
    const registrants = await Registrant.find(query, 'fullName age sex shirtSize church ministry feeType paymentStatus amountPaid paymentMethod verifiedByTreasurer gcRef merchClaims _id')
      .sort({ fullName: 1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      registrants,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET registrants summary (separate from list to avoid aggregate overhead on list calls)
router.get('/summary', requirePermission('registrants', 'view'), async (req, res) => {
  try {
    const all = await Registrant.find({}, 'church amountPaid verifiedByTreasurer feeType merchClaims shirtSize');
    
    const sum = {};
    let totalExpected = 0;
    let totalCollected = 0;

    const merchStats = {
      tshirt: 0,
      bag: 0,
      notebook: 0,
      pen: 0,
      total: 0
    };

    const sizeStats = {};

    const verifiedSizeStats = {};
    const unverifiedSizeStats = {};

    all.forEach(r => {
      if (!sum[r.church]) sum[r.church] = { total: 0, collected: 0, expected: 0, pending: 0 };
      sum[r.church].total += 1;
      
      const size = r.shirtSize || 'Unknown';
      
      if (r.verifiedByTreasurer) {
        sum[r.church].collected += (r.amountPaid || 0);
        totalCollected += (r.amountPaid || 0);
        verifiedSizeStats[size] = (verifiedSizeStats[size] || 0) + 1;
      } else {
        sum[r.church].pending += (r.amountPaid || 0);
        unverifiedSizeStats[size] = (unverifiedSizeStats[size] || 0) + 1;
      }
      const fee = r.feeType === 'Early Bird' ? 350 : 500;
      sum[r.church].expected += fee;
      totalExpected += fee;

      // Merch stats
      merchStats.total += 1;
      if (r.merchClaims?.tshirt) merchStats.tshirt++;
      if (r.merchClaims?.bag) merchStats.bag++;
      if (r.merchClaims?.notebook) merchStats.notebook++;
      if (r.merchClaims?.pen) merchStats.pen++;

      // Global size stats (legacy support)
      sizeStats[size] = (sizeStats[size] || 0) + 1;
    });

    res.json({
      churchSummaries: sum,
      totalExpected,
      totalCollected,
      merchStats,
      sizeStats,
      verifiedSizeStats,
      unverifiedSizeStats
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// POST new registrant
router.post('/', requirePermission('registrants', 'add'), async (req, res) => {
  try {
    const role = req.user.role;
    const userChurch = req.user.church;
    const { fullName } = req.body;

    if (!fullName) return res.status(400).json({ message: 'Full Name is required.' });

    // Case-insensitive duplicate check
    const existing = await Registrant.findOne({ 
      fullName: { $regex: new RegExp(`^${fullName.trim()}$`, 'i') } 
    });
    
    if (existing) {
      return res.status(400).json({ message: `Registrant "${fullName}" already exists in the system.` });
    }

    if (role !== 'admin') {
      if (userChurch) req.body.church = userChurch;
      // Security: Prevent auto-verifying new records
      delete req.body.verifiedByTreasurer;
      delete req.body.verifiedAt;
    }

    const registrant = new Registrant(req.body);
    const newRegistrant = await registrant.save();
    
    // Broadcast update immediately after save
    req.io.emit('DATA_UPDATED', { 
      type: 'registrants', 
      action: 'added', 
      user: req.user.fullName || req.user.role,
      userId: req.user.id,
      data: newRegistrant
    });

    await logActivity(req, 'CREATE', 'Registrant', newRegistrant._id, { name: newRegistrant.fullName });
    
    res.status(201).json(newRegistrant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST batch registrants
router.post('/batch', requirePermission('registrants', 'add'), async (req, res) => {
  try {
    const role = req.user.role;
    const userChurch = req.user.church;
    
    const { registrants } = req.body;
    if (!Array.isArray(registrants)) return res.status(400).json({ message: 'Payload must be an array of registrants.' });
    
    const namesInBatch = new Set();
    const savedDocs = [];

    for (const data of registrants) {
      const trimmedName = data.fullName?.trim();
      if (!trimmedName) continue;

      // 1. Check for duplicates within the batch itself
      const lowerName = trimmedName.toLowerCase();
      if (namesInBatch.has(lowerName)) {
        return res.status(400).json({ message: `Duplicate name "${trimmedName}" found within the batch file.` });
      }
      namesInBatch.add(lowerName);

      // 2. Check for duplicates in the database
      const existing = await Registrant.findOne({ 
        fullName: { $regex: new RegExp(`^${trimmedName}$`, 'i') } 
      });
      if (existing) {
        return res.status(400).json({ message: `Registrant "${trimmedName}" already exists in the system.` });
      }

      if (role !== 'admin') {
        if (userChurch) data.church = userChurch;
        // Security: Prevent auto-verifying batch imported records
        delete data.verifiedByTreasurer;
        delete data.verifiedAt;
      }
      const registrant = new Registrant(data);
      const newRegistrant = await registrant.save();
      savedDocs.push(newRegistrant);
    }

    // Broadcast update before logging activity
    req.io.emit('DATA_UPDATED', { 
      type: 'registrants', 
      action: 'imported', 
      user: req.user.fullName || req.user.role,
      userId: req.user.id,
      data: savedDocs
    });

    for (const doc of savedDocs) {
      await logActivity(req, 'CREATE', 'Registrant', doc._id, { name: doc.fullName, amountPaid: doc.amountPaid });
    }

    res.status(201).json(savedDocs);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update registrant
// Initial check just ensures they have some form of edit access
router.put('/:id', async (req, res) => {
  try {
    const role = req.user.role;
    const userChurch = req.user.church;
    
    if (role !== 'admin') {
      const perms = req.permissionMatrix[role].registrants;
      if (!perms.editOwn && !perms.editAny) {
        return res.status(403).json({ message: 'Forbidden: you do not have edit permissions on registrants.' });
      }
    }

    const registrant = await Registrant.findById(req.params.id);
    if (!registrant) return res.status(404).json({ message: 'Registrant not found' });

    if (role !== 'admin') {
      const perms = req.permissionMatrix[role].registrants;
      
      // 1. Church Ownership Check
      const uChurch = userChurch?.toLowerCase().trim();
      const rChurch = registrant.church?.toLowerCase().trim();
      
      if (uChurch !== rChurch && !perms.editAny) {
        return res.status(403).json({ message: 'Unauthorized: You can only edit registrants from your own church.' });
      }

      // 2. Enforce Church Field Security
      if (!perms.editAny && userChurch) {
         req.body.church = userChurch;
      }

      // 3. Merch Claims Security (Graceful fallback instead of 403 crash)
      const merchPerms = req.permissionMatrix[role].merch;
      let canEditMerch = false;
      if (merchPerms.toggleAll) {
         canEditMerch = true;
      } else if (merchPerms.toggleOwn && uChurch === rChurch) {
         canEditMerch = true;
      }

      if (!canEditMerch) {
        // Automatically drop merch fields from the update payload if they lack permission.
        // This allows them to successfully save name/age/shirt edits without the backend crashing.
        delete req.body.merchClaims;
        delete req.body.merchClaimDates;
      }

      // 4. Verification Security
      // Prevent coordinators from bypassing verification by silently passing it in the edit payload
      delete req.body.verifiedByTreasurer;
    }

    const updatedRegistrant = await Registrant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedRegistrant) return res.status(404).json({ message: 'Registrant not found' });
    
    // Broadcast update immediately
    req.io.emit('DATA_UPDATED', { 
      type: 'registrants', 
      action: 'updated', 
      user: req.user.fullName || req.user.role,
      userId: req.user.id,
      data: updatedRegistrant
    });

    let action = 'UPDATE';
    if (req.body.verifiedByTreasurer !== undefined) {
      action = req.body.verifiedByTreasurer ? 'VERIFY' : 'UNVERIFY';
    }
    await logActivity(req, action, 'Registrant', updatedRegistrant._id, { name: updatedRegistrant.fullName, amountPaid: updatedRegistrant.amountPaid }, registrant, updatedRegistrant);
    
    res.json(updatedRegistrant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE registrant
router.delete('/:id', async (req, res) => {
  try {
    const role = req.user.role;
    const userChurch = req.user.church;
    
    if (role !== 'admin') {
      const perms = req.permissionMatrix[role].registrants;
      if (!perms.deleteOwn && !perms.deleteAny) {
        return res.status(403).json({ message: 'Forbidden: you do not have delete permissions on registrants.' });
      }
    }

    const registrant = await Registrant.findById(req.params.id);
    if (!registrant) return res.status(404).json({ message: 'Registrant not found' });
    
    if (role !== 'admin') {
      const perms = req.permissionMatrix[role].registrants;
      const uChurch = userChurch?.toLowerCase().trim();
      const rChurch = registrant.church?.toLowerCase().trim();
      if (uChurch !== rChurch && !perms.deleteAny) {
        return res.status(403).json({ message: `Unauthorized: You can only delete registrants from your own church.` });
      }
    }

    const deletedRegistrant = await Registrant.findByIdAndDelete(req.params.id);
    if (!deletedRegistrant) return res.status(404).json({ message: 'Registrant not found' });

    // Broadcast update immediately
    req.io.emit('DATA_UPDATED', { 
      type: 'registrants', 
      action: 'deleted', 
      user: req.user.fullName || req.user.role,
      userId: req.user.id,
      data: { id: req.params.id }
    });

    await logActivity(req, 'DELETE', 'Registrant', deletedRegistrant._id, { name: deletedRegistrant.fullName });
    
    res.json({ message: 'Registrant deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH atomic merch toggle
router.patch('/:id/merch', async (req, res) => {
  try {
    const { item, value } = req.body;
    const role = req.user.role;
    const userChurch = req.user.church;

    if (!['tshirt', 'bag', 'notebook', 'pen'].includes(item)) {
      return res.status(400).json({ message: 'Invalid merch item.' });
    }

    const registrant = await Registrant.findById(req.params.id);
    if (!registrant) return res.status(404).json({ message: 'Registrant not found' });

    // Permissions check
    if (role !== 'admin') {
      const merchPerms = req.permissionMatrix[role].merch;
      if (!merchPerms.toggleAll && (!merchPerms.toggleOwn || registrant.church !== userChurch)) {
        return res.status(403).json({ message: 'Unauthorized: You do not have permission to update merch claims.' });
      }
    }

    const update = {
      $set: {
        [`merchClaims.${item}`]: !!value,
        [`merchClaimDates.${item}`]: value ? new Date() : null
      }
    };

    const updatedRegistrant = await Registrant.findByIdAndUpdate(req.params.id, update, { new: true });
    
    // Broadcast update immediately
    req.io.emit('DATA_UPDATED', { 
      type: 'registrants', 
      action: 'updated', 
      user: req.user.fullName || req.user.role,
      userId: req.user.id,
      data: updatedRegistrant
    });

    // Log Activity
    await logActivity(req, value ? 'CLAIM_MERCH' : 'UNCLAIM_MERCH', 'Registrant', updatedRegistrant._id, { 
      name: updatedRegistrant.fullName, 
      item: item 
    });

    res.json(updatedRegistrant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
