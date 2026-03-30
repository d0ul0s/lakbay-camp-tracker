const mongoose = require('mongoose');

const campGroupSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Tribe 1"
  facilitators: { type: [String], default: [] },
  leader: { type: String, default: '' },
  assistantLeader: { type: String, default: '' },
  pointKeeper: { type: String, default: '' },
  flagBearer: { type: String, default: '' },
  grabMasters: { type: [String], default: [] },
  members: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

campGroupSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

module.exports = mongoose.model('CampGroup', campGroupSchema);
