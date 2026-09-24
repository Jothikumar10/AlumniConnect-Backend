const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
  A conversation must contain exactly two users.
*/
conversationSchema.path("participants").validate(
  function (participants) {
    return participants.length === 2;
  },
  "A conversation must have exactly two participants."
);

/*
  Prevent the same user from being added twice
  to the same conversation.
*/
conversationSchema.path("participants").validate(
  function (participants) {
    if (participants.length !== 2) {
      return true;
    }

    return (
      participants[0].toString() !==
      participants[1].toString()
    );
  },
  "Conversation participants must be different users."
);

/*
  Helps find conversations for a logged-in user.
*/
conversationSchema.index({
  participants: 1,
});

/*
  Helps sort conversations by latest activity.
*/
conversationSchema.index({
  lastMessageAt: -1,
});

module.exports = mongoose.model(
  "Conversation",
  conversationSchema
);