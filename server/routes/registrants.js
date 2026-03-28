const express = require('express');
const router = express.Router();
const Registrant = require('../models/Registrant');
const logActivity = require('../utils/logger');
const { attachPermissions, requirePermission } = require('../middleware/permissions');

// Always attach fresh permissions matrix for these routes
router.use(attachPermissions);

// GET all registrants
router.get('/', requirePermission('registrants', 'view'), async (req, res) => {
  try {
    const registrants = await Registrant.find();
    res.json(registrants);
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

    if (role !== 'admin' && userChurch) {
      req.body.church = userChurch;
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

      if (role !== 'admin' && userChurch) {
        data.church = userChurch;
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
      // Check church ownership
      if (registrant.church !== userChurch && !perms.editAny) {
        return res.status(403).json({ message: 'Unauthorized: You can only edit registrants from your own church.' });
      }

      // Check merch edit permission
      const merchPerms = req.permissionMatrix[role].merch;
      if (req.body.merchClaims || req.body.merchClaimDates) {
        if (!merchPerms.toggleAll && (!merchPerms.toggleOwn || registrant.church !== userChurch)) {
          return res.status(403).json({ message: 'Unauthorized: You do not have permission to update merch claims.' });
        }
      }
    }

    // Secure backend: enforce own church if not editAny
    if (role !== 'admin') {
      const perms = req.permissionMatrix[role].registrants;
      if (!perms.editAny && userChurch) {
         req.body.church = userChurch;
      }
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
      if (registrant.church !== userChurch && !perms.deleteAny) {
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
