const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
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
    enum: ['CREATE', 'UPDATE', 'DELETE', 'VERIFY', 'UNVERIFY', 'LOGIN', 'VISIT', 'BACKUP_EXPORT', 'BACKUP_IMPORT', 'CLAIM_MERCH', 'UNCLAIM_MERCH', 'MERCH_UPDATE']
  },
  entityType: {
    type: String,
    required: true,
    enum: ['Registrant', 'Expense', 'Solicitation', 'User', 'Settings', 'System', 'Visit']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

ActivityLogSchema.index({ entityType: 1 });
ActivityLogSchema.index({ action: 1 });
ActivityLogSchema.index({ userId: 1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
