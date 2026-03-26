const mongoose = require('mongoose');

const registrantSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  age: { type: Number, required: true },
  church: { type: String, required: true },
  sex: { type: String, enum: ['Male', 'Female'], required: true, default: 'Male' },
  ministry: { type: [String], default: [] },
  shirtSize: { type: String },
  feeType: { type: String },
  paymentStatus: { type: String },
  paymentMethod: { type: String, default: null },
  gcRef: { type: String, default: null },
  amountPaid: { type: Number, default: 0 },
  dateRegistered: { type: Date, default: Date.now },
  merchClaims: { 
    type: Object, 
    default: { tshirt: false, bag: false, notebook: false, pen: false } 
  },
  merchClaimDates: {
    type: Object,
    default: { tshirt: null, bag: null, notebook: null, pen: null }
  },
  verifiedByTreasurer: { type: Boolean, default: false },
  verifiedAt: { type: Date, default: null }
});

registrantSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

module.exports = mongoose.model('Registrant', registrantSchema);
