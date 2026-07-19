const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { fileToBase64 } = require('../utils/fileHelper');

// @desc    Get User Profile
// @route   GET /api/users/profile/:username
// @access  Private
exports.getUserProfile = async (req, res, next) => {
  try {
    const { username } = req.params;

    const profileUser = await User.findOne({ username: username.toLowerCase().trim() })
      .populate('followers', 'name username profileImage')
      .populate('following', 'name username profileImage');

    if (!profileUser) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // Retrieve user's posts
    const posts = await Post.find({ userId: profileUser._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      user: {
        _id: profileUser._id,
        name: profileUser.name,
        username: profileUser.username,
        email: profileUser.email,
        profileImage: profileUser.profileImage,
        coverImage: profileUser.coverImage,
        bio: profileUser.bio,
        followersCount: profileUser.followers.length,
        followingCount: profileUser.following.length,
        followers: profileUser.followers,
        following: profileUser.following,
        isFollowing: profileUser.followers.some(f => f._id.toString() === req.user._id.toString()),
        postsCount: posts.length,
        posts
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Edit User Profile
// @route   PUT /api/users/edit
// @access  Private
exports.editUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const { name, username, email, bio } = req.body;

    if (username && username.toLowerCase().trim() !== user.username) {
      const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Username is already taken.' });
      }
      user.username = username.toLowerCase().trim();
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail) {
        return res.status(400).json({ success: false, error: 'Email is already registered.' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (name) user.name = name.trim();
    if (bio !== undefined) user.bio = bio.trim();

    if (req.files) {
      if (req.files.profileImage && req.files.profileImage[0]) {
        user.profileImage = fileToBase64(req.files.profileImage[0]);
      }
      if (req.files.coverImage && req.files.coverImage[0]) {
        user.coverImage = fileToBase64(req.files.coverImage[0]);
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        coverImage: user.coverImage,
        bio: user.bio
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Suggested Users
// @route   GET /api/users/suggested
// @access  Private
exports.getSuggestedUsers = async (req, res, next) => {
  try {
    // Users the current user is not following yet (exclude self and currently followed users)
    const suggested = await User.find({
      _id: { $nin: [...req.user.following, req.user.id] }
    })
    .limit(5)
    .select('name username profileImage');

    res.json({
      success: true,
      suggested
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Live Search users and posts
// @route   GET /api/users/search
// @access  Private
exports.getSearch = async (req, res, next) => {
  const query = (req.query.q || '').trim();

  try {
    if (!query) {
      return res.json({ success: true, users: [], posts: [] });
    }

    // Search users matching username/name
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    })
    .select('name username profileImage')
    .limit(10);

    // Search posts matching caption
    const posts = await Post.find({
      caption: { $regex: query, $options: 'i' }
    })
    .populate('userId', 'username profileImage')
    .limit(10);

    res.json({
      success: true,
      users,
      posts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get User Notifications
// @route   GET /api/users/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ receiverId: req.user.id })
      .populate('senderId', 'username profileImage')
      .populate('postId', 'image')
      .sort({ createdAt: -1 });

    // Mark unread notifications as read
    await Notification.updateMany(
      { receiverId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({
      success: true,
      notifications
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Unread Notifications Count
// @route   GET /api/users/notifications/unread-count
// @access  Private
exports.getUnreadNotificationsCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ receiverId: req.user.id, isRead: false });
    res.json({
      success: true,
      unreadCount: count
    });
  } catch (err) {
    next(err);
  }
};
