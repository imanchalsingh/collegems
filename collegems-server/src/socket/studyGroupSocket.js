import ChatMessage from "../models/ChatMessage.model.js";
import StudyGroup from "../models/StudyGroup.model.js";
import Workspace from "../models/Workspace.model.js";
import Notification from "../models/Notification.model.js";
import * as Y from "yjs";

const activeDocuments = new Map();
const messageRateLimits = new Map();
const MAX_MESSAGES_PER_MINUTE = 10;
const MAX_MESSAGE_LENGTH = 1000;
const DOCUMENT_SAVE_DELAY = 5000;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

const getDocument = async (groupId) => {
  if (activeDocuments.has(groupId)) {
    return activeDocuments.get(groupId).ydoc;
  }
  
  const ydoc = new Y.Doc();
  try {
    const workspace = await Workspace.findOne({ groupId });
    if (workspace && workspace.documentState) {
      Y.applyUpdate(ydoc, workspace.documentState);
    }
  } catch (error) {
    console.error(`Error loading workspace for group ${groupId}:`, error);
  }
  
  activeDocuments.set(groupId, { ydoc, timeoutId: null });
  return ydoc;
};

const saveDocument = async (groupId, ydoc) => {
  try {
    const documentState = Buffer.from(Y.encodeStateAsUpdate(ydoc));
    if (documentState.length > MAX_DOCUMENT_SIZE) {
      console.warn(`Document size exceeded for group ${groupId}: ${documentState.length} bytes`);
      return;
    }
    await Workspace.findOneAndUpdate(
      { groupId },
      { groupId, documentState },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error(`Error saving workspace for group ${groupId}:`, error);
  }
};

const debounceSave = (groupId, ydoc) => {
  const docInfo = activeDocuments.get(groupId);
  if (docInfo) {
    if (docInfo.timeoutId) clearTimeout(docInfo.timeoutId);
    docInfo.timeoutId = setTimeout(() => {
      saveDocument(groupId, ydoc);
    }, DOCUMENT_SAVE_DELAY);
  }
};

const cleanupInactiveDocuments = () => {
  const now = Date.now();
  for (const [groupId, docInfo] of activeDocuments.entries()) {
    if (docInfo.lastUsed && now - docInfo.lastUsed > 30 * 60 * 1000) {
      activeDocuments.delete(groupId);
      console.log(`Cleaned up inactive document for group ${groupId}`);
    }
  }
};

setInterval(cleanupInactiveDocuments, 5 * 60 * 1000);

const validateGroupId = (groupId) => {
  return groupId && typeof groupId === 'string' && groupId.trim().length > 0;
};

const validateMessageContent = (content) => {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH;
};

const checkRateLimit = (userId) => {
  const now = Date.now();
  const userLimit = messageRateLimits.get(userId) || { count: 0, resetTime: now + 60000 };
  
  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + 60000;
  }
  
  userLimit.count++;
  messageRateLimits.set(userId, userLimit);
  
  return userLimit.count <= MAX_MESSAGES_PER_MINUTE;
};

const emitError = (socket, message) => {
  socket.emit("error", { 
    success: false,
    message: message || "An error occurred",
    timestamp: new Date().toISOString()
  });
};

