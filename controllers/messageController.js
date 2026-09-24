const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");

const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

/*
|--------------------------------------------------------------------------
| Upload File to Cloudinary
|--------------------------------------------------------------------------
*/

const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.buffer) {
      return reject(new Error("Invalid file data."));
    }

    let resourceType = "raw";

    if (file.mimetype.startsWith("image/")) {
      resourceType = "image";
    } else if (file.mimetype.startsWith("video/")) {
      resourceType = "video";
    } else if (file.mimetype.startsWith("audio/")) {
      // Cloudinary handles audio files using the video resource type.
      resourceType = "video";
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "alumniconnect/messages",
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error("Cloudinary upload failed."));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      }
    );

    uploadStream.end(file.buffer);
  });
};

/*
|--------------------------------------------------------------------------
| Get Messages
|--------------------------------------------------------------------------
| GET /api/messages/:conversationId
|--------------------------------------------------------------------------
*/

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    /*
    |--------------------------------------------------------------------------
    | Validate Conversation ID
    |--------------------------------------------------------------------------
    */

    if (
      !conversationId ||
      !mongoose.Types.ObjectId.isValid(conversationId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid conversation ID is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Conversation Access
    |--------------------------------------------------------------------------
    */

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get Messages
    |--------------------------------------------------------------------------
    */

    const messages = await Message.find({
      conversation: conversationId,
    })
      .populate(
        "sender",
        "name profileImage role"
      )
      .populate(
        "receiver",
        "name profileImage role"
      )
      .sort({
        createdAt: 1,
      });

    /*
    |--------------------------------------------------------------------------
    | Success Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error(
      "Get messages error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get messages.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Unread Message Count
|--------------------------------------------------------------------------
| GET /api/messages/unread-count
|--------------------------------------------------------------------------
*/

const getUnreadMessageCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      data: {
        count,
      },
    });
  } catch (error) {
    console.error(
      "Get unread message count error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get unread message count.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Send Message
|--------------------------------------------------------------------------
| POST /api/messages/:conversationId
|--------------------------------------------------------------------------
|
| Supports:
| - Text
| - Image
| - Video
| - Audio
| - PDF
| - DOC
| - DOCX
|--------------------------------------------------------------------------
*/

const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;

    /*
    |--------------------------------------------------------------------------
    | Read Request Data
    |--------------------------------------------------------------------------
    */

    const text =
      typeof req.body?.text === "string"
        ? req.body.text.trim()
        : "";

    /*
    |--------------------------------------------------------------------------
    | Validate Conversation ID
    |--------------------------------------------------------------------------
    */

    if (
      !conversationId ||
      !mongoose.Types.ObjectId.isValid(conversationId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid conversation ID is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Text Length
    |--------------------------------------------------------------------------
    */

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message cannot exceed 5000 characters.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Conversation
    |--------------------------------------------------------------------------
    */

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Receiver
    |--------------------------------------------------------------------------
    */

    const receiverId = conversation.participants.find(
      (participantId) =>
        participantId.toString() !==
        req.user._id.toString()
    );

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "Receiver not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Determine Message Type
    |--------------------------------------------------------------------------
    */

    let messageType = "text";

    if (req.file) {
      if (req.file.mimetype.startsWith("image/")) {
        messageType = "image";
      } else if (
        req.file.mimetype.startsWith("video/")
      ) {
        messageType = "video";
      } else if (
        req.file.mimetype.startsWith("audio/")
      ) {
        messageType = "audio";
      } else {
        messageType = "file";
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Message Content
    |--------------------------------------------------------------------------
    */

    if (!req.file && !text) {
      return res.status(400).json({
        success: false,
        message:
          "Message text or media file is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prepare Attachment
    |--------------------------------------------------------------------------
    */

    let attachment = {
      url: null,
      publicId: null,
      fileName: null,
      fileType: null,
    };

    /*
    |--------------------------------------------------------------------------
    | Upload File
    |--------------------------------------------------------------------------
    */

    if (req.file) {
      const uploadResult =
        await uploadToCloudinary(req.file);

      attachment = {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Create Message
    |--------------------------------------------------------------------------
    */

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      receiver: receiverId,
      text,
      messageType,
      attachment,
      isRead: false,
    });

    /*
    |--------------------------------------------------------------------------
    | Update Conversation
    |--------------------------------------------------------------------------
    */

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;

    await conversation.save();

    /*
    |--------------------------------------------------------------------------
    | Populate Created Message
    |--------------------------------------------------------------------------
    */

    const populatedMessage =
      await Message.findById(message._id)
        .populate(
          "sender",
          "name profileImage role"
        )
        .populate(
          "receiver",
          "name profileImage role"
        );

    if (!populatedMessage) {
      return res.status(500).json({
        success: false,
        message:
          "Message was created but could not be retrieved.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Socket.IO Real-Time Message
    |--------------------------------------------------------------------------
    |
    | server.js must contain:
    |
    | app.set("io", io);
    |
    */

    const io = req.app.get("io");

    if (io) {
      const senderRoom =
        `user:${req.user._id.toString()}`;

      const receiverRoom =
        `user:${receiverId.toString()}`;

      /*
      |--------------------------------------------------------------------------
      | Send Message To Receiver
      |--------------------------------------------------------------------------
      */

      io.to(receiverRoom).emit(
        "new-message",
        populatedMessage
      );

      /*
      |--------------------------------------------------------------------------
      | Send Message To Sender
      |--------------------------------------------------------------------------
      |
      | Useful when the same account is open in:
      | - Another browser tab
      | - Another browser window
      | - Another device
      |
      */

      io.to(senderRoom).emit(
        "new-message",
        populatedMessage
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Success Response
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    console.error(
      "Send message error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to send message.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Mark Messages As Read
|--------------------------------------------------------------------------
| PUT /api/messages/:conversationId/read
|--------------------------------------------------------------------------
*/

const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    /*
    |--------------------------------------------------------------------------
    | Validate Conversation ID
    |--------------------------------------------------------------------------
    */

    if (
      !conversationId ||
      !mongoose.Types.ObjectId.isValid(conversationId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid conversation ID is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Conversation Access
    |--------------------------------------------------------------------------
    */

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Mark Messages As Read
    |--------------------------------------------------------------------------
    */

    const result = await Message.updateMany(
      {
        conversation: conversationId,
        receiver: req.user._id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Success Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      message: "Messages marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error(
      "Mark messages as read error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to mark messages as read.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  sendMessage,
  getMessages,
  getUnreadMessageCount,
  markMessagesAsRead,
};