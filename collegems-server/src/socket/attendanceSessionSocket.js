/**
 * Socket rooms for live QR attendance sessions (#710).
 * Teachers join to receive real-time mark events.
 */
export function initializeAttendanceSessionSockets(io) {
  io.on("connection", (socket) => {
    socket.on("attendance:join", ({ sessionId }) => {
      if (!sessionId || typeof sessionId !== "string") return;
      const role = (socket.user?.role || "").toLowerCase();
      if (role !== "teacher" && role !== "hod" && role !== "admin") {
        return;
      }
      const room = `attendance_session_${sessionId}`;
      socket.join(room);
      socket.emit("attendance:joined", { sessionId, room });
    });

    socket.on("attendance:leave", ({ sessionId }) => {
      if (!sessionId) return;
      socket.leave(`attendance_session_${sessionId}`);
    });
  });
}
