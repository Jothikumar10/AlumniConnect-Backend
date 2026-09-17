const Notification = require("../models/Notification");

const createNotification = async ({
  recipient,
  sender = null,
  type,
  title,
  message,
  post = null,
  job = null,
  application = null,
  connection = null,
  event = null,
}) => {
  try {
    // Do not create a notification for yourself
    if (
      recipient &&
      sender &&
      String(recipient) === String(sender)
    ) {
      return null;
    }

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      post,
      job,
      application,
      connection,
      event,
      isRead: false,
    });

    return notification;
  } catch (error) {
    console.error("Create notification error:", error);

    // Notification failure should not break the main action
    return null;
  }
};

module.exports = createNotification;