const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userRole: {
    type: String,
    required: true
  },
  userChurch: {
    type: String
  },
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'VERIFY', 'UNVERIFY', 'LOGIN', 'BACKUP_EXPORT', 'BACKUP_IMPORT']
  },
  entityType: {
    type: String,
    required: true,
    enum: ['Registrant', 'Expense', 'Solicitation', 'User', 'Settings', 'System']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
