const mongoose = require('mongoose');

const nominationSchema = new mongoose.Schema({
  camperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Registrant', required: true },
  nominatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const awardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nominations: [nominationSchema],
  status: { 
    type: String, 
    enum: ['nominating', 'voting', 'closed'], 
    default: 'nominating' 
  },
  createdAt: { type: Date, default: Date.now }
});

// Compound index for performance
awardSchema.index({ status: 1 });

awardSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    if (ret.nominations) {
      ret.nominations = ret.nominations.map(n => {
        if (n._id) {
          n.id = n._id;
          delete n._id;
        }
        return n;
      });
    }
  }
});

module.exports = mongoose.model('Award', awardSchema);
