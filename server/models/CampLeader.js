const mongoose = require('mongoose');

const campLeaderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  churchRef: { type: String, default: null }, // Only for 'Youth Leader' category
  category: { 
    type: String, 
    enum: [
      'Camp Head', 'Registration', 'Food', 'Arts & Decorations', 
      'Media', 'Music', 'Marshall', 'Runners', 'Game Masters', 
      'Point Masters', 'Medic', 'Awards', 'Finance', 'Youth Leader'
    ], 
    required: true 
  },
  roleTitle: { type: String, default: '' }, // e.g. "Head Coordinator", "Logistics"
  image: { type: String, default: '' }, // Direct URL link to photo (Option B)
  createdAt: { type: Date, default: Date.now }
});

campLeaderSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

module.exports = mongoose.model('CampLeader', campLeaderSchema);
