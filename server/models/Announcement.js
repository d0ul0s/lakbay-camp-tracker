const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['General', 'Alert', 'Reminder', 'Schedule'], 
    default: 'General' 
  },
  priority: { type: Boolean, default: false },
  targetDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});

announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ priority: -1 });
announcementSchema.index({ type: 1 });

announcementSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
  }
});

module.exports = mongoose.model('Announcement', announcementSchema);
