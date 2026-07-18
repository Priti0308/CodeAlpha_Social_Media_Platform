const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middleware/uploadMiddleware');

// Handle Multer upload errors gracefully
const uploadAvatar = (req, res, next) => {
  upload.single('profileImage')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
};

router.post('/register', uploadAvatar, authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
