const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { fileToBase64 } = require('../utils/fileHelper');

// @desc    Create Post
// @route   POST /api/posts/create
// @access  Private
exports.createPost = async (req, res, next) => {
  try {
    const { caption, isReel } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a media file to share.' });
    }

    const postImagePath = fileToBase64(req.file);

    const post = await Post.create({
      userId: req.user.id,
      image: postImagePath,
      caption: caption ? caption.trim() : '',
      isReel: isReel === 'true' || isReel === true
    });

    const populatedPost = await Post.findById(post._id).populate('userId', 'username profileImage');

    res.status(201).json({
      success: true,
      message: 'Post created successfully!',
      post: populatedPost
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete Post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    // Check ownership
    if (post.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, error: 'You are not authorized to delete this post.' });
    }

    // Delete post comments
    await Comment.deleteMany({ postId: post._id });

    // Delete notifications associated with this post
    await Notification.deleteMany({ postId: post._id });

    // Delete the Post
    await post.deleteOne();

    res.json({
      success: true,
      message: 'Post deleted successfully!'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Single Post Detail
// @route   GET /api/posts/:id
// @access  Private
exports.getPostDetail = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('userId', 'username profileImage')
      .populate('likes', 'username profileImage name')
      .populate({
        path: 'comments',
        populate: [
          {
            path: 'userId',
            select: 'username profileImage'
          },
          {
            path: 'replies.userId',
            select: 'username profileImage'
          }
        ],
        options: { sort: { createdAt: -1 } }
      });

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    res.json({
      success: true,
      post
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Timeline Posts (Home Feed)
// @route   GET /api/posts/timeline
// @access  Private
exports.getTimelinePosts = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const skip = (page - 1) * limit;

  try {
    const followingIds = req.user.following || [];

    // Find posts from followed users + own posts
    let posts = await Post.find({
      $or: [
        { userId: { $in: followingIds } },
        { userId: req.user.id }
      ]
    })
    .populate('userId', 'username profileImage')
    .populate('likes', 'username profileImage')
    .populate({
      path: 'comments',
      populate: [
        {
          path: 'userId',
          select: 'username profileImage'
        },
        {
          path: 'replies.userId',
          select: 'username profileImage'
        }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Fallback: If page 1 returns empty feed, fetch general global recent posts
    if (posts.length === 0 && page === 1) {
      posts = await Post.find()
        .populate('userId', 'username profileImage')
        .populate('likes', 'username profileImage')
        .populate({
          path: 'comments',
          populate: [
            {
              path: 'userId',
              select: 'username profileImage'
            },
            {
              path: 'replies.userId',
              select: 'username profileImage'
            }
          ]
        })
        .sort({ createdAt: -1 })
        .limit(limit);
    }

    res.json({
      success: true,
      page,
      posts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle Like Post
// @route   POST /api/posts/:id/like
// @access  Private
exports.toggleLikePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found.' });
    }

    const userId = req.user.id;
    const isLiked = post.likes.includes(userId);

    let liked;
    if (isLiked) {
      // Unlike post
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
      liked = false;
      await post.save();
    } else {
      // Like post
      post.likes.push(userId);
      liked = true;
      await post.save();

      // Create Notification if the liker is not the post owner
      if (post.userId.toString() !== userId.toString()) {
        await Notification.create({
          receiverId: post.userId,
          senderId: userId,
          type: 'like',
          postId: post._id
        });
      }
    }

    res.json({
      success: true,
      liked,
      likesCount: post.likes.length
    });
  } catch (err) {
    next(err);
  }
};
