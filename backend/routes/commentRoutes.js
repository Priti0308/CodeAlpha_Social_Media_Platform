const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/:postId', protect, commentController.addComment);
router.delete('/:commentId', protect, commentController.deleteComment);
router.post('/:commentId/reply', protect, commentController.addReply);
router.delete('/:commentId/reply/:replyId', protect, commentController.deleteReply);

module.exports = router;
