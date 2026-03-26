const mongoose = require('mongoose');

const SolicitationSchema = new mongoose.Schema({
  sourceName: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  dateReceived: { type: Date, default: Date.now },
  paymentMethod: { type: String },
  notes: { type: String },
  verifiedByTreasurer: { type: Boolean, default: false },
  verifiedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Solicitation', SolicitationSchema);
