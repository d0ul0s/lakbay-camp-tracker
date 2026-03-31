const mongoose = require('mongoose');

const pointLogSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'CampGroup', required: true },
  type: { type: String, enum: ['merit', 'demerit'], required: true },
  points: { type: Number, required: true }, // Positive for merit, Negative for demerit
  reason: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  verified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

pointLogSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

module.exports = mongoose.model('PointLog', pointLogSchema);
