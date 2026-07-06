import Notification from "../models/Notification.model.js";

/**
 * Creates a notification in the database and emits it via socket.io to the recipient
 * @param {Object} app Express app instance to get the io object
 * @param {String|ObjectId} recipientId The user ID receiving the notification
 * @param {String} type The type of notification (e.g. 'assignment', 'announcement')
 * @param {String} message The notification text
 */
export const sendNotification = async (app, recipientId, type, message) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      message,
    });

    const io = app.get("io");
    if (io) {
      io.to(`user_${recipientId.toString()}`).emit("newNotification", notification);
    }
    
    return notification;
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};
