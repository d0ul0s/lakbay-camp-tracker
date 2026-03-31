const mongoose = require('mongoose');

const tribeProposalSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  groupCount: { type: Number, required: true },
  distribution: { 
    type: [{
      name: String,
      members: [String]
    }],
    required: true
  },
  metrics: {
    type: Object, // Stores avg spirituality, build, etc. per tribe
    default: {}
  },
  createdAt: { type: Date, default: Date.now }
});

tribeProposalSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

module.exports = mongoose.model('TribeProposal', tribeProposalSchema);
