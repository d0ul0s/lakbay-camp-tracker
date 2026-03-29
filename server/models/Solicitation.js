const mongoose = require('mongoose');

const SolicitationSchema = new mongoose.Schema({
  sourceName: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  dateReceived: { type: Date, default: Date.now },
  paymentMethod: { type: String },
  notes: { type: String },
  verifiedByTreasurer: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

SolicitationSchema.index({ sourceName: 1 });
SolicitationSchema.index({ type: 1 });
SolicitationSchema.index({ dateReceived: -1 });
SolicitationSchema.index({ verifiedByTreasurer: 1 });
SolicitationSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Solicitation', SolicitationSchema);
