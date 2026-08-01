import crypto from "crypto";

/**
 * In-memory live classroom poll sessions.
 * Teachers host rooms; students join by short code and compete on a live leaderboard.
 */

const sessions = new Map(); // sessionId -> session
const codeIndex = new Map(); // code -> sessionId

const roomName = (sessionId) => `livepoll_${sessionId}`;

const makeCode = () =>
  crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 6);

const getUser = (socket) => ({
  id: String(socket.user?.id || socket.user?._id || ""),
  role: String(socket.user?.role || "").toLowerCase(),
  name: socket.user?.name || socket.handshake.auth?.name || "Participant",
});

const publicQuestion = (q) => {
  if (!q) return null;
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.options,
    durationSec: q.durationSec,
    startedAt: q.startedAt,
    endsAt: q.endsAt,
    status: q.status,
    // never expose correctAnswers to students while open
  };
};

const tallyResults = (session) => {
  const q = session.currentQuestion;
  if (!q) return { optionCounts: [], wordCloud: [], totalResponses: 0 };

  if (q.type === "wordcloud") {
    const freq = new Map();
    for (const ans of q.answers.values()) {
      const words = String(ans.value || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((w) => w.length > 1);
      for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
    }
    const wordCloud = [...freq.entries()]
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40);
    return { optionCounts: [], wordCloud, totalResponses: q.answers.size };
  }

  const optionCounts = (q.options || []).map((label, index) => ({
    index,
    label,
    count: 0,
  }));

  for (const ans of q.answers.values()) {
    const selected = Array.isArray(ans.value) ? ans.value : [ans.value];
    for (const idx of selected) {
      const i = Number(idx);
      if (optionCounts[i]) optionCounts[i].count += 1;
    }
  }

  return { optionCounts, wordCloud: [], totalResponses: q.answers.size };
};

const leaderboard = (session) =>
  [...session.participants.values()]
    .filter((p) => p.role === "student")
    .map((p) => ({
      userId: p.userId,
      name: p.name,
      score: p.score,
      correct: p.correct,
      answered: p.answered,
    }))
    .sort((a, b) => b.score - a.score || b.correct - a.correct || a.name.localeCompare(b.name))
    .slice(0, 20);

const emitSessionState = (io, session, targetSocket = null) => {
  const q = session.currentQuestion;
  const results = tallyResults(session);
  const payload = {
    sessionId: session.id,
    code: session.code,
    title: session.title,
    status: session.status,
    hostId: session.hostId,
    participantCount: session.participants.size,
    question: publicQuestion(q),
    results,
    leaderboard: leaderboard(session),
    revealCorrect: q?.status === "closed" ? q.correctAnswers : undefined,
  };

  if (targetSocket) {
    targetSocket.emit("live-poll:state", payload);
  } else {
    io.to(roomName(session.id)).emit("live-poll:state", payload);
  }
};

const scoreAnswer = (q, answerValue, submittedAt) => {
  if (q.type === "wordcloud") {
    return { correct: true, points: 5 };
  }

  const correct = q.correctAnswers || [];
  if (!correct.length) {
    // poll mode — participation points only
    return { correct: true, points: 10 };
  }

  const selected = (Array.isArray(answerValue) ? answerValue : [answerValue]).map(Number).sort();
  const expected = [...correct].map(Number).sort();
  const isCorrect =
    selected.length === expected.length &&
    selected.every((v, i) => v === expected[i]);

  if (!isCorrect) return { correct: false, points: 0 };

  const remainingMs = Math.max(0, q.endsAt - submittedAt);
  const ratio = q.durationSec > 0 ? remainingMs / (q.durationSec * 1000) : 0;
  const speedBonus = Math.round(50 * ratio);
  return { correct: true, points: 100 + speedBonus };
};

