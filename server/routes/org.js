const express = require('express');
const router = express.Router();
const CampLeader = require('../models/CampLeader');
const CampGroup = require('../models/CampGroup');
const Registrant = require('../models/Registrant');
const SorterDraft = require('../models/SorterDraft');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');

// Middleware to strictly enforce admin role for destructive actions
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only Admins can modify Organization data.' });
  }
  next();
};

// ===============================
// REGISTRANTS (Participants)
// ===============================

// GET all registrant names for group sorting (Public access for dashboard color-coding)
router.get('/registrants', async (req, res) => {
  try {
    const registrants = await Registrant.find({}, 'fullName church sex spirituality build lockedTribe').sort({ fullName: 1 });
    res.json(registrants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===============================
// LEADERS/STAFF ROUTES
// ===============================

// GET all leaders & staff (Public access)
router.get('/leaders', async (req, res) => {
  try {
    const leaders = await CampLeader.find({}).sort({ name: 1 });
    // Normalize legacy docs: populate `categories` from old single `category` field
    const normalized = leaders.map(l => {
      const obj = l.toJSON();
      if (!obj.categories || obj.categories.length === 0) {
        obj.categories = obj.category ? [obj.category] : [];
      }
      return obj;
    });
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new leader
router.post('/leaders', auth, requireAdmin, async (req, res) => {
  try {
    const { name, churchRef, categories, category, image, socialLink } = req.body;
    // Normalize: build a clean categories array
    let cats = Array.isArray(categories) && categories.length > 0
      ? categories
      : (category ? [category] : []);

    const newLeader = new CampLeader({
      name,
      churchRef: churchRef || null,
      categories: cats,
      category: cats[0] || null,
      image: image || '',
      socialLink: socialLink || '',
    });
    await newLeader.save();
    
    await logActivity(
      req.user.id,
      req.user.role,
      'Added Organization Role',
      `Added ${name} to: ${cats.join(', ')}`,
      req.ip
    );
    
    res.json(newLeader);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update leader
router.put('/leaders/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { name, churchRef, categories, category, image, socialLink } = req.body;
    // Build clean categories array — this is the source of truth
    let cats = Array.isArray(categories) && categories.length > 0
      ? categories
      : (category ? [category] : []);

    // Use $set with explicit fields to avoid Mongoose enum/id conflicts
    const updatePayload = {
      $set: {
        name,
        churchRef: churchRef || null,
        categories: cats,
        category: cats[0] || null,   // keep legacy field in sync
        image: image || '',
        socialLink: socialLink || '',
      }
    };

    const leader = await CampLeader.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: false } // skip enum validation on legacy field
    );
    
    await logActivity(
      req.user.id,
      req.user.role,
      'Updated Organization Role',
      `Updated role details for ${leader.name} (${cats.join(', ')})`,
      req.ip
    );
    
    res.json(leader);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE leader
router.delete('/leaders/:id', auth, requireAdmin, async (req, res) => {
  try {
    const leader = await CampLeader.findByIdAndDelete(req.params.id);
    if (!leader) return res.status(404).json({ message: 'Leader not found' });
    
    await logActivity(
      req.user.id,
      req.user.role,
      'Deleted Organization Role',
      `Removed role: ${leader.name}`,
      req.ip
    );
    
    res.json({ message: 'Leader removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===============================
// GROUPS ROUTES
// ===============================

// GET all groups (Public access)
router.get('/groups', async (req, res) => {
  try {
    const groups = await CampGroup.find({}).sort({ name: 1 });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new group
router.post('/groups', auth, requireAdmin, async (req, res) => {
  try {
    const newGroup = new CampGroup(req.body);
    await newGroup.save();
    
    await logActivity(
      req.user.id,
      req.user.role,
      'Created Camp Group',
      `Created group: ${req.body.name}`,
      req.ip
    );
    
    res.json(newGroup);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update group
router.put('/groups/:id', auth, requireAdmin, async (req, res) => {
  try {
    const group = await CampGroup.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    await logActivity(
      req.user.id,
      req.user.role,
      'Updated Camp Group',
      `Updated structure of ${group.name}`,
      req.ip
    );
    
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE group
router.delete('/groups/:id', auth, requireAdmin, async (req, res) => {
  try {
    const group = await CampGroup.findByIdAndDelete(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    
    await logActivity(
      req.user.id,
      req.user.role,
      'Deleted Camp Group',
      `Removed group: ${group.name}`,
      req.ip
    );
    
    res.json({ message: 'Group removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===============================
// TRIBE SORTER SPECIAL ROUTES
// ===============================

// PUT bulk update scores and locks
router.put('/registrants/bulk-scores', auth, requireAdmin, async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, spirituality, build, lockedTribe }
    if (!Array.isArray(updates)) return res.status(400).json({ message: 'Updates must be an array.' });

    const bulkOps = updates.map(u => ({
      updateOne: {
        filter: { _id: u.id },
        update: { 
          $set: { 
            spirituality: u.spirituality, 
            build: u.build, 
            lockedTribe: u.lockedTribe 
          } 
        }
      }
    }));

    await Registrant.bulkWrite(bulkOps);

    await logActivity(
      req.user.id,
      req.user.role,
      'Bulk Graded Participants',
      `Updated scores/locks for ${updates.length} participants`,
      req.ip
    );

    res.json({ message: 'Scores updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST Apply Proposal to Live Tribes
router.post('/groups/apply-proposal', auth, requireAdmin, async (req, res) => {
  try {
    const { tribes } = req.body; // Array of { name, members }
    if (!Array.isArray(tribes)) return res.status(400).json({ message: 'Tribes must be an array.' });

    // 1. Delete all existing groups
    await CampGroup.deleteMany({});

    // 2. Create new groups from proposal
    const newGroups = tribes.map(t => new CampGroup({
      name: t.name,
      members: t.members,
      // Initialize other fields as empty strings/arrays as per baseline
      leader: '',
      assistantLeader: '',
      pointKeeper: '',
      flagBearer: '',
      facilitators: [],
      grabMasters: []
    }));

    await CampGroup.insertMany(newGroups);

    await logActivity(
      req.user.id,
      req.user.role,
      'Applied Tribe Proposal',
      `Re-organized camp into ${tribes.length} new tribes via sorter.`,
      req.ip
    );

    res.json({ message: 'Proposal applied successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===============================
// SHARED SORTER DRAFT (Persistence)
// ===============================

// GET current draft session
router.get('/sorter/draft', auth, requireAdmin, async (req, res) => {
  try {
    let draft = await SorterDraft.findOne({ sessionKey: 'shared-sorter-draft' });
    if (!draft) {
      // Create empty draft if none exists
      draft = new SorterDraft({ sessionKey: 'shared-sorter-draft' });
      await draft.save();
    }
    res.json(draft);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update draft session
router.put('/sorter/draft', auth, requireAdmin, async (req, res) => {
  try {
    const { activeTab, groupCount, tribeNames, currentProposal, localScores } = req.body;
    
    const draft = await SorterDraft.findOneAndUpdate(
      { sessionKey: 'shared-sorter-draft' },
      { 
        $set: { 
          activeTab, 
          groupCount, 
          tribeNames, 
          currentProposal, 
          localScores,
          lastUpdatedBy: req.user.id,
          updatedAt: new Date()
        } 
      },
      { new: true, upsert: true }
    );
    
    res.json(draft);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE (reset) draft session
router.delete('/sorter/draft', auth, requireAdmin, async (req, res) => {
  try {
    await SorterDraft.findOneAndDelete({ sessionKey: 'shared-sorter-draft' });
    res.json({ message: 'Draft cleared.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
