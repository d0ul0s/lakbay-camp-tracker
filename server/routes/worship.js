const express = require('express');
const router = express.Router();
const WorshipSession = require('../models/WorshipSession');
const logActivity = require('../utils/logger');
const { attachPermissions, requirePermission } = require('../middleware/permissions');
const auth = require('../middleware/auth');

// Public GET - No auth required for reading
router.get('/', async (req, res) => {
  try {
    const sessions = await WorshipSession.find({ isActive: true })
      .sort({ sessionDate: 1, order: 1 }); // Chronological order
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin CRUD - Authorized Only
// First attach permissions, then require them
router.use(auth, attachPermissions);

router.post('/', requirePermission('settings', 'edit'), async (req, res) => {
  const session = new WorshipSession(req.body);
  try {
    const newSession = await session.save();
    
    // Broadcast update
    req.io.emit('DATA_UPDATED', { 
      type: 'worship', 
      action: 'added', 
      user: req.user.role,
      userId: req.user.id,
      data: newSession
    });

    await logActivity(req, 'CREATE', 'WorshipSession', newSession._id, { title: newSession.title });
    
    res.status(201).json(newSession);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', requirePermission('settings', 'edit'), async (req, res) => {
  try {
    const session = await WorshipSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    const oldTitle = session.title;
    Object.assign(session, req.body, { updatedAt: Date.now() });
    const updatedSession = await session.save();

    // Broadcast update
    req.io.emit('DATA_UPDATED', { 
      type: 'worship', 
      action: 'updated', 
      user: req.user.role,
      userId: req.user.id,
      data: updatedSession
    });

    await logActivity(req, 'UPDATE', 'WorshipSession', updatedSession._id, { title: updatedSession.title }, { title: oldTitle }, updatedSession);

    res.json(updatedSession);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', requirePermission('settings', 'edit'), async (req, res) => {
  try {
    const deletedSession = await WorshipSession.findByIdAndDelete(req.params.id);
    if (!deletedSession) return res.status(404).json({ message: 'Session not found' });
    
    // Broadcast update
    req.io.emit('DATA_UPDATED', { 
      type: 'worship', 
      action: 'deleted', 
      user: req.user.role,
      userId: req.user.id,
      data: { _id: req.params.id }
    });

    await logActivity(req, 'DELETE', 'WorshipSession', deletedSession._id, { title: deletedSession.title });

    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
