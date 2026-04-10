const Notification = require("../models/Notification");

const getIO = () => {
  try {
    return require("../socket").getIO();
  } catch {
    return null; 
  }
};


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

  
    try {
      const io = getIO();
      if (io) {
        io.to(`user:${recipientId.toString()}`).emit("notification:new", {
          _id:     notification._id,
          type:    notification.type,
          title:   notification.title,
          message: notification.message,
          link:    notification.link,
          createdAt: notification.createdAt,
        });
      }
    } catch (socketErr) {
      console.warn("Socket emit for notification failed:", socketErr.message);
    }

    return notification;
  } catch (err) {
    console.error("Notification creation failed:", err.message);
    return null;
  }
};

module.exports = { createNotification };