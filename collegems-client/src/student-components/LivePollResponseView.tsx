import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Timer,
  Trophy,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useSocket } from "../context/SocketContext";

interface LeaderRow {
  userId: string;
  name: string;
  score: number;
  correct: number;
  answered: number;
}

interface Question {
  id: string;
  type: "single" | "multiple" | "wordcloud";
  prompt: string;
  options: string[];
  durationSec: number;
  endsAt: number;
  status: string;
}

export default function LivePollResponseView() {
  const { socket, isConnected } = useSocket();
  const [code, setCode] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [joined, setJoined] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedMulti, setSelectedMulti] = useState<number[]>([]);
  const [word, setWord] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onQuestion = (payload: { question: Question }) => {
      setQuestion(payload.question);
      setSubmitted(false);
      setSelected(null);
      setSelectedMulti([]);
      setWord("");
      setLastPoints(null);
      setError("");
    };

    const onState = (payload: {
      sessionId: string;
      question: Question | null;
      leaderboard: LeaderRow[];
    }) => {
      setSessionId(payload.sessionId);
      setQuestion(payload.question);
      setLeaderboard(payload.leaderboard || []);
      if (payload.question?.status === "open") {
        // keep submitted if already answered — server rejects duplicates
      }
    };

    const onResults = (payload: { leaderboard: LeaderRow[] }) => {
      setLeaderboard(payload.leaderboard || []);
    };

    const onAccepted = (payload: { points: number; totalScore: number }) => {
      setSubmitted(true);
      setLastPoints(payload.points);
      setTotalScore(payload.totalScore);
    };

    const onEnded = () => {
      setJoined(false);
      setSessionId("");
      setQuestion(null);
      setError("Session ended by the teacher.");
    };

    const onError = (payload: { message?: string }) => setError(payload.message || "Error");

    socket.on("live-poll:question-started", onQuestion);
    socket.on("live-poll:state", onState);
    socket.on("live-poll:results", onResults);
    socket.on("live-poll:question-ended", onResults);
    socket.on("live-poll:answer-accepted", onAccepted);
    socket.on("live-poll:session-ended", onEnded);
    socket.on("live-poll:error", onError);

    return () => {
      socket.off("live-poll:question-started", onQuestion);
      socket.off("live-poll:state", onState);
      socket.off("live-poll:results", onResults);
      socket.off("live-poll:question-ended", onResults);
      socket.off("live-poll:answer-accepted", onAccepted);
      socket.off("live-poll:session-ended", onEnded);
      socket.off("live-poll:error", onError);
    };
  }, [socket]);

  const remainingSec = useMemo(() => {
    if (!question || question.status !== "open") return 0;
    return Math.max(0, Math.ceil((question.endsAt - now) / 1000));
  }, [question, now]);

  const join = () => {
    if (!socket || !isConnected) {
      setError("Not connected to live server.");
      return;
    }
    setBusy(true);
    setError("");
    socket.emit(
      "live-poll:join-session",
      {
        code: code.trim().toUpperCase(),
        name: localStorage.getItem("name") || "Student",
      },
      (res: { ok?: boolean; sessionId?: string; message?: string }) => {
        setBusy(false);
        if (!res?.ok) {
          setError(res?.message || "Could not join");
          return;
        }
        setSessionId(res.sessionId || "");
        setJoined(true);
      }
    );
  };

  const submit = () => {
    if (!socket || !sessionId || !question || submitted) return;
    let answer: string | number | number[] = "";
    if (question.type === "wordcloud") answer = word;
    else if (question.type === "multiple") answer = selectedMulti;
    else {
      if (selected == null) {
        setError("Pick an option");
        return;
      }
      answer = selected;
    }

    setBusy(true);
    socket.emit(
      "live-poll:submit-answer",
      { sessionId, answer },
      (res: { ok?: boolean; message?: string; points?: number; totalScore?: number }) => {
        setBusy(false);
        if (!res?.ok) {
          setError(res?.message || "Submit failed");
          return;
        }
        setSubmitted(true);
        setLastPoints(res.points ?? null);
        setTotalScore(res.totalScore ?? totalScore);
      }
    );
  };

  const toggleMulti = (idx: number) => {
    setSelectedMulti((prev) =>
      prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
    );
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Live Poll</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Enter the code from your teacher’s screen to join the live quiz.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
            isConnected
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {isConnected ? "Connected" : "Offline"}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!joined ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <label className="block text-sm font-medium">
            Session code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-lg tracking-widest dark:border-slate-600 dark:bg-slate-950"
            />
          </label>
          <button
            type="button"
            disabled={busy || code.trim().length < 4 || !isConnected}
            onClick={join}
            className="mt-4 w-full rounded-lg bg-teal-700 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Join live session"}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <span className="font-mono tracking-widest text-teal-700 dark:text-teal-300">{code}</span>
            <span className="font-semibold tabular-nums">{totalScore} pts</span>
          </div>

          {!question || question.status !== "open" ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
              Waiting for the teacher to launch the next question…
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                  <Timer className="h-4 w-4" /> {remainingSec}s left
                </span>
                {submitted && (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Submitted{lastPoints != null ? ` (+${lastPoints})` : ""}
                  </span>
                )}
              </div>

              <p className="text-base font-semibold text-slate-900 dark:text-white">{question.prompt}</p>

              {question.type === "wordcloud" ? (
                <input
                  value={word}
                  disabled={submitted}
                  onChange={(e) => setWord(e.target.value)}
                  placeholder="Type a word…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
                />
              ) : (
                <div className="space-y-2">
                  {question.options.map((opt, idx) => {
                    const active =
                      question.type === "multiple"
                        ? selectedMulti.includes(idx)
                        : selected === idx;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={submitted}
                        onClick={() =>
                          question.type === "multiple" ? toggleMulti(idx) : setSelected(idx)
                        }
                        className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                          active
                            ? "border-teal-600 bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
                            : "border-slate-200 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
                        } disabled:opacity-60`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                disabled={busy || submitted || remainingSec <= 0}
                onClick={submit}
                className="w-full rounded-lg bg-teal-700 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Submit answer"}
              </button>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-amber-500" /> Live leaderboard
            </h3>
            <ol className="space-y-2">
              {leaderboard.length === 0 && (
                <li className="text-sm text-slate-400">Leaderboard updates as answers come in.</li>
              )}
              {leaderboard.map((row, idx) => (
                <li
                  key={row.userId}
                  className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50"
                >
                  <span>
                    <span className="mr-2 text-xs text-slate-400">#{idx + 1}</span>
                    {row.name}
                  </span>
                  <span className="font-semibold tabular-nums">{row.score}</span>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
