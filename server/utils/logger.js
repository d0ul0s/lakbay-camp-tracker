const ActivityLog = require('../models/ActivityLog');

/**
 * Logs an activity to the database.
 * @param {Object} req - The Express request object containing req.user
 * @param {String} action - CREATE | UPDATE | DELETE | VERIFY | UNVERIFY | LOGIN | BACKUP_EXPORT | BACKUP_IMPORT
 * @param {String} entityType - Registrant | Expense | Solicitation | User | Settings | System
 * @param {ObjectId} entityId - The ID of the document being modified
 * @param {Object} details - Optional details about the change
 */
const logActivity = async (req, action, entityType, entityId = null, details = null) => {
  try {
    if (!req.user || !req.user.id) return;

    await ActivityLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userChurch: req.user.church,
      action,
      entityType,
      entityId,
      details
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

module.exports = logActivity;
