const ActivityLog = require('../models/ActivityLog');

function getChanges(original, updated) {
  if (!original || !updated) return null;
  const changes = [];
  
  const o = typeof original.toObject === 'function' ? original.toObject() : original;
  const u = typeof updated.toObject === 'function' ? updated.toObject() : updated;

  for (const key in u) {
    if (['_id', '__v', 'updatedAt', 'createdAt', 'createdBy'].includes(key)) continue;
    
    let oldVal = o[key];
    let newVal = u[key];
    
    let oldStr = typeof oldVal === 'object' && oldVal !== null ? JSON.stringify(oldVal) : String(oldVal);
    let newStr = typeof newVal === 'object' && newVal !== null ? JSON.stringify(newVal) : String(newVal);
    
    if (oldVal === undefined || oldVal === null) oldStr = '';
    if (newVal === undefined || newVal === null) newStr = '';

    if (oldStr !== newStr) {
       if (typeof newVal !== 'object' || newVal === null) {
           changes.push(`${key}: '${oldStr}' -> '${newStr}'`);
       } else {
           changes.push(`${key}: changed`);
       }
    }
  }
  return changes.length > 0 ? changes : null;
}

/**
 * Logs an activity to the database.
 */
const logActivity = async (req, action, entityType, entityId = null, details = null, oldDoc = null, newDoc = null) => {
  try {
    if (!req.user || !req.user.id) return;

    let finalDetails = details ? { ...details } : {};
    if (action === 'UPDATE' && oldDoc && newDoc) {
      const changes = getChanges(oldDoc, newDoc);
      if (changes) {
        finalDetails.changes = changes;
      }
    }

    // Grouping Logic for Merch
    const merchActions = ['CLAIM_MERCH', 'UNCLAIM_MERCH', 'MERCH_UPDATE'];
    if (merchActions.includes(action) && entityType === 'Registrant' && entityId) {
      const sixtySecondsAgo = new Date(Date.now() - 60000);
      const existingLog = await ActivityLog.findOne({
        userId: req.user.id,
        entityType: 'Registrant',
        entityId: entityId,
        action: { $in: merchActions },
        timestamp: { $gte: sixtySecondsAgo }
      }).sort({ timestamp: -1 });

      if (existingLog) {
        // Merge into existing log
        let items = existingLog.details?.items || {};
        const newItem = details?.item;
        const newValue = action === 'CLAIM_MERCH';
        
        if (newItem) {
          items[newItem] = newValue;
          
          await ActivityLog.findByIdAndUpdate(existingLog._id, {
            action: 'MERCH_UPDATE',
            details: { ...existingLog.details, items },
            timestamp: new Date() // Extend the window
          });
          return;
        }
      }
      
      // If found but no specific item, or not found, fall through to create
      if (action !== 'MERCH_UPDATE') {
        finalDetails = { 
          name: details?.name, 
          items: { [details?.item]: action === 'CLAIM_MERCH' } 
        };
      }
    }

    await ActivityLog.create({
      userId: req.user.id,
      userRole: req.user.role,
      userChurch: req.user.church,
      action,
      entityType,
      entityId,
      details: Object.keys(finalDetails).length > 0 ? finalDetails : null
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

module.exports = logActivity;
