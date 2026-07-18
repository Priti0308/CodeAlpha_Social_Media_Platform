const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['like', 'comment', 'follow'],
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

module.exports = mongoose.model('Notification', NotificationSchema);
