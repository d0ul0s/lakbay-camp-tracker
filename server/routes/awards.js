const express = require('express');
const router = express.Router();
const Award = require('../models/Award');
const auth = require('../middleware/auth');

// Get all awards
router.get('/', auth, async (req, res) => {
  try {
    const awards = await Award.find()
      .populate('nominations.camperId', 'fullName church sex age')
      .populate('nominations.groupId', 'name color')
      .populate('nominations.nominatedBy', 'church role')
      .sort({ createdAt: -1 });
    res.json(awards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new award
router.post('/', auth, async (req, res) => {
  try {
    const award = new Award({
      title: req.body.title,
      description: req.body.description,
      awardType: req.body.awardType || 'individual',
      createdBy: req.user.id,
      status: 'nominating'
    });
    const newAward = await award.save();
    
    // Broadcast update
    if (req.io) {
      req.io.emit('DATA_UPDATED', { type: 'awards', action: 'added', data: newAward });
    }
    
    res.status(201).json(newAward);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Change award status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const award = await Award.findById(req.params.id);
    if (!award) return res.status(404).json({ message: 'Award not found' });
    
    // Only admins or the creator can change the status
    if (req.user.role !== 'admin' && award.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    award.status = req.body.status;
    const updatedAward = await award.save();
    
    // Populate before broadcasting
    const populatedAward = await Award.findById(updatedAward._id)
      .populate('nominations.camperId', 'fullName church sex age')
      .populate('nominations.groupId', 'name color')
      .populate('nominations.nominatedBy', 'church role');

    if (req.io) {
      req.io.emit('DATA_UPDATED', { type: 'awards', action: 'updated', data: populatedAward });
    }
    
    res.json(populatedAward);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Nominate a camper
router.post('/:id/nominate', auth, async (req, res) => {
  try {
    const award = await Award.findById(req.params.id);
    if (!award) return res.status(404).json({ message: 'Award not found' });
    
    if (award.status !== 'nominating') {
      return res.status(400).json({ message: 'Nominations are closed' });
    }
    
    // Check if duplicate nomination
    if (award.awardType === 'individual') {
      const exists = award.nominations.some(n => n.camperId && n.camperId.toString() === req.body.camperId);
      if (exists) return res.status(400).json({ message: 'Camper already nominated' });
      
      award.nominations.push({
        camperId: req.body.camperId,
        nominatedBy: req.user.id,
        reason: req.body.reason
      });
    } else {
      const exists = award.nominations.some(n => n.groupId && n.groupId.toString() === req.body.groupId);
      if (exists) return res.status(400).json({ message: 'Tribe already nominated' });
      
      award.nominations.push({
        groupId: req.body.groupId,
        nominatedBy: req.user.id,
        reason: req.body.reason
      });
    }
    
    const updatedAward = await award.save();
    
    const populatedAward = await Award.findById(updatedAward._id)
      .populate('nominations.camperId', 'fullName church sex age')
      .populate('nominations.groupId', 'name color')
      .populate('nominations.nominatedBy', 'church role');

    if (req.io) {
      req.io.emit('DATA_UPDATED', { type: 'awards', action: 'updated', data: populatedAward });
    }
    
    res.json(populatedAward);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a nomination
router.delete('/:id/nominate/:nominationId', auth, async (req, res) => {
  try {
    const award = await Award.findById(req.params.id);
    if (!award) return res.status(404).json({ message: 'Award not found' });

    const nomination = award.nominations.id(req.params.nominationId);
    if (!nomination) return res.status(404).json({ message: 'Nomination not found' });

    // Only creator or admin can delete
    if (req.user.role !== 'admin' && nomination.nominatedBy.toString() !== req.user.id) {
       return res.status(403).json({ message: 'Unauthorized removal' });
    }

    nomination.remove();
    const updatedAward = await award.save();

    const populatedAward = await Award.findById(updatedAward._id)
      .populate('nominations.camperId', 'fullName church sex age')
      .populate('nominations.groupId', 'name color')
      .populate('nominations.nominatedBy', 'church role');

    if (req.io) {
      req.io.emit('DATA_UPDATED', { type: 'awards', action: 'updated', data: populatedAward });
    }
    
    res.json(populatedAward);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Toggle/Add vote for a nomination
router.post('/:id/vote/:nominationId', auth, async (req, res) => {
  try {
    const [award, user] = await Promise.all([
      Award.findById(req.params.id),
      User.findById(req.user.id)
    ]);

    if (!award) return res.status(404).json({ message: 'Award not found' });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (award.status !== 'voting') {
      return res.status(400).json({ message: 'Voting is not active' });
    }
    
    const nomination = award.nominations.id(req.params.nominationId);
    if (!nomination) return res.status(404).json({ message: 'Nomination not found' });
    
    const userId = req.user.id;
    const action = req.body.action || 'add'; // 'add' or 'remove'

    if (action === 'add') {
      // Calculate total votes cast by this user for THIS award category
      let totalCast = 0;
      award.nominations.forEach(n => {
        n.votes.forEach(v => {
          if (v.toString() === userId.toString()) totalCast++;
        });
      });

      const limit = user.voteLimit || 1;
      if (totalCast >= limit) {
        return res.status(400).json({ message: `You have reached your limit of ${limit} votes for this award.` });
      }

      nomination.votes.push(userId);
    } else {
      // Remove ONE vote for this specific nomination
      const voteIndex = nomination.votes.findIndex(v => v.toString() === userId.toString());
      if (voteIndex !== -1) {
        nomination.votes.splice(voteIndex, 1);
      }
    }
    
    const updatedAward = await award.save();
    
    const populatedAward = await Award.findById(updatedAward._id)
      .populate('nominations.camperId', 'fullName church sex age')
      .populate('nominations.groupId', 'name color')
      .populate('nominations.nominatedBy', 'church role');

    if (req.io) {
      req.io.emit('DATA_UPDATED', { type: 'awards', action: 'updated', data: populatedAward });
    }
    
    res.json(populatedAward);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete an award
router.delete('/:id', auth, async (req, res) => {
  try {
    const award = await Award.findById(req.params.id);
    if (!award) return res.status(404).json({ message: 'Award not found' });
    
    if (req.user.role !== 'admin' && award.createdBy.toString() !== req.user.id) {
       return res.status(403).json({ message: 'Unauthorized' });
    }
    
    await Award.deleteOne({ _id: req.params.id });
    
    if (req.io) {
      req.io.emit('DATA_UPDATED', { type: 'awards', action: 'deleted', data: { id: req.params.id, _id: req.params.id } });
    }
    
    res.json({ message: 'Award deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
