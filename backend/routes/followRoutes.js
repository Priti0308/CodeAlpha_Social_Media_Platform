const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const { protect } = require('../middleware/authMiddleware');

router.post('/:targetId', protect, followController.toggleFollowUser);
router.get('/:userId/followers', protect, followController.getUserFollowers);
router.get('/:userId/following', protect, followController.getUserFollowing);

module.exports = router;
