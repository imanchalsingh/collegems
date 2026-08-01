/**
 * Emit real-time job progress to Socket.io rooms (requester + hod).
 */
export function emitJobProgress(io, payload) {
  if (!io) return;
  const event = "queue:job_progress";
  io.to("hod").emit(event, payload);
  io.to("admin").emit(event, payload);
  if (payload.requestedBy) {
    io.to(`user_${payload.requestedBy}`).emit(event, payload);
  }
}

export function emitJobEvent(io, event, payload) {
  if (!io) return;
  io.to("hod").emit(event, payload);
  io.to("admin").emit(event, payload);
  if (payload.requestedBy) {
    io.to(`user_${payload.requestedBy}`).emit(event, payload);
  }
}