export const initializeStudyGroupSockets = (io) => {
  io.on("connection", (socket) => {
    const userId = socket.user?.id || socket.user?._id;
    if (!userId) {
      emitError(socket, "Authentication required");
      return;
    }

    socket.on("join-group", async (groupId) => {
      try {
        if (!validateGroupId(groupId)) {
          emitError(socket, "Invalid group ID");
          return;
        }

        const group = await StudyGroup.findById(groupId);
        if (!group) {
          emitError(socket, "Group not found");
          return;
        }

        if (!group.members.includes(userId)) {
          emitError(socket, "You are not a member of this group");
          return;
        }

        socket.join(`group_${groupId}`);
        socket.to(`group_${groupId}`).emit("user-joined", { userId, timestamp: new Date().toISOString() });
        
        const socketsInRoom = await io.in(`group_${groupId}`).fetchSockets();
        const activeUserIds = [...new Set(socketsInRoom.map(s => s.user?.id || s.user?._id).filter(id => id))];
        socket.emit("active-users", activeUserIds);

        const ydoc = await getDocument(groupId);
        const stateUpdate = Y.encodeStateAsUpdate(ydoc);
        socket.emit("sync-initial-state", Array.from(stateUpdate));
        
        console.log(`User ${userId} joined group ${groupId}`);
      } catch (error) {
        console.error("Error joining group socket:", error);
        emitError(socket, "Failed to join group");
      }
    });

    socket.on("leave-group", (groupId) => {
      try {
        if (!validateGroupId(groupId)) {
          emitError(socket, "Invalid group ID");
          return;
        }

        socket.leave(`group_${groupId}`);
        socket.to(`group_${groupId}`).emit("user-left", { userId, timestamp: new Date().toISOString() });
        console.log(`User ${userId} left group ${groupId}`);
      } catch (error) {
        console.error("Error leaving group:", error);
        emitError(socket, "Failed to leave group");
      }
    });

    socket.on("send-message", async (data) => {
      try {
        const { groupId, content } = data;

        if (!validateGroupId(groupId)) {
          emitError(socket, "Invalid group ID");
          return;
        }

        if (!validateMessageContent(content)) {
          emitError(socket, `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`);
          return;
        }

        if (!checkRateLimit(userId)) {
          emitError(socket, "Rate limit exceeded. Please wait before sending more messages");
          return;
        }

        const group = await StudyGroup.findById(groupId);
        if (!group || !group.members.includes(userId)) {
          emitError(socket, "You are not a member of this group");
          return;
        }

        const message = new ChatMessage({
          groupId,
          senderId: userId,
          content: content.trim(),
        });
        await message.save();
        
        const populatedMessage = await message.populate("senderId", "name email");
        
        io.to(`group_${groupId}`).emit("receive-message", populatedMessage);

        if (group.members) {
          const notificationPromises = [];
          group.members.forEach(memberId => {
            if (memberId.toString() !== userId.toString()) {
              const notification = new Notification({
                recipient: memberId,
                type: "study_group",
                message: `New message in ${group.name} from ${populatedMessage.senderId.name}`,
              });
              notificationPromises.push(
                notification.save().then(savedDoc => {
                  io.to(`user_${memberId}`).emit("newNotification", savedDoc);
                })
              );
            }
          });
          await Promise.all(notificationPromises);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        emitError(socket, "Failed to send message");
      }
    });

    socket.on("typing", (data) => {
      try {
        const { groupId, userName } = data;
        if (!validateGroupId(groupId)) return;
        socket.to(`group_${groupId}`).emit("typing", { userId, userName, timestamp: new Date().toISOString() });
      } catch (error) {
        console.error("Error handling typing:", error);
      }
    });

    socket.on("stop-typing", (data) => {
      try {
        const { groupId, userName } = data;
        if (!validateGroupId(groupId)) return;
        socket.to(`group_${groupId}`).emit("stop-typing", { userId, userName, timestamp: new Date().toISOString() });
      } catch (error) {
        console.error("Error handling stop-typing:", error);
      }
    });

    socket.on("sync-update", async (data) => {
      try {
        const { groupId, update } = data;

        if (!validateGroupId(groupId)) {
          emitError(socket, "Invalid group ID");
          return;
        }

        if (!update || !Array.isArray(update) || update.length === 0) {
          emitError(socket, "Invalid update data");
          return;
        }

        socket.to(`group_${groupId}`).emit("sync-update", update);
        
        const ydoc = await getDocument(groupId);
        const updateUint8 = new Uint8Array(update);
        Y.applyUpdate(ydoc, updateUint8);
        debounceSave(groupId, ydoc);
      } catch (error) {
        console.error("Error applying sync update on server:", error);
        emitError(socket, "Failed to sync document");
      }
    });

    socket.on("awareness-update", (data) => {
      try {
        const { groupId, update } = data;
        if (!validateGroupId(groupId)) return;
        if (!update || typeof update !== 'object') return;
        socket.to(`group_${groupId}`).emit("awareness-update", update);
      } catch (error) {
        console.error("Error handling awareness update:", error);
      }
    });

    socket.on("disconnecting", () => {
      try {
        for (const room of socket.rooms) {
          if (room.startsWith("group_")) {
            socket.to(room).emit("user-left", { 
              userId, 
              timestamp: new Date().toISOString() 
            });
          }
        }
      } catch (error) {
        console.error("Error handling disconnecting:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User ${userId} disconnected`);
    });
  });
};