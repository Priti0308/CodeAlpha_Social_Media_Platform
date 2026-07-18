const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  image: {
    type: String,
    required: [true, 'Please upload a story image']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Automatically delete document after 24 hours (24 * 3600 seconds)
  }
});

module.exports = mongoose.model('Story', StorySchema);
