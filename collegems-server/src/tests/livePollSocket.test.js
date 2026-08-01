import test from "node:test";
import assert from "node:assert";
import { __livePollTestUtils } from "../socket/livePollSocket.js";

const { scoreAnswer, tallyResults, leaderboard } = __livePollTestUtils;

test("live poll scoring and tallies", async (t) => {
  await t.test("awards speed bonus for fast correct answers", () => {
    const q = {
      type: "single",
      correctAnswers: [1],
      durationSec: 30,
      endsAt: Date.now() + 30_000,
    };
    const early = scoreAnswer(q, 1, Date.now());
    assert.strictEqual(early.correct, true);
    assert.ok(early.points >= 100);
    assert.ok(early.points <= 150);

    const wrong = scoreAnswer(q, 0, Date.now());
    assert.strictEqual(wrong.correct, false);
    assert.strictEqual(wrong.points, 0);
  });

  await t.test("tallies single-choice and word cloud responses", () => {
    const session = {
      currentQuestion: {
        type: "single",
        options: ["A", "B", "C"],
        answers: new Map([
          ["u1", { value: 0 }],
          ["u2", { value: 1 }],
          ["u3", { value: 0 }],
        ]),
      },
    };
    const tallies = tallyResults(session);
    assert.strictEqual(tallies.totalResponses, 3);
    assert.strictEqual(tallies.optionCounts[0].count, 2);
    assert.strictEqual(tallies.optionCounts[1].count, 1);

    session.currentQuestion = {
      type: "wordcloud",
      options: [],
      answers: new Map([
        ["u1", { value: "react hooks" }],
        ["u2", { value: "React" }],
      ]),
    };
    const cloud = tallyResults(session);
    assert.ok(cloud.wordCloud.some((w) => w.word === "react"));
  });

  await t.test("leaderboard sorts by score", () => {
    const session = {
      participants: new Map([
        ["a", { userId: "a", name: "Ann", role: "student", score: 50, correct: 1, answered: 2 }],
        ["b", { userId: "b", name: "Bob", role: "student", score: 200, correct: 2, answered: 2 }],
        ["t", { userId: "t", name: "Teach", role: "teacher", score: 0, correct: 0, answered: 0 }],
      ]),
    };
    const board = leaderboard(session);
    assert.strictEqual(board.length, 2);
    assert.strictEqual(board[0].name, "Bob");
  });
});
