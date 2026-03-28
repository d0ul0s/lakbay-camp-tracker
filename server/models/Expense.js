const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  paidBy: { type: String },
  method: { type: String },
  verifiedByTreasurer: { type: Boolean, default: false },
  verifiedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});

expenseSchema.index({ category: 1 });
expenseSchema.index({ date: -1 }); // Index for descending sorting

expenseSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

module.exports = mongoose.model('Expense', expenseSchema);
