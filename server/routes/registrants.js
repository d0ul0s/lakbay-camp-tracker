const express = require('express');
const router = express.Router();
const Registrant = require('../models/Registrant');
const logActivity = require('../utils/logger');

// GET all registrants
router.get('/', async (req, res) => {
  try {
    const registrants = await Registrant.find();
    res.json(registrants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new registrant
router.post('/', async (req, res) => {
  const registrant = new Registrant(req.body);
  try {
    const newRegistrant = await registrant.save();
    await logActivity(req, 'CREATE', 'Registrant', newRegistrant._id, { name: newRegistrant.fullName });
    res.status(201).json(newRegistrant);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update registrant
router.put('/:id', async (req, res) => {
  try {
    const role = req.user.role;
    const userChurch = req.user.church;

    const registrant = await Registrant.findById(req.params.id);
    if (!registrant) return res.status(404).json({ message: 'Registrant not found' });

    if (role === 'coordinator') {
      // Check church ownership
      if (registrant.church !== userChurch) {
        return res.status(403).json({ message: 'Unauthorized: You can only edit registrants from your own church.' });
      }

      // Block merch claim updates for coordinators
      if (req.body.merchClaims || req.body.merchClaimDates) {
        return res.status(403).json({ message: 'Unauthorized: Coordinators cannot update merch claims.' });
      }
    }

    // Idempotent Verification Check
    if (req.body.verifiedByTreasurer !== undefined) {
      if (registrant.verifiedByTreasurer === req.body.verifiedByTreasurer) {
        return res.status(400).json({ message: 'State identical. Verification already processed.' });
      }
    }

    const updatedRegistrant = await Registrant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedRegistrant) return res.status(404).json({ message: 'Registrant not found' });
    
    let action = 'UPDATE';
    if (req.body.verifiedByTreasurer !== undefined) {
      action = req.body.verifiedByTreasurer ? 'VERIFY' : 'UNVERIFY';
    }
    await logActivity(req, action, 'Registrant', updatedRegistrant._id, { name: updatedRegistrant.fullName, amountPaid: updatedRegistrant.amountPaid });
    
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

    if (role === 'coordinator') {
      const registrant = await Registrant.findById(req.params.id);
      if (!registrant) return res.status(404).json({ message: 'Registrant not found' });
      
      if (registrant.church !== userChurch) {
        return res.status(403).json({ message: 'Unauthorized: You can only delete registrants from your own church.' });
      }
    }

    const deletedRegistrant = await Registrant.findByIdAndDelete(req.params.id);
    if (!deletedRegistrant) return res.status(404).json({ message: 'Registrant not found' });
    await logActivity(req, 'DELETE', 'Registrant', deletedRegistrant._id, { name: deletedRegistrant.fullName });
    res.json({ message: 'Registrant deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
