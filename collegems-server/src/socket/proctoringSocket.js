import ProctoringLog from "../models/ProctoringLog.model.js";

/**
 * Real-time proctoring events over Socket.io.
 */
export function initializeProctoringSockets(io) {
  io.on("connection", (socket) => {
    socket.on("proctoring:join", async (payload = {}) => {
      try {
        const { sessionId, quizId } = payload;
        if (sessionId) socket.join(`proctor_${sessionId}`);
        if (quizId) socket.join(`proctor_quiz_${quizId}`);
        if (socket.user?.role === "teacher" || socket.user?.role === "hod" || socket.user?.role === "admin") {
          socket.join("proctor_monitors");
        }
        socket.emit("proctoring:joined", { sessionId, quizId });
      } catch (err) {
        socket.emit("proctoring:error", { message: err.message });
      }
    });

    socket.on("proctoring:heartbeat", async (payload = {}) => {
      const { sessionId, faceCount } = payload;
      if (!sessionId) return;
      try {
        await ProctoringLog.updateOne(
          { sessionId, status: "active" },
          { lastFaceCount: typeof faceCount === "number" ? faceCount : undefined },
        );
        io.to("teacher").to("hod").to("admin").to("proctor_monitors").emit("proctoring:heartbeat", {
          sessionId,
          faceCount,
          studentId: socket.user?.id,
          at: new Date().toISOString(),
        });
      } catch {
        /* ignore heartbeat errors */
      }
    });
  });
}
