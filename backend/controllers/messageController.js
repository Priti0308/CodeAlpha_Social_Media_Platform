const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Send a direct message
// @route   POST /api/messages/send
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Recipient and content are required.' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, error: 'Recipient user not found.' });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      content: content.trim()
    });

    res.status(201).json({
      success: true,
      message
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get conversation list
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch all messages involving the current user
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    })
    .populate('senderId', 'username profileImage name')
    .populate('receiverId', 'username profileImage name')
    .sort({ createdAt: -1 });

    const conversationsMap = {};

    messages.forEach(msg => {
      // Find the opposite participant
      const otherUser = msg.senderId._id.toString() === userId.toString() ? msg.receiverId : msg.senderId;
      if (!otherUser) return;
      
      const otherUserIdStr = otherUser._id.toString();

      if (!conversationsMap[otherUserIdStr]) {
        conversationsMap[otherUserIdStr] = {
          user: {
            _id: otherUser._id,
            username: otherUser.username,
            name: otherUser.name || otherUser.username,
            profileImage: otherUser.profileImage
          },
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: 0
        };
      }

      // Count unread incoming messages from this user to us
      if (msg.receiverId._id.toString() === userId.toString() && !msg.isRead) {
        conversationsMap[otherUserIdStr].unreadCount++;
      }
    });

    // Return threads sorted by the latest message time
    const conversations = Object.values(conversationsMap).sort(
      (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
    );

    res.json({
      success: true,
      conversations
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get chat message log history
// @route   GET /api/messages/chat/:userId
// @access  Private
exports.getChatHistory = async (req, res, next) => {
  try {
    const selfId = req.user.id;
    const otherId = req.params.userId;

    const chat = await Message.find({
      $or: [
        { senderId: selfId, receiverId: otherId },
        { senderId: otherId, receiverId: selfId }
      ]
    })
    .sort({ createdAt: 1 });

    res.json({
      success: true,
      chat
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Mark incoming chat messages as read
// @route   POST /api/messages/chat/:userId/read
// @access  Private
exports.markChatAsRead = async (req, res, next) => {
  try {
    const selfId = req.user.id;
    const otherId = req.params.userId;

    await Message.updateMany(
      { senderId: otherId, receiverId: selfId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({
      success: true,
      message: 'Chat marked as read.'
    });
  } catch (err) {
    next(err);
  }
};
