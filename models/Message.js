const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },

    messageType: {
      type: String,
      enum: [
        "text",
        "image",
        "file",
        "audio",
        "video",
      ],
      default: "text",
    },

    attachment: {
      url: {
        type: String,
        default: null,
      },

      publicId: {
        type: String,
        default: null,
      },

      fileName: {
        type: String,
        default: null,
      },

      fileType: {
        type: String,
        default: null,
      },
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
messageSchema.index({
  conversation: 1,
  createdAt: 1,
});

messageSchema.index({
  receiver: 1,
  isRead: 1,
});

messageSchema.index({
  sender: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Message", messageSchema);