const Story = require('../models/Story');
const { fileToBase64 } = require('../utils/fileHelper');

// @desc    Create Story
// @route   POST /api/stories/create
// @access  Private
exports.createStory = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload an image for your story.' });
    }

    const storyImagePath = fileToBase64(req.file);

    const story = await Story.create({
      userId: req.user.id,
      image: storyImagePath
    });

    const populatedStory = await Story.findById(story._id).populate('userId', 'username profileImage');

    res.status(201).json({
      success: true,
      message: 'Story added successfully!',
      story: populatedStory
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Active Stories from Self and Followed Users
// @route   GET /api/stories/active
// @access  Private
exports.getActiveStories = async (req, res, next) => {
  try {
    const followingIds = req.user.following || [];
    
    // Fetch all active stories in the last 24 hours (MongoDB handles auto-deletion, so any document present is active!)
    const activeStories = await Story.find({
      userId: { $in: [...followingIds, req.user.id] }
    })
    .populate('userId', 'username profileImage')
    .sort({ createdAt: 1 }); // Oldest first to play chronologically

    // Group stories by creator
    const grouped = {};
    activeStories.forEach(story => {
      const uid = story.userId._id.toString();
      if (!grouped[uid]) {
        grouped[uid] = {
          user: story.userId,
          stories: []
        };
      }
      grouped[uid].stories.push({
        _id: story._id,
        image: story.image,
        createdAt: story.createdAt
      });
    });

    res.json({
      success: true,
      stories: Object.values(grouped)
    });
  } catch (err) {
    next(err);
  }
};
