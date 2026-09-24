const Conversation = require("../models/Conversation");
const User = require("../models/User");

// GET /api/conversations
// Get all conversations of the logged-in user
const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate(
        "participants",
        "name profileImage role company jobRole"
      )
      .populate(
        "lastMessage",
        "sender receiver text messageType createdAt isRead"
      )
      .sort({
        lastMessageAt: -1,
        updatedAt: -1,
      });

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error(
      "Get conversations error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get conversations.",
    });
  }
};

// GET /api/conversations/:userId
// Get or create a conversation with another user
const getOrCreateConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    // Prevent messaging yourself
    if (
      currentUserId.toString() ===
      otherUserId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "You cannot create a conversation with yourself.",
      });
    }

    // Check whether the other user exists
    const otherUser = await User.findById(
      otherUserId
    ).select(
      "name profileImage role company jobRole isActive"
    );

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Find existing conversation
    let conversation = await Conversation.findOne({
      participants: {
        $all: [
          currentUserId,
          otherUserId,
        ],
      },
    })
      .populate(
        "participants",
        "name profileImage role company jobRole"
      )
      .populate(
        "lastMessage",
        "sender receiver text messageType createdAt isRead"
      );

    // Create conversation if it does not exist
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [
          currentUserId,
          otherUserId,
        ],
      });

      conversation = await Conversation.findById(
        conversation._id
      ).populate(
        "participants",
        "name profileImage role company jobRole"
      );
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error(
      "Get or create conversation error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get conversation.",
    });
  }
};

// GET /api/conversations/:conversationId/messages
// This will be connected to the message controller later.
// Keeping conversation validation here is useful.
const getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      participants: req.user._id,
    })
      .populate(
        "participants",
        "name profileImage role company jobRole"
      )
      .populate(
        "lastMessage",
        "sender receiver text messageType createdAt isRead"
      );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error(
      "Get conversation error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get conversation.",
    });
  }
};

module.exports = {
  getConversations,
  getOrCreateConversation,
  getConversationById,
};