const mongoose = require('mongoose');

const VALID_CATEGORIES = [
  'Camp Head', 'Registration', 'Food', 'Arts & Decorations',
  'Media', 'Music', 'Marshall', 'Runners', 'Game Masters',
  'Point Masters', 'Medic', 'Awards', 'Finance', 'Youth Leader'
];

const campLeaderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  churchRef: { type: String, default: null }, // Only for 'Youth Leader' category
  // Array of categories — a staff member can belong to multiple departments
  categories: {
    type: [String],
    enum: VALID_CATEGORIES,
    default: []
  },
  // Legacy single-category field kept for backward compatibility during migration
  category: {
    type: String,
    enum: [...VALID_CATEGORIES, null],
    default: null
  },
  roleTitle: { type: String, default: '' }, // e.g. "Head Coordinator", "Logistics"
  image: { type: String, default: '' },     // Direct URL link to photo (Option B)
  socialLink: { type: String, default: '' }, // Facebook, Instagram, Discord, etc.
  createdAt: { type: Date, default: Date.now }
});

// Virtual: always return the effective list of categories (supports old docs with only `category`)
campLeaderSchema.virtual('effectiveCategories').get(function () {
  if (this.categories && this.categories.length > 0) return this.categories;
  if (this.category) return [this.category];
  return [];
});

campLeaderSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    // Normalise: always expose `categories` array on the JSON output
    if (!ret.categories || ret.categories.length === 0) {
      ret.categories = ret.category ? [ret.category] : [];
    }
  }
});

module.exports = mongoose.model('CampLeader', campLeaderSchema);
module.exports.VALID_CATEGORIES = VALID_CATEGORIES;
