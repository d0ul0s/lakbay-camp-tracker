const express = require('express');
const router = express.Router();
const TribeProposal = require('../models/TribeProposal');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');

// Middleware to strictly enforce admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only Admins can manage Tribe Proposals.' });
  }
  next();
};

// GET all proposals
router.get('/', auth, async (req, res) => {
  try {
    const proposals = await TribeProposal.find({}).sort({ createdAt: -1 });
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new proposal
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const { name, groupCount, distribution, metrics } = req.body;
    
    // Check if name already exists
    const existing = await TribeProposal.findOne({ name });
    if (existing) return res.status(400).json({ message: 'A proposal with this name already exists.' });

    const newProposal = new TribeProposal({
      name,
      groupCount,
      distribution,
      metrics
    });
    await newProposal.save();
    
    await logActivity(
      req.user.id,
      req.user.role,
      'Saved Tribe Proposal',
      `Saved new proposal version: ${name}`,
      req.ip
    );
    
    res.status(201).json(newProposal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE proposal
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const proposal = await TribeProposal.findByIdAndDelete(req.params.id);
    if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
    
    await logActivity(
      req.user.id,
      req.user.role,
      'Deleted Tribe Proposal',
      `Removed proposal version: ${proposal.name}`,
      req.ip
    );
    
    res.json({ message: 'Proposal deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
