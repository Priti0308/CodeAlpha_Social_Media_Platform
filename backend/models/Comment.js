const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comment: {
    type: String,
    required: [true, 'Reply text cannot be empty'],
    trim: true,
    maxlength: [1000, 'Reply cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

const CommentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  comment: {
    type: String,
    required: [true, 'Comment text cannot be empty'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  replies: [ReplySchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Comment', CommentSchema);
