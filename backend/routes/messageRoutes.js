const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send', protect, messageController.sendMessage);
router.get('/conversations', protect, messageController.getConversations);
router.get('/chat/:userId', protect, messageController.getChatHistory);
router.post('/chat/:userId/read', protect, messageController.markChatAsRead);

module.exports = router;
