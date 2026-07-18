const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Handle Multer upload errors gracefully in profile edits
const uploadProfileAndCover = (req, res, next) => {
  const fields = upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]);
  
  fields(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
};

router.get('/profile/:username', protect, userController.getUserProfile);
router.put('/edit', protect, uploadProfileAndCover, userController.editUserProfile);
router.get('/suggested', protect, userController.getSuggestedUsers);
router.get('/search', protect, userController.getSearch);
router.get('/notifications', protect, userController.getNotifications);
router.get('/notifications/unread-count', protect, userController.getUnreadNotificationsCount);

module.exports = router;
