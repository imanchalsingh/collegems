import ChatMessage from "../models/ChatMessage.model.js";
import StudyGroup from "../models/StudyGroup.model.js";
import Workspace from "../models/Workspace.model.js";
import Notification from "../models/Notification.model.js";
import * as Y from "yjs";

const activeDocuments = new Map();

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
    }, 5000);
  }
};

export const initializeStudyGroupSockets = (io) => {
  io.on("connection", (socket) => {
    const userId = socket.user?.id || socket.user?._id;
    if (!userId) return;

    // Join a specific study group room
    socket.on("join-group", async (groupId) => {
      try {
        const group = await StudyGroup.findById(groupId);
        if (group && group.members.includes(userId)) {
          socket.join(`group_${groupId}`);
          socket.to(`group_${groupId}`).emit("user-joined", { userId });
          
          // Get all current active users in the room
          const socketsInRoom = await io.in(`group_${groupId}`).fetchSockets();
          const activeUserIds = [...new Set(socketsInRoom.map(s => s.user?.id || s.user?._id).filter(id => id))];
          socket.emit("active-users", activeUserIds);

          // Send initial document state
          const ydoc = await getDocument(groupId);
          const stateUpdate = Y.encodeStateAsUpdate(ydoc);
          socket.emit("sync-initial-state", Array.from(stateUpdate));
          
          console.log(`User ${userId} joined group ${groupId}`);
        }
      } catch (error) {
        console.error("Error joining group socket:", error);
      }
    });

    // Leave a specific study group room
    socket.on("leave-group", (groupId) => {
      socket.leave(`group_${groupId}`);
      socket.to(`group_${groupId}`).emit("user-left", { userId });
      console.log(`User ${userId} left group ${groupId}`);
    });

    // Handle chat messages
    socket.on("send-message", async (data) => {
      try {
        const { groupId, content } = data;
        const message = new ChatMessage({
          groupId,
          senderId: userId,
          content,
        });
        await message.save();
        
        const populatedMessage = await message.populate("senderId", "name email");
        
        io.to(`group_${groupId}`).emit("receive-message", populatedMessage);

        // Notify other group members
        const group = await StudyGroup.findById(groupId);
        if (group && group.members) {
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
      }
    });

    socket.on("typing", (data) => {
      const { groupId, userName } = data;
      socket.to(`group_${groupId}`).emit("typing", { userId, userName });
    });

    socket.on("stop-typing", (data) => {
      const { groupId, userName } = data;
      socket.to(`group_${groupId}`).emit("stop-typing", { userId, userName });
    });

    // Handle document sync (Yjs update broadcast)
    socket.on("sync-update", async (data) => {
      const { groupId, update } = data;
      
      // Broadcast to other clients
      socket.to(`group_${groupId}`).emit("sync-update", update);
      
      // Apply to server document
      try {
        const ydoc = await getDocument(groupId);
        const updateUint8 = new Uint8Array(update);
        Y.applyUpdate(ydoc, updateUint8);
        debounceSave(groupId, ydoc);
      } catch (error) {
        console.error("Error applying sync update on server:", error);
      }
    });

    // Handle awareness protocol (cursors, presence)
    socket.on("awareness-update", (data) => {
      const { groupId, update } = data;
      socket.to(`group_${groupId}`).emit("awareness-update", update);
    });

    // Disconnect handling is generally managed at the root connection
    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room.startsWith("group_")) {
          socket.to(room).emit("user-left", { userId });
        }
      }
    });
  });
};
