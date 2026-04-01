const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const logActivity = require('../utils/logger');
const { attachPermissions, requirePermission } = require('../middleware/permissions');
const auth = require('../middleware/auth');

// Public GET - No auth required for reading
router.get('/', async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ priority: -1, createdAt: -1 }); // Priority first, then newest
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Attachment of permissions to req.user for use in routes
// Must run AFTER auth to populate req.user
router.use(auth, attachPermissions);

// Admin CRUD - Authorized Only
router.post('/', requirePermission('settings', 'edit'), async (req, res) => {
  const announcement = new Announcement({ 
    ...req.body, 
    createdBy: req.user ? req.user.id : null 
  });
  try {
    const newAnnouncement = await announcement.save();
    
    // Broadcast update immediately to all connected clients
    req.io.emit('DATA_UPDATED', { 
      type: 'announcements', 
      action: 'added', 
      user: req.user.role,
      userId: req.user.id,
      data: newAnnouncement
    });

    await logActivity(req, 'CREATE', 'Announcement', newAnnouncement._id, { title: newAnnouncement.title });
    
    res.status(201).json(newAnnouncement);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', requirePermission('settings', 'edit'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    
    const oldTitle = announcement.title;
    Object.assign(announcement, req.body, { updatedAt: Date.now() });
    const updatedAnnouncement = await announcement.save();

    // Broadcast update immediately
    req.io.emit('DATA_UPDATED', { 
      type: 'announcements', 
      action: 'updated', 
      user: req.user.role,
      userId: req.user.id,
      data: updatedAnnouncement
    });

    await logActivity(req, 'UPDATE', 'Announcement', updatedAnnouncement._id, { title: updatedAnnouncement.title }, { title: oldTitle }, updatedAnnouncement);

    res.json(updatedAnnouncement);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', requirePermission('settings', 'edit'), async (req, res) => {
  try {
    const deletedAnnouncement = await Announcement.findByIdAndDelete(req.params.id);
    if (!deletedAnnouncement) return res.status(404).json({ message: 'Announcement not found' });
    
    // Broadcast update immediately
    req.io.emit('DATA_UPDATED', { 
      type: 'announcements', 
      action: 'deleted', 
      user: req.user.role,
      userId: req.user.id,
      data: { _id: req.params.id }
    });

    await logActivity(req, 'DELETE', 'Announcement', deletedAnnouncement._id, { title: deletedAnnouncement.title });

    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
