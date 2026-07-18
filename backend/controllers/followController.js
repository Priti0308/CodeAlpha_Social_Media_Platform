const User = require('../models/User');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');

// @desc    Toggle Follow/Unfollow User
// @route   POST /api/follow/:targetId
// @access  Private
exports.toggleFollowUser = async (req, res, next) => {
  const { targetId } = req.params;
  const user = req.user;

  try {
    if (targetId.toString() === user.id.toString()) {
      return res.status(400).json({ success: false, error: 'You cannot follow yourself.' });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Target user not found.' });
    }

    const isFollowing = user.following.includes(targetId);

    let following;
    if (isFollowing) {
      // Unfollow: Pull from arrays
      user.following = user.following.filter(id => id.toString() !== targetId.toString());
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== user.id.toString());
      
      await user.save();
      await targetUser.save();
      
      // Remove Follow document
      await Follow.deleteOne({ followerId: user.id, followingId: targetId });
      following = false;
    } else {
      // Follow: Push to arrays
      user.following.push(targetId);
      targetUser.followers.push(user.id);

      await user.save();
      await targetUser.save();

      // Create Follow document
      await Follow.create({ followerId: user.id, followingId: targetId });
      following = true;

      // Trigger Notification
      await Notification.create({
        receiverId: targetId,
        senderId: user.id,
        type: 'follow'
      });
    }

    res.json({
      success: true,
      following,
      followersCount: targetUser.followers.length,
      followingCount: targetUser.following.length
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get User Followers
// @route   GET /api/follow/:userId/followers
// @access  Private
exports.getUserFollowers = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).populate('followers', 'name username profileImage');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    res.json({
      success: true,
      followers: user.followers
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get User Following
// @route   GET /api/follow/:userId/following
// @access  Private
exports.getUserFollowing = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).populate('following', 'name username profileImage');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    res.json({
      success: true,
      following: user.following
    });
  } catch (err) {
    next(err);
  }
};
