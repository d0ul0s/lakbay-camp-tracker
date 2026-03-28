const express = require('express');
const router = express.Router();
const Solicitation = require('../models/Solicitation');
const logActivity = require('../utils/logger');
const { attachPermissions, requirePermission } = require('../middleware/permissions');

router.use(attachPermissions);

router.get('/', requirePermission('solicitations', 'view'), async (req, res) => {
  try {
    const records = await Solicitation.find();
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', requirePermission('solicitations', 'add'), async (req, res) => {
  const record = new Solicitation({ ...req.body, createdBy: req.user.id });
  try {
    const newRecord = await record.save();
    
    // Broadcast update immediately
    req.io.emit('DATA_UPDATED', { 
      type: 'solicitations', 
      action: 'added', 
      user: req.user.role,
      userId: req.user.id,
      data: newRecord
    });

    await logActivity(req, 'CREATE', 'Solicitation', newRecord._id, { sourceName: newRecord.sourceName, amount: newRecord.amount });
    
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', requirePermission('solicitations', 'edit'), async (req, res) => {
  try {
    const solicitation = await Solicitation.findById(req.params.id);
    if (!solicitation) return res.status(404).json({ message: 'Solicitation not found' });
    
    // Check ownership if they don't have editAny (assuming delete/edit rely on createdBy like expenses, using edit directly here, and using verify separatedly)
    // Actually the matrix for solicitations doesn't have editOwn vs editAny, just "edit".
    // I will enforce ownership if they are not admin for safety. Wait - the prompt said: 
    // "Apply the same createdBy ownership logic to Solicitations as to Expenses"
    // Okay, I need to check ownership on edit and delete.
    const role = req.user.role;
    if (role !== 'admin') {
      if (solicitation.createdBy && solicitation.createdBy.toString() !== req.user.id) {
         return res.status(403).json({ message: 'Unauthorized: You can only edit your own logged solicitations.' });
      }
    }

      if (req.body.verifiedByTreasurer !== undefined) {
      if (role !== 'admin') {
        const perms = req.permissionMatrix[role].solicitations;
        if (!perms.verify) {
          return res.status(403).json({ message: 'Unauthorized: You do not have permission to verify solicitations.' });
        }
      }
    }
    const updated = await Solicitation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Solicitation not found' });
    
    // Broadcast update immediately
    req.io.emit('DATA_UPDATED', { 
      type: 'solicitations', 
      action: 'updated', 
      user: req.user.role,
      userId: req.user.id,
      data: updated
    });

    let action = 'UPDATE';
    if (req.body.verifiedByTreasurer !== undefined) {
      action = req.body.verifiedByTreasurer ? 'VERIFY' : 'UNVERIFY';
    }
    await logActivity(req, action, 'Solicitation', updated._id, { sourceName: updated.sourceName }, solicitation, updated);

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', requirePermission('solicitations', 'delete'), async (req, res) => {
  try {
    const solicitation = await Solicitation.findById(req.params.id);
    if (!solicitation) return res.status(404).json({ message: 'Solicitation not found' });

    const role = req.user.role;
    if (role !== 'admin') {
      if (solicitation.createdBy && solicitation.createdBy.toString() !== req.user.id) {
         return res.status(403).json({ message: 'Unauthorized: You can only delete your own logged solicitations.' });
      }
    }

    const deleted = await Solicitation.findByIdAndDelete(req.params.id);
    
    // Broadcast update immediately
    req.io.emit('DATA_UPDATED', { 
      type: 'solicitations', 
      action: 'deleted', 
      user: req.user.role,
      userId: req.user.id,
      data: { _id: req.params.id }
    });

    if (deleted) {
      await logActivity(req, 'DELETE', 'Solicitation', deleted._id, { sourceName: deleted.sourceName });
    }

    res.json({ message: 'Solicitation deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
