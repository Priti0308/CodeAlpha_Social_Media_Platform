const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

// @desc    Add Comment
// @route   POST /api/comments/:postId
// @access  Private
exports.addComment = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const { postId } = req.params;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Comment body cannot be empty.' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    const commentDoc = await Comment.create({
      userId: req.user.id,
      postId: post._id,
      comment: comment.trim()
    });

    // Add comment to post's comments list
    post.comments.push(commentDoc._id);
    await post.save();

    // Trigger Notification if comment writer is not post author
    if (post.userId.toString() !== req.user.id.toString()) {
      await Notification.create({
        receiverId: post.userId,
        senderId: req.user.id,
        type: 'comment',
        postId: post._id
      });
    }

    // Populate user details for returning comment JSON
    const populatedComment = await commentDoc.populate('userId', 'username profileImage');

    res.status(201).json({
      success: true,
      comment: populatedComment
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete Comment
// @route   DELETE /api/comments/:commentId
// @access  Private
exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found.' });
    }

    const post = await Post.findById(comment.postId);

    // Restrict access: Only author of comment or author of post can delete it
    const isCommentAuthor = comment.userId.toString() === req.user.id.toString();
    const isPostAuthor = post && post.userId.toString() === req.user.id.toString();

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({ success: false, error: 'You are not authorized to delete this comment.' });
    }

    // Pull comment from post's comments list
    if (post) {
      post.comments = post.comments.filter(id => id.toString() !== comment._id.toString());
      await post.save();
    }

    // Delete comment
    await comment.deleteOne();

    res.json({
      success: true,
      message: 'Comment deleted successfully!'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add Reply to Comment
// @route   POST /api/comments/:commentId/reply
// @access  Private
exports.addReply = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const { commentId } = req.params;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Reply text cannot be empty.' });
    }

    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({ success: false, error: 'Comment not found.' });
    }

    const replyData = {
      userId: req.user.id,
      comment: comment.trim()
    };

    parentComment.replies.push(replyData);
    await parentComment.save();

    // Get the newly added reply (it's the last one in the array)
    const newReply = parentComment.replies[parentComment.replies.length - 1];
    
    // Populate user details for returning JSON
    const populatedComment = await Comment.findById(commentId)
      .populate({
        path: 'replies.userId',
        select: 'username profileImage'
      });

    // Find the populated reply by its ID
    const populatedReply = populatedComment.replies.id(newReply._id);

    res.status(201).json({
      success: true,
      reply: populatedReply
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete Reply from Comment
// @route   DELETE /api/comments/:commentId/reply/:replyId
// @access  Private
exports.deleteReply = async (req, res, next) => {
  try {
    const { commentId, replyId } = req.params;

    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({ success: false, error: 'Comment not found.' });
    }

    const reply = parentComment.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ success: false, error: 'Reply not found.' });
    }

    const post = await Post.findById(parentComment.postId);

    // Restrict access: Only author of reply, author of comment, or author of post can delete it
    const isReplyAuthor = reply.userId.toString() === req.user.id.toString();
    const isCommentAuthor = parentComment.userId.toString() === req.user.id.toString();
    const isPostAuthor = post && post.userId.toString() === req.user.id.toString();

    if (!isReplyAuthor && !isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({ success: false, error: 'You are not authorized to delete this reply.' });
    }

    // Remove the reply using Mongoose subdocument pull
    parentComment.replies.pull(replyId);
    await parentComment.save();

    res.json({
      success: true,
      message: 'Reply deleted successfully!'
    });
  } catch (err) {
    next(err);
  }
};
