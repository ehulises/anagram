"use client";

import { useEffect, useMemo, useState } from "react";
import { gameConfig } from "@/lib/gameConfig";
import {
  type Puzzle,
  phraseBuildPuzzles,
  tokenRevealPuzzles
} from "@/lib/puzzles";

const floatingHearts = Array.from({ length: 7 }, (_, index) => index);

const normalizeAnswer = (value: string) => value.replace(/\s+/g, "").toUpperCase();

const scramble = (value: string) => {
  const letters = value.replace(/\s+/g, "").split("");
  if (letters.length < 2) {
    return letters.join(" ");
  }
  let shuffled = letters.slice();
  let attempts = 0;
  while (attempts < 5) {
    shuffled = letters.slice().sort(() => Math.random() - 0.5);
    if (shuffled.join("") !== letters.join("")) {
      break;
    }
    attempts += 1;
  }
  return shuffled.join(" ");
};

export default function Home() {
  const puzzles: Puzzle[] = useMemo(() => {
    return gameConfig.mode === "phrase-build"
      ? phraseBuildPuzzles
      : tokenRevealPuzzles;
  }, []);
  const totalPuzzles = puzzles.length;
  const [screen, setScreen] = useState<"start" | "play" | "reveal">("start");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrambled, setScrambled] = useState("");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">(
    "idle"
  );
  const [rewards, setRewards] = useState<string[]>([]);

  const puzzle = puzzles[currentIndex];

  useEffect(() => {
    if (!puzzle) {
      return;
    }
    setScrambled(scramble(puzzle.answer));
    setInput("");
    setStatus("idle");
  }, [puzzle]);

  const handleStart = () => {
    setScreen("play");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!puzzle) {
      return;
    }
    const isCorrect = normalizeAnswer(input) === normalizeAnswer(puzzle.answer);
    setStatus(isCorrect ? "correct" : "incorrect");
    if (!isCorrect) {
      return;
    }
    const updatedRewards = [...rewards, puzzle.reward];
    setRewards(updatedRewards);
    if (currentIndex + 1 >= totalPuzzles) {
      setTimeout(() => setScreen("reveal"), 500);
      return;
    }
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 550);
  };

  const finalMessage = useMemo(() => {
    if (gameConfig.mode === "phrase-build") {
      return `${rewards.join(" ")}?`;
    }
    return rewards.join(" ");
  }, [rewards]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-pink-100 via-rose-100 to-rose-200 px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        {floatingHearts.map((heart) => (
          <span
            key={heart}
            className="floating-heart absolute text-2xl"
            style={{
              top: `${15 + heart * 12}%`,
              left: `${10 + (heart * 11) % 70}%`
            }}
          >
            ❤
          </span>
        ))}
      </div>

      <section className="relative mx-auto flex min-h-[80vh] w-full max-w-xl flex-col items-center justify-center gap-6 rounded-3xl bg-white/80 p-8 text-center shadow-glow backdrop-blur">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-rose-400">
          <span>ANAGRAM LOVE NOTES</span>
        </div>

        {screen === "start" && (
          <div className="flex flex-col items-center gap-6">
            <h1 className="font-display text-4xl font-bold text-rose-600 sm:text-5xl">
              A Valentine Surprise
            </h1>
            <p className="text-base leading-relaxed text-rose-700">
              Hi {gameConfig.playerName}! Solve each anagram to collect hearts and
              unlock a special message.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-600">
                {totalPuzzles} puzzles
              </span>
              <span className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-600">
                {gameConfig.mode === "phrase-build"
                  ? "Build the phrase"
                  : "Collect the message"}
              </span>
            </div>
            <button
              className="rounded-full bg-rose-500 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-rose-600"
              onClick={handleStart}
            >
              Start the love quest
            </button>
          </div>
        )}

        {screen === "play" && puzzle && (
          <div className="flex w-full flex-col items-center gap-6">
            <div className="flex w-full items-center justify-between text-sm font-semibold text-rose-400">
              <span>
                Puzzle {currentIndex + 1} of {totalPuzzles}
              </span>
              <span>{rewards.length} hearts collected</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-2xl font-bold text-rose-600">
              {scrambled}
            </div>
            <p className="text-sm text-rose-500">{puzzle.clue}</p>

            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type your answer"
                className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-center text-lg font-semibold text-rose-700 shadow-sm outline-none transition focus:border-rose-400"
              />
              <button
                type="submit"
                className="rounded-full bg-rose-500 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-rose-600"
              >
                Submit
              </button>
            </form>

            {status === "correct" && (
              <div className="animate-pop rounded-2xl bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-600">
                Correct! You earned: {puzzle.reward}
              </div>
            )}
            {status === "incorrect" && (
              <div className="rounded-2xl bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-500">
                Not quite! Try again.
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-2">
              {rewards.map((reward, index) => (
                <span
                  key={`${reward}-${index}`}
                  className="rounded-full bg-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
                >
                  ❤ {reward}
                </span>
              ))}
            </div>
          </div>
        )}

        {screen === "reveal" && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl">💖</span>
              <h2 className="font-display text-3xl font-bold text-rose-600">
                {gameConfig.mode === "phrase-build"
                  ? "You built the message!"
                  : "Your message is ready!"}
              </h2>
            </div>

            <div className="rounded-3xl bg-rose-50 px-6 py-5 text-center text-2xl font-bold text-rose-600 shadow-inner">
              {finalMessage || "Will you be my Valentine?"}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="rounded-full bg-rose-500 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-rose-600">
                Yes 💘
              </button>
              <button className="rounded-full bg-rose-200 px-6 py-3 text-base font-semibold text-rose-700 shadow-md transition hover:bg-rose-300">
                Of course 💘
              </button>
            </div>

            <p className="text-sm text-rose-400">
              Happy Valentine&apos;s Day, {gameConfig.playerName}!
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
