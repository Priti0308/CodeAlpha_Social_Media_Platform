const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Handle Multer upload errors gracefully in story creations
const uploadStoryImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
};

router.post('/create', protect, uploadStoryImage, storyController.createStory);
router.get('/active', protect, storyController.getActiveStories);

module.exports = router;
