const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // User who receives the notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // User who performed the action
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Type of notification
    type: {
      type: String,
      enum: [
        // Follow notifications
        "follow",
        "follower",
        "follow_request",

        // Post notifications
        "post",
        "new_post",

        // Post interactions
        "like",
        "comment",
        "comment_like",

        // Connection notifications
        "connection_request",
        "connection_accepted",

        // Job notifications
        "job",
        "application",

        // Mentorship
        "mentorship",

        // Event
        "event",

        // General notifications
        "announcement",
        "message",
        "system",
      ],
      required: true,
    },

    // Notification title
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    // Notification message
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // Related post
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },

    // Related job
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },

    // Related application
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },

    // Related connection
    connection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Related event
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },

    // Whether notification has been read
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

// Get latest notifications for a user
notificationSchema.index({
  recipient: 1,
  createdAt: -1,
});

// Get unread notifications for a user
notificationSchema.index({
  recipient: 1,
  isRead: 1,
});

// Get notifications related to a post
notificationSchema.index({
  post: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);