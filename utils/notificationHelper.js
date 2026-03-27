const Notification = require("../models/Notification");

const createNotification = async ({
  recipientId,
  type,
  title,
  message,
  link = "",
  metadata = {},
}) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      link,
      metadata,
    });
    return notification;
  } catch (err) {
    console.error("Notification creation failed:", err.message);
    return null;
  }
};

module.exports = { createNotification };