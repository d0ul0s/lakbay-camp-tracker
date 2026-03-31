const mongoose = require('mongoose');

const sorterDraftSchema = new mongoose.Schema({
  // Unique identifier for the shared draft (only one per camp)
  sessionKey: { type: String, default: 'shared-sorter-draft', unique: true },
  
  activeTab: { type: String, default: 'grading' },
  groupCount: { type: Number, default: 10 },
  
  // Custom names for tribes (e.g. { "1": "Iron Tribe", "2": "Gold Tribe" })
  tribeNames: { 
    type: Map, 
    of: String,
    default: {}
  },
  
  // The current active recommendation being viewed
  currentProposal: {
    type: Object,
    default: null
  },
  
  // Local grading scores and manual tribe locks (registrantId -> { spirituality, build, lockedTribe })
  localScores: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  lastUpdatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

sorterDraftSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

module.exports = mongoose.model('SorterDraft', sorterDraftSchema);
