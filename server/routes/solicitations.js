const express = require('express');
const router = express.Router();
const Solicitation = require('../models/Solicitation');
const logActivity = require('../utils/logger');

router.use((req, res, next) => {
  const role = req.user.role;
  if (role === 'coordinator') {
    return res.status(403).json({ message: 'Unauthorized: Coordinators have no access to solicitations.' });
  }
  next();
});

router.get('/', async (req, res) => {
  try {
    const records = await Solicitation.find();
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  const record = new Solicitation(req.body);
  try {
    const newRecord = await record.save();
    await logActivity(req, 'CREATE', 'Solicitation', newRecord._id, { sourceName: newRecord.sourceName, amount: newRecord.amount });
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const solicitation = await Solicitation.findById(req.params.id);
    if (!solicitation) return res.status(404).json({ message: 'Solicitation not found' });

    if (req.body.verifiedByTreasurer !== undefined) {
      if (solicitation.verifiedByTreasurer === req.body.verifiedByTreasurer) {
        return res.status(400).json({ message: 'State identical. Verification already processed.' });
      }
    }
    const updated = await Solicitation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Solicitation not found' });
    
    let action = 'UPDATE';
    if (req.body.verifiedByTreasurer !== undefined) {
      action = req.body.verifiedByTreasurer ? 'VERIFY' : 'UNVERIFY';
    }
    await logActivity(req, action, 'Solicitation', updated._id, { sourceName: updated.sourceName });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Solicitation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Solicitation not found' });
    await logActivity(req, 'DELETE', 'Solicitation', deleted._id, { sourceName: deleted.sourceName });
    res.json({ message: 'Solicitation deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