export const initializeLivePollSockets = (io) => {
  io.on("connection", (socket) => {
    const user = getUser(socket);
    if (!user.id) return;

    socket.on("live-poll:create-session", (payload = {}, ack) => {
      try {
        if (user.role !== "teacher" && user.role !== "hod") {
          const err = { message: "Only teachers can host live polls" };
          if (typeof ack === "function") ack({ ok: false, ...err });
          socket.emit("live-poll:error", err);
          return;
        }

        let code = makeCode();
        while (codeIndex.has(code)) code = makeCode();
        const id = crypto.randomBytes(8).toString("hex");

        const session = {
          id,
          code,
          title: String(payload.title || "Live Classroom Poll").slice(0, 120),
          hostId: user.id,
          hostName: user.name,
          status: "waiting",
          participants: new Map(),
          currentQuestion: null,
          questionHistory: [],
          createdAt: Date.now(),
        };

        sessions.set(id, session);
        codeIndex.set(code, id);

        socket.join(roomName(id));
        session.participants.set(user.id, {
          userId: user.id,
          name: payload.hostName || user.name || "Teacher",
          role: "teacher",
          score: 0,
          correct: 0,
          answered: 0,
          socketId: socket.id,
        });

        const response = {
          ok: true,
          sessionId: id,
          code,
          title: session.title,
        };
        if (typeof ack === "function") ack(response);
        socket.emit("live-poll:session-created", response);
        emitSessionState(io, session, socket);
      } catch (error) {
        const err = { message: error.message || "Failed to create session" };
        if (typeof ack === "function") ack({ ok: false, ...err });
        socket.emit("live-poll:error", err);
      }
    });

    socket.on("live-poll:join-session", (payload = {}, ack) => {
      try {
        const code = String(payload.code || "").trim().toUpperCase();
        const sessionId = codeIndex.get(code);
        const session = sessionId ? sessions.get(sessionId) : null;
        if (!session || session.status === "ended") {
          const err = { message: "Session not found or ended" };
          if (typeof ack === "function") ack({ ok: false, ...err });
          socket.emit("live-poll:error", err);
          return;
        }

        socket.join(roomName(session.id));
        const existing = session.participants.get(user.id);
        session.participants.set(user.id, {
          userId: user.id,
          name: payload.name || existing?.name || user.name || "Student",
          role: user.role === "teacher" || user.role === "hod" ? "teacher" : "student",
          score: existing?.score || 0,
          correct: existing?.correct || 0,
          answered: existing?.answered || 0,
          socketId: socket.id,
        });

        const response = { ok: true, sessionId: session.id, code: session.code };
        if (typeof ack === "function") ack(response);
        socket.emit("live-poll:joined", response);
        emitSessionState(io, session);
      } catch (error) {
        const err = { message: error.message || "Failed to join session" };
        if (typeof ack === "function") ack({ ok: false, ...err });
        socket.emit("live-poll:error", err);
      }
    });

    socket.on("live-poll:start-question", (payload = {}, ack) => {
      try {
        const session = sessions.get(payload.sessionId);
        if (!session) {
          const err = { message: "Session not found" };
          if (typeof ack === "function") ack({ ok: false, ...err });
          return;
        }
        if (session.hostId !== user.id) {
          const err = { message: "Only the host can launch questions" };
          if (typeof ack === "function") ack({ ok: false, ...err });
          return;
        }

        const type = ["single", "multiple", "wordcloud"].includes(payload.type)
          ? payload.type
          : "single";
        const prompt = String(payload.prompt || "").trim();
        if (!prompt) {
          const err = { message: "Question prompt is required" };
          if (typeof ack === "function") ack({ ok: false, ...err });
          return;
        }

        let options = Array.isArray(payload.options)
          ? payload.options.map((o) => String(o).trim()).filter(Boolean)
          : [];
        if (type !== "wordcloud" && options.length < 2) {
          const err = { message: "Provide at least 2 options" };
          if (typeof ack === "function") ack({ ok: false, ...err });
          return;
        }

        const durationSec = Math.min(300, Math.max(5, Number(payload.durationSec) || 30));
        const startedAt = Date.now();
        const endsAt = startedAt + durationSec * 1000;

        let correctAnswers = [];
        if (type === "single" && payload.correctIndex != null) {
          correctAnswers = [Number(payload.correctIndex)];
        } else if (type === "multiple" && Array.isArray(payload.correctIndexes)) {
          correctAnswers = payload.correctIndexes.map(Number);
        }

        if (session.currentQuestion?.status === "open") {
          session.currentQuestion.status = "closed";
          session.questionHistory.push(session.currentQuestion);
        }

        session.currentQuestion = {
          id: crypto.randomBytes(4).toString("hex"),
          type,
          prompt,
          options,
          correctAnswers,
          durationSec,
          startedAt,
          endsAt,
          status: "open",
          answers: new Map(),
        };
        session.status = "live";

        // Auto-close when timer ends
        const questionId = session.currentQuestion.id;
        setTimeout(() => {
          const s = sessions.get(session.id);
          if (!s?.currentQuestion || s.currentQuestion.id !== questionId) return;
          if (s.currentQuestion.status !== "open") return;
          s.currentQuestion.status = "closed";
          io.to(roomName(s.id)).emit("live-poll:question-ended", {
            questionId,
            results: tallyResults(s),
            leaderboard: leaderboard(s),
            revealCorrect: s.currentQuestion.correctAnswers,
          });
          emitSessionState(io, s);
        }, durationSec * 1000 + 50);

        io.to(roomName(session.id)).emit("live-poll:question-started", {
          question: publicQuestion(session.currentQuestion),
          endsAt,
          durationSec,
        });
        emitSessionState(io, session);

        if (typeof ack === "function") ack({ ok: true, questionId });
      } catch (error) {
        const err = { message: error.message || "Failed to start question" };
        if (typeof ack === "function") ack({ ok: false, ...err });
        socket.emit("live-poll:error", err);
      }
    });

    socket.on("live-poll:submit-answer", (payload = {}, ack) => {
      try {
        const session = sessions.get(payload.sessionId);
        if (!session?.currentQuestion || session.currentQuestion.status !== "open") {
          const err = { message: "No open question to answer" };
          if (typeof ack === "function") ack({ ok: false, ...err });
          return;
        }

        const q = session.currentQuestion;
        if (Date.now() > q.endsAt) {
          q.status = "closed";
          const err = { message: "Time is up" };
          if (typeof ack === "function") ack({ ok: false, ...err });
          emitSessionState(io, session);
          return;
        }

        if (q.answers.has(user.id)) {
          const err = { message: "You already submitted an answer" };
          if (typeof ack === "function") ack({ ok: false, ...err });
          return;
        }

        const participant = session.participants.get(user.id);
        if (!participant || participant.role !== "student") {
          const err = { message: "Only students can submit answers" };
          if (typeof ack === "function") ack({ ok: false, ...err });
          return;
        }

        let value = payload.answer;
        if (q.type === "wordcloud") {
          value = String(value || "").trim().slice(0, 80);
          if (!value) {
            const err = { message: "Enter a word or short phrase" };
            if (typeof ack === "function") ack({ ok: false, ...err });
            return;
          }
        } else if (q.type === "multiple") {
          value = Array.isArray(value) ? value.map(Number) : [Number(value)];
        } else {
          value = Number(value);
        }

        const submittedAt = Date.now();
        const { correct, points } = scoreAnswer(q, value, submittedAt);

        q.answers.set(user.id, { value, submittedAt, points, correct });
        participant.answered += 1;
        participant.score += points;
        if (correct) participant.correct += 1;

        const results = tallyResults(session);
        io.to(roomName(session.id)).emit("live-poll:results", {
          questionId: q.id,
          results,
          leaderboard: leaderboard(session),
          responseCount: q.answers.size,
        });

        if (typeof ack === "function") {
          ack({ ok: true, points, correct, totalScore: participant.score });
        }
        socket.emit("live-poll:answer-accepted", {
          points,
          correct,
          totalScore: participant.score,
        });
      } catch (error) {
        const err = { message: error.message || "Failed to submit answer" };
        if (typeof ack === "function") ack({ ok: false, ...err });
        socket.emit("live-poll:error", err);
      }
    });

    socket.on("live-poll:end-question", (payload = {}, ack) => {
      try {
        const session = sessions.get(payload.sessionId);
        if (!session || session.hostId !== user.id) {
          const err = { message: "Not allowed" };
          if (typeof ack === "function") ack({ ok: false, ...err });
          return;
        }
        if (session.currentQuestion?.status === "open") {
          session.currentQuestion.status = "closed";
          io.to(roomName(session.id)).emit("live-poll:question-ended", {
            questionId: session.currentQuestion.id,
            results: tallyResults(session),
            leaderboard: leaderboard(session),
            revealCorrect: session.currentQuestion.correctAnswers,
          });
          emitSessionState(io, session);
        }
        if (typeof ack === "function") ack({ ok: true });
      } catch (error) {
        if (typeof ack === "function") ack({ ok: false, message: error.message });
      }
    });

    socket.on("live-poll:end-session", (payload = {}, ack) => {
      try {
        const session = sessions.get(payload.sessionId);
        if (!session || session.hostId !== user.id) {
          const err = { message: "Not allowed" };
          if (typeof ack === "function") ack({ ok: false, ...err });
          return;
        }
        session.status = "ended";
        io.to(roomName(session.id)).emit("live-poll:session-ended", {
          sessionId: session.id,
          leaderboard: leaderboard(session),
        });
        codeIndex.delete(session.code);
        // keep briefly for late state reads, then drop
        setTimeout(() => sessions.delete(session.id), 60_000);
        if (typeof ack === "function") ack({ ok: true });
      } catch (error) {
        if (typeof ack === "function") ack({ ok: false, message: error.message });
      }
    });

    socket.on("live-poll:get-state", (payload = {}) => {
      const session = sessions.get(payload.sessionId);
      if (session) emitSessionState(io, session, socket);
    });

    socket.on("disconnect", () => {
      for (const session of sessions.values()) {
        const p = session.participants.get(user.id);
        if (p && p.socketId === socket.id) {
          // keep scores; mark offline by clearing socketId
          p.socketId = null;
          io.to(roomName(session.id)).emit("live-poll:participant-update", {
            participantCount: [...session.participants.values()].filter((x) => x.socketId).length,
            leaderboard: leaderboard(session),
          });
        }
      }
    });
  });

  console.log("[Live Poll] Socket handlers registered");
};

/** Test helpers */
export const __livePollTestUtils = {
  sessions,
  codeIndex,
  tallyResults,
  scoreAnswer,
  leaderboard,
};
