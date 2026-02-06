"use client";

import { useEffect, useMemo, useState } from "react";
import { gameConfig } from "@/lib/gameConfig";
import {
  createWordHuntGrid,
  getWordHuntScore,
  isDictionaryWord,
  loadWordHuntDictionary,
  normalizeWord,
  type WordHuntTile,
  wordHuntConfig,
} from "@/lib/wordHunt";
import {
  type Puzzle,
  phraseBuildPuzzles,
  tokenRevealPuzzles,
} from "@/lib/puzzles";

const floatingHearts = Array.from({ length: 7 }, (_, index) => index);

const normalizeAnswer = (value: string) =>
  value.replace(/\s+/g, "").toUpperCase();

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
  const [screen, setScreen] = useState<
    "start" | "pong" | "hunt" | "play" | "reveal"
  >("start");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrambled, setScrambled] = useState("");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">(
    "idle",
  );
  const [rewards, setRewards] = useState<string[]>([]);
  const [huntGrid, setHuntGrid] = useState<WordHuntTile[]>([]);
  const [huntPath, setHuntPath] = useState<number[]>([]);
  const [huntFound, setHuntFound] = useState<string[]>([]);
  const [huntStatus, setHuntStatus] = useState<
    | "idle"
    | "added"
    | "repeat"
    | "short"
    | "invalid"
    | "not-adjacent"
    | "loading"
    | "load-error"
  >("idle");
  const [huntTimeLeft, setHuntTimeLeft] = useState(wordHuntConfig.timerSeconds);
  const [isHuntDragging, setIsHuntDragging] = useState(false);
  const [huntScore, setHuntScore] = useState(0);
  const [huntDictionary, setHuntDictionary] = useState<Set<string> | null>(
    null,
  );
  const [huntDictionaryReady, setHuntDictionaryReady] = useState(false);
  const [huntDictionaryError, setHuntDictionaryError] = useState(false);
  const [pongTimeLeft, setPongTimeLeft] = useState(30);
  const [pongSunk, setPongSunk] = useState<number[]>([]);
  const [pongStatus, setPongStatus] = useState<"idle" | "hit" | "miss">("idle");
  const [pongReloading, setPongReloading] = useState(false);

  const pongRows = [1, 2, 3, 4];
  const pongWinTarget = 6;
  const pongSuccessRate = 0.6;
  const pongReloadMs = 700;

  const puzzle = puzzles[currentIndex];

  useEffect(() => {
    if (!puzzle) {
      return;
    }
    setScrambled(scramble(puzzle.answer));
    setInput("");
    setStatus("idle");
  }, [puzzle]);

  useEffect(() => {
    if (screen !== "pong") {
      return;
    }
    if (pongTimeLeft <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setPongTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [screen, pongTimeLeft]);

  useEffect(() => {
    let isMounted = true;
    loadWordHuntDictionary()
      .then((dictionary) => {
        if (isMounted) {
          setHuntDictionary(dictionary);
          setHuntDictionaryReady(true);
          setHuntDictionaryError(false);
          setHuntStatus("idle");
        }
      })
      .catch(() => {
        if (isMounted) {
          setHuntDictionary(null);
          setHuntDictionaryReady(false);
          setHuntDictionaryError(true);
          setHuntStatus("load-error");
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const startHunt = () => {
    setScreen("hunt");
    setHuntGrid(createWordHuntGrid());
    setHuntPath([]);
    setHuntFound([]);
    setHuntStatus(
      huntDictionaryError
        ? "load-error"
        : huntDictionaryReady
          ? "idle"
          : "loading",
    );
    setHuntTimeLeft(wordHuntConfig.timerSeconds);
    setHuntScore(0);
  };

  const handleStart = () => {
    setScreen("pong");
    setPongTimeLeft(30);
    setPongSunk([]);
    setPongStatus("idle");
    setPongReloading(false);
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

  useEffect(() => {
    if (screen !== "hunt") {
      return;
    }
    if (huntTimeLeft <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setHuntTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [screen, huntTimeLeft]);

  useEffect(() => {
    if (huntPath.length === 0) {
      setHuntStatus("idle");
    }
  }, [huntPath]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const remaining = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remaining}`;
  };

  const isAdjacent = (from: WordHuntTile, to: WordHuntTile) => {
    const rowDiff = Math.abs(from.row - to.row);
    const colDiff = Math.abs(from.col - to.col);
    return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
  };

  const handleTileSelect = (tileId: number) => {
    if (huntTimeLeft <= 0) {
      return;
    }
    setHuntStatus("idle");
    setHuntPath((prev) => {
      if (prev.includes(tileId)) {
        if (prev[prev.length - 1] === tileId) {
          return prev.slice(0, -1);
        }
        return prev;
      }
      if (prev.length === 0) {
        return [tileId];
      }
      const lastTile = huntGrid[prev[prev.length - 1]];
      const nextTile = huntGrid[tileId];
      if (!lastTile || !nextTile) {
        return prev;
      }
      if (!isAdjacent(lastTile, nextTile)) {
        setHuntStatus("not-adjacent");
        return prev;
      }
      return [...prev, tileId];
    });
  };

  const currentHuntWord = huntPath
    .map((id) => huntGrid[id]?.letter ?? "")
    .join("");

  const handleSubmitHuntWord = () => {
    if (huntTimeLeft <= 0) {
      return;
    }
    if (!huntDictionaryReady || !huntDictionary) {
      setHuntStatus(huntDictionaryError ? "load-error" : "loading");
      return;
    }
    const normalized = normalizeWord(currentHuntWord);
    if (normalized.length === 0) {
      setHuntStatus("idle");
      return;
    }
    if (normalized.length < wordHuntConfig.minWordLength) {
      setHuntStatus("short");
      setHuntPath([]);
      return;
    }
    if (!isDictionaryWord(huntDictionary, normalized)) {
      setHuntStatus("invalid");
      setHuntPath([]);
      return;
    }
    if (huntFound.includes(normalized)) {
      setHuntStatus("repeat");
      setHuntPath([]);
      return;
    }
    setHuntFound((prev) => [...prev, normalized]);
    setHuntScore((prev) => prev + getWordHuntScore(normalized));
    setHuntStatus("added");
    setHuntPath([]);
  };

  const handleHuntComplete = () => {
    setScreen("play");
  };

  const handlePongComplete = () => {
    startHunt();
  };

  const handlePongShot = (cupId: number) => {
    if (pongReloading || pongTimeLeft <= 0) {
      return;
    }
    if (pongSunk.length >= pongWinTarget) {
      return;
    }
    if (pongSunk.includes(cupId)) {
      return;
    }
    setPongReloading(true);
    const hit = Math.random() < pongSuccessRate;
    setPongStatus(hit ? "hit" : "miss");
    if (hit) {
      setPongSunk((prev) => [...prev, cupId]);
    }
    window.setTimeout(() => {
      setPongReloading(false);
    }, pongReloadMs);
  };

  const handleHuntDragStart = (tileId: number) => {
    if (huntTimeLeft <= 0) {
      return;
    }
    setIsHuntDragging(true);
    setHuntPath([tileId]);
    setHuntStatus("idle");
  };

  const handleHuntDragEnd = () => {
    setIsHuntDragging(false);
    if (huntPath.length > 0) {
      handleSubmitHuntWord();
    }
  };

  const handleHuntRestart = () => {
    setHuntGrid(createWordHuntGrid());
    setHuntPath([]);
    setHuntFound([]);
    setHuntStatus("idle");
    setHuntTimeLeft(wordHuntConfig.timerSeconds);
    setHuntScore(0);
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
              left: `${10 + ((heart * 11) % 70)}%`,
            }}
          >
            ❤
          </span>
        ))}
      </div>

      <section className="relative mx-auto flex min-h-[80vh] w-full max-w-xl flex-col items-center justify-center gap-6 rounded-3xl bg-white/80 p-8 text-center shadow-glow backdrop-blur">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-rose-400">
          <span>made by muah</span>
        </div>

        {screen === "start" && (
          <div className="flex flex-col items-center gap-6">
            <h1 className="font-display text-4xl font-bold text-rose-600 sm:text-5xl">
              Meow, meow
            </h1>
            <p className="text-base leading-relaxed text-rose-700">
              Hello Kelly. Sink some cups, warm up with a word hunt, then solve
              each anagram to reveal a special message just for you.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-600">
                {totalPuzzles} puzzles
              </span>
              <span className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-600">
                30s cup toss
              </span>
              <span className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-600">
                {formatTime(wordHuntConfig.timerSeconds)} word hunt
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
              Start
            </button>
          </div>
        )}

        {screen === "pong" && (
          <div className="flex w-full flex-col items-center gap-5">
            <div className="flex w-full items-center justify-between text-sm font-semibold text-rose-400">
              <span>Cup Toss Warm-up</span>
              <span>{formatTime(pongTimeLeft)}</span>
            </div>

            <div className="flex w-full flex-col items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
              <span>
                Cups sunk: {pongSunk.length} / {pongWinTarget}
              </span>
              <span>{pongReloading ? "Reloading..." : "Tap a cup to shoot"}</span>
            </div>

            <div className="flex w-full flex-col items-center gap-2">
              {pongRows.map((row, rowIndex) => (
                <div key={row} className="flex justify-center gap-2">
                  {Array.from({ length: row }, (_, colIndex) => {
                    const cupId = rowIndex * 10 + colIndex;
                    const sunk = pongSunk.includes(cupId);
                    return (
                      <button
                        key={cupId}
                        type="button"
                        onClick={() => handlePongShot(cupId)}
                        disabled={pongReloading || pongTimeLeft <= 0}
                        className={`flex h-12 w-12 items-end justify-center rounded-full border-2 pb-1 text-sm font-bold transition ${
                          sunk
                            ? "border-rose-200 bg-rose-100 text-rose-300"
                            : "border-rose-400 bg-white text-rose-500 hover:bg-rose-50"
                        }`}
                      >
                        {sunk ? "✓" : "●"}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {pongStatus !== "idle" && (
              <div className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">
                {pongStatus === "hit" ? "Splash! Nice shot." : "Missed. Try again."}
              </div>
            )}

            {pongSunk.length >= pongWinTarget && (
              <div className="flex w-full flex-col items-center gap-3">
                <p className="text-sm font-semibold text-rose-500">
                  You nailed it! Ready for the word hunt.
                </p>
                <button
                  className="rounded-full bg-rose-500 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-rose-600"
                  onClick={handlePongComplete}
                >
                  Start the word hunt
                </button>
              </div>
            )}

            {pongTimeLeft <= 0 && pongSunk.length < pongWinTarget && (
              <div className="flex w-full flex-col items-center gap-3">
                <p className="text-sm font-semibold text-rose-500">
                  Time&apos;s up! Try again to sink {pongWinTarget} cups.
                </p>
                <button
                  className="rounded-full bg-rose-500 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-rose-600"
                  onClick={handleStart}
                >
                  Replay the cup toss
                </button>
              </div>
            )}
          </div>
        )}

        {screen === "hunt" && (
          <div className="flex w-full flex-col items-center gap-5">
            <div className="flex w-full items-center justify-between text-sm font-semibold text-rose-400">
              <span>Word Hunt Warm-up</span>
              <span>{formatTime(huntTimeLeft)}</span>
            </div>

            <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
              <span>Score: {huntScore.toLocaleString()}</span>
              <span>
                Goal: {wordHuntConfig.targetPoints.toLocaleString()} points
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-rose-100">
              <div
                className="h-full rounded-full bg-rose-400 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((huntScore / wordHuntConfig.targetPoints) * 100),
                  )}%`,
                }}
              />
            </div>

            <div
              className="grid w-full touch-none grid-cols-5 gap-2"
              onPointerUp={handleHuntDragEnd}
              onPointerLeave={handleHuntDragEnd}
              onPointerCancel={handleHuntDragEnd}
            >
              {huntGrid.map((tile) => {
                const isSelected = huntPath.includes(tile.id);
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onPointerDown={() => handleHuntDragStart(tile.id)}
                    onPointerEnter={() => {
                      if (isHuntDragging) {
                        handleTileSelect(tile.id);
                      }
                    }}
                    className={`flex aspect-square items-center justify-center rounded-2xl text-2xl font-bold transition ${
                      isSelected
                        ? "bg-rose-500 text-white shadow-lg"
                        : "bg-white text-rose-600 shadow-sm hover:bg-rose-50"
                    }`}
                  >
                    {tile.letter}
                  </button>
                );
              })}
            </div>

            <div className="flex w-full flex-col items-center gap-2">
              <div className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-center text-lg font-semibold text-rose-700 shadow-sm">
                {currentHuntWord || "Tap letters to build a word"}
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">
                Swipe letters, lift to submit
              </span>
            </div>

            {huntStatus !== "idle" && (
              <div className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">
                {huntStatus === "added" && "Nice! Word added."}
                {huntStatus === "repeat" && "Already found that one."}
                {huntStatus === "short" &&
                  `Words must be at least ${wordHuntConfig.minWordLength} letters.`}
                {huntStatus === "invalid" && "Not in the dictionary yet."}
                {huntStatus === "not-adjacent" &&
                  "Letters must touch (including diagonals)."}
                {huntStatus === "loading" && "Loading the word list..."}
                {huntStatus === "load-error" &&
                  "Word list failed to load. Check your connection."}
              </div>
            )}

            <div className="flex w-full flex-wrap justify-center gap-2">
              {huntFound.length === 0 && (
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">
                  No words yet
                </span>
              )}
              {huntFound.map((word) => (
                <span
                  key={word}
                  className="rounded-full bg-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
                >
                  {word}
                </span>
              ))}
            </div>

            {huntScore >= wordHuntConfig.targetPoints && (
              <div className="flex w-full flex-col items-center gap-3">
                <p className="text-sm font-semibold text-rose-500">
                  Goal reached! You&apos;re ready for the anagrams.
                </p>
                <button
                  className="rounded-full bg-rose-500 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-rose-600"
                  onClick={handleHuntComplete}
                >
                  Start the anagrams
                </button>
              </div>
            )}

            {huntTimeLeft <= 0 && huntScore < wordHuntConfig.targetPoints && (
              <div className="flex w-full flex-col items-center gap-3">
                <p className="text-sm font-semibold text-rose-500">
                  Time&apos;s up! You scored {huntScore.toLocaleString()}{" "}
                  points. Try again to reach the goal.
                </p>
                <button
                  className="rounded-full bg-rose-500 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-rose-600"
                  onClick={handleHuntRestart}
                >
                  New grid, try again
                </button>
              </div>
            )}
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

            <form
              onSubmit={handleSubmit}
              className="flex w-full flex-col gap-4"
            >
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
