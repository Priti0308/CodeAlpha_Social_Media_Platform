const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Handle Multer upload errors gracefully in post creations
const uploadPostImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
};

router.post('/create', protect, uploadPostImage, postController.createPost);
router.get('/timeline', protect, postController.getTimelinePosts);
router.get('/:id', protect, postController.getPostDetail);
router.delete('/:id', protect, postController.deletePost);
router.post('/:id/like', protect, postController.toggleLikePost);

module.exports = router;
