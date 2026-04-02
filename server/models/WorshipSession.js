const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String },
  key: { type: String },
  lyricsUrl: { type: String },
  notes: { type: String },
  order: { type: Number, default: 0 }
});

const worshipSessionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  sessionDate: { type: Date },
  description: { type: String },
  songs: [songSchema],
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Virtual for ID
worshipSessionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

module.exports = mongoose.model('WorshipSession', worshipSessionSchema);
