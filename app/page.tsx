"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    "start" | "wordle" | "puzzle" | "states" | "hunt" | "play" | "reveal"
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
  const wordleSecret = "KELLY";
  const wordleMaxAttempts = 6;
  const statesGoal = gameConfig.statesPuzzle.requiredStates;
  const stateNames: Record<string, string> = {
    WA: "Washington",
    OR: "Oregon",
    TX: "Texas",
    IL: "Illinois",
    MA: "Massachusetts",
    MO: "Missouri",
    AR: "Arkansas"
  };
  const [wordleGuesses, setWordleGuesses] = useState<string[]>([]);
  const [wordleInput, setWordleInput] = useState("");
  const [wordleStatus, setWordleStatus] = useState<
    "idle" | "invalid" | "win" | "lose"
  >("idle");
  const puzzleSize = gameConfig.slidingPuzzle.gridSize;
  const [puzzleTiles, setPuzzleTiles] = useState<number[]>([]);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [statesSvg, setStatesSvg] = useState("");
  const [statesLoading, setStatesLoading] = useState(false);
  const [statesLoadError, setStatesLoadError] = useState(false);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [statesSolved, setStatesSolved] = useState(false);
  const statesMapRef = useRef<HTMLDivElement | null>(null);
  const [finalChoice, setFinalChoice] = useState<
    "idle" | "nope" | "yes" | "of-course"
  >("idle");
  const [yesHover, setYesHover] = useState(false);

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

  const startWordle = () => {
    setScreen("wordle");
    setWordleGuesses([]);
    setWordleInput("");
    setWordleStatus("idle");
  };

  const handleStart = () => {
    startStates();
  };

  const countInversions = (tiles: number[]) => {
    const filtered = tiles.filter((value) => value !== tiles.length - 1);
    let inversions = 0;
    for (let i = 0; i < filtered.length; i += 1) {
      for (let j = i + 1; j < filtered.length; j += 1) {
        if (filtered[i] > filtered[j]) {
          inversions += 1;
        }
      }
    }
    return inversions;
  };

  const isSolvable = (tiles: number[], size: number) => {
    const inversions = countInversions(tiles);
    if (size % 2 === 1) {
      return inversions % 2 === 0;
    }
    const emptyIndex = tiles.indexOf(tiles.length - 1);
    const emptyRowFromBottom = size - Math.floor(emptyIndex / size);
    if (emptyRowFromBottom % 2 === 0) {
      return inversions % 2 === 1;
    }
    return inversions % 2 === 0;
  };

  const isSolved = (tiles: number[]) =>
    tiles.every((value, index) => value === index);

  const createPuzzleTiles = (size: number) => {
    const total = size * size;
    const tiles = Array.from({ length: total }, (_, index) => index);
    let shuffled = tiles.slice();
    let attempts = 0;
    do {
      shuffled = tiles.slice().sort(() => Math.random() - 0.5);
      attempts += 1;
    } while (
      (isSolved(shuffled) || !isSolvable(shuffled, size)) &&
      attempts < 30
    );
    return shuffled;
  };

  const startPuzzle = () => {
    setScreen("puzzle");
    setPuzzleTiles(createPuzzleTiles(puzzleSize));
    setPuzzleSolved(false);
  };

  const startStates = () => {
    setScreen("states");
    setSelectedStates([]);
    setStatesSolved(false);
  };

  const handlePuzzleShuffle = () => {
    setPuzzleTiles(createPuzzleTiles(puzzleSize));
    setPuzzleSolved(false);
  };

  const handlePuzzleMove = (tileIndex: number) => {
    if (puzzleSolved) {
      return;
    }
    const emptyIndex = puzzleTiles.indexOf(puzzleTiles.length - 1);
    if (emptyIndex < 0) {
      return;
    }
    const tileRow = Math.floor(tileIndex / puzzleSize);
    const tileCol = tileIndex % puzzleSize;
    const emptyRow = Math.floor(emptyIndex / puzzleSize);
    const emptyCol = emptyIndex % puzzleSize;
    const isAdjacent =
      (Math.abs(tileRow - emptyRow) === 1 && tileCol === emptyCol) ||
      (Math.abs(tileCol - emptyCol) === 1 && tileRow === emptyRow);
    if (!isAdjacent) {
      return;
    }
    const updated = puzzleTiles.slice();
    [updated[tileIndex], updated[emptyIndex]] = [
      updated[emptyIndex],
      updated[tileIndex]
    ];
    setPuzzleTiles(updated);
    if (isSolved(updated)) {
      setPuzzleSolved(true);
    }
  };

  const handleStateClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    let node: HTMLElement | null = target;
    while (node && node !== statesMapRef.current) {
      const tag = node.tagName.toLowerCase();
      if (tag === "path" || tag === "polygon") {
        break;
      }
      node = node.parentElement;
    }
    if (!node || node === statesMapRef.current) {
      return;
    }
    const rawId = node.getAttribute("id") ?? "";
    const normalized =
      normalizeStateId(rawId) ||
      normalizeStateFromClasses(node.getAttribute("class"));
    if (!normalized) {
      return;
    }
    setSelectedStates((prev) => {
      if (prev.includes(normalized)) {
        return prev.filter((state) => state !== normalized);
      }
      return [...prev, normalized];
    });
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
    if (screen !== "puzzle") {
      return;
    }
    if (puzzleTiles.length > 0) {
      return;
    }
    setPuzzleTiles(createPuzzleTiles(puzzleSize));
    setPuzzleSolved(false);
  }, [screen, puzzleTiles.length, puzzleSize]);

  useEffect(() => {
    if (screen !== "states") {
      return;
    }
    if (statesSvg) {
      return;
    }
    setStatesLoading(true);
    setStatesLoadError(false);
    fetch(gameConfig.statesPuzzle.svgSrc)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load map");
        }
        return response.text();
      })
      .then((svgText) => {
        setStatesSvg(sanitizeStatesSvg(svgText));
      })
      .catch(() => {
        setStatesLoadError(true);
      })
      .finally(() => {
        setStatesLoading(false);
      });
  }, [screen, statesSvg]);

  useEffect(() => {
    const mapRoot = statesMapRef.current;
    if (!mapRoot) {
      return;
    }
    const shapes = mapRoot.querySelectorAll("path, polygon");
    shapes.forEach((shape) => {
      const rawId = shape.getAttribute("id") ?? "";
      const normalized =
        normalizeStateId(rawId) ||
        normalizeStateFromClasses(shape.getAttribute("class"));
      if (!normalized) {
        shape.classList.remove("selected");
        return;
      }
      if (selectedStates.includes(normalized)) {
        shape.classList.add("selected");
      } else {
        shape.classList.remove("selected");
      }
    });
  }, [selectedStates, statesSvg]);

  useEffect(() => {
    if (huntPath.length === 0) {
      setHuntStatus("idle");
    }
  }, [huntPath]);

  useEffect(() => {
    const required = gameConfig.statesPuzzle.requiredStates.map((state) =>
      state.toUpperCase()
    );
    const selected = selectedStates.map((state) => state.toUpperCase());
    const hasAll = required.every((state) => selected.includes(state));
    const noExtra = selected.every((state) => required.includes(state));
    setStatesSolved(hasAll && noExtra && required.length > 0);
  }, [selectedStates]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const remaining = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remaining}`;
  };

  const normalizeStateId = (rawId: string) => {
    if (!rawId) {
      return "";
    }
    const cleaned = rawId.toUpperCase();
    if (cleaned.length === 2) {
      return cleaned;
    }
    if (cleaned.includes("-")) {
      const parts = cleaned.split("-");
      return parts[parts.length - 1] ?? "";
    }
    return cleaned.slice(-2);
  };

  const normalizeStateFromClasses = (className: string | null) => {
    if (!className) {
      return "";
    }
    const match = className
      .split(/\s+/)
      .map((value) => value.trim().toUpperCase())
      .find((value) => value.length === 2);
    return match ?? "";
  };

  const sanitizeStatesSvg = (svgText: string) => {
    let cleaned = svgText
      .replace(/<\?xml[^>]*\?>/gi, "")
      .replace(/<!DOCTYPE[^>]*>/gi, "");
    const viewBoxMatch = cleaned.match(/viewBox=\"([0-9.\s-]+)\"/i);
    if (!viewBoxMatch) {
      const widthMatch = cleaned.match(/width=\"([0-9.]+)\"/i);
      const heightMatch = cleaned.match(/height=\"([0-9.]+)\"/i);
      if (widthMatch && heightMatch) {
        const viewBox = `viewBox=\"0 0 ${widthMatch[1]} ${heightMatch[1]}\"`;
        cleaned = cleaned.replace("<svg", `<svg ${viewBox}`);
      }
    }
    const normalizedViewBox = cleaned.match(/viewBox=\"([0-9.\s-]+)\"/i);
    if (normalizedViewBox) {
      const parts = normalizedViewBox[1].trim().split(/\s+/).map(Number);
      if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
        const [x, y, width, height] = parts;
        const padX = width * 0.05;
        const padY = height * 0.05;
        const expanded = `${x - padX} ${y - padY} ${width + padX * 2} ${
          height + padY * 2
        }`;
        cleaned = cleaned.replace(
          /viewBox=\"[0-9.\s-]+\"/i,
          `viewBox="${expanded}"`
        );
      }
    }
    cleaned = cleaned
      .replace(/\swidth=\"[^\"]*\"/i, "")
      .replace(/\sheight=\"[^\"]*\"/i, "");
    if (!/preserveAspectRatio=/i.test(cleaned)) {
      cleaned = cleaned.replace(
        "<svg",
        '<svg preserveAspectRatio="xMidYMid meet"'
      );
    }
    return cleaned;
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

  const handleWordleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (wordleStatus === "win" || wordleStatus === "lose") {
      return;
    }
    const guess = wordleInput.trim().toUpperCase();
    if (guess.length !== wordleSecret.length || !/^[A-Z]+$/.test(guess)) {
      setWordleStatus("invalid");
      return;
    }
    const updated = [...wordleGuesses, guess];
    setWordleGuesses(updated);
    setWordleInput("");
    if (guess === wordleSecret) {
      setWordleStatus("win");
      return;
    }
    if (updated.length >= wordleMaxAttempts) {
      setWordleStatus("lose");
      return;
    }
    setWordleStatus("idle");
  };

  const handleWordleRestart = () => {
    setWordleGuesses([]);
    setWordleInput("");
    setWordleStatus("idle");
  };

  const getWordleFeedback = (guess: string) => {
    const secret = wordleSecret.split("");
    const guessLetters = guess.split("");
    const result = Array(guessLetters.length).fill("absent");
    const remaining: Record<string, number> = {};
    secret.forEach((letter, index) => {
      if (guessLetters[index] === letter) {
        result[index] = "correct";
      } else {
        remaining[letter] = (remaining[letter] ?? 0) + 1;
      }
    });
    guessLetters.forEach((letter, index) => {
      if (result[index] === "correct") {
        return;
      }
      if (remaining[letter]) {
        result[index] = "present";
        remaining[letter] -= 1;
      }
    });
    return result as Array<"correct" | "present" | "absent">;
  };

  const wordleLetterStatus = useMemo(() => {
    const status: Record<string, "correct" | "present" | "absent"> = {};
    wordleGuesses.forEach((guess) => {
      const feedback = getWordleFeedback(guess);
      guess.split("").forEach((letter, index) => {
        const state = feedback[index];
        const current = status[letter];
        if (current === "correct") {
          return;
        }
        if (current === "present" && state === "absent") {
          return;
        }
        status[letter] = state;
      });
    });
    return status;
  }, [wordleGuesses, wordleSecret]);

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

  const handleFinalReset = () => {
    setFinalChoice("idle");
    setYesHover(false);
  };

  const handleFinalYes = () => {
    setFinalChoice("nope");
  };

  const handleFinalOfCourse = () => {
    setFinalChoice("of-course");
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
              Hello Kelly. Tap the states we&apos;ve visited, solve a quick Wordle,
              rebuild a photo, warm up with a word hunt, then solve each anagram
              to reveal a special message just for you.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-600">
                {totalPuzzles} puzzles
              </span>
              <span className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-600">
                US states
              </span>
              <span className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-600">
                5-letter Wordle
              </span>
              <span className="rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-600">
                Photo puzzle
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

        {screen === "wordle" && (
          <div className="flex w-full flex-col items-center gap-5">
            <div className="flex w-full items-center justify-between text-sm font-semibold text-rose-400">
              <span>Wordle Warm-up</span>
              <span>{wordleGuesses.length} / {wordleMaxAttempts} tries</span>
            </div>

            <div className="grid gap-2">
              {Array.from({ length: wordleMaxAttempts }).map((_, rowIndex) => {
                const guess = wordleGuesses[rowIndex] ?? "";
                const feedback = guess ? getWordleFeedback(guess) : [];
                return (
                  <div key={`row-${rowIndex}`} className="flex gap-2">
                    {Array.from({ length: wordleSecret.length }).map(
                      (_, colIndex) => {
                        const letter = guess[colIndex] ?? "";
                        const state = feedback[colIndex];
                        const style =
                          state === "correct"
                            ? "bg-rose-500 text-white border-rose-500"
                            : state === "present"
                              ? "bg-amber-300 text-white border-amber-300"
                              : guess
                                ? "bg-rose-100 text-rose-400 border-rose-200"
                                : "bg-white text-rose-400 border-rose-200";
                        return (
                          <div
                            key={`cell-${rowIndex}-${colIndex}`}
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 text-lg font-bold uppercase ${style}`}
                          >
                            {letter}
                          </div>
                        );
                      },
                    )}
                  </div>
                );
              })}
            </div>

            {wordleStatus !== "idle" && (
              <div className="rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">
                {wordleStatus === "invalid" &&
                  `Enter a ${wordleSecret.length}-letter word.`}
                {wordleStatus === "win" && "Perfect! Ready for the puzzle."}
                {wordleStatus === "lose" &&
                  `Out of tries. The word was ${wordleSecret}.`}
              </div>
            )}

            <div className="flex w-full flex-col items-center gap-2">
              {["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map((row) => (
                <div key={row} className="flex flex-wrap justify-center gap-2">
                  {row.split("").map((letter) => {
                    const state = wordleLetterStatus[letter];
                    const style =
                      state === "correct"
                        ? "bg-rose-500 text-white"
                        : state === "present"
                          ? "bg-amber-300 text-white"
                          : state === "absent"
                            ? "bg-rose-100 text-rose-300"
                            : "bg-white text-rose-500";
                    return (
                      <span
                        key={letter}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 text-sm font-semibold ${style}`}
                      >
                        {letter}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>

            {wordleStatus !== "win" && wordleStatus !== "lose" && (
              <form
                onSubmit={handleWordleSubmit}
                className="flex w-full flex-col gap-3"
              >
                <input
                  value={wordleInput}
                  onChange={(event) => {
                    setWordleInput(event.target.value.toUpperCase());
                    setWordleStatus("idle");
                  }}
                  maxLength={wordleSecret.length}
                  placeholder="Type your guess"
                  className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-center text-lg font-semibold text-rose-700 shadow-sm outline-none transition focus:border-rose-400"
                />
                <button
                  type="submit"
                  className="rounded-full bg-rose-500 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-rose-600"
                >
                  Submit guess
                </button>
              </form>
            )}

            {wordleStatus === "win" && (
              <button
                className="rounded-full bg-rose-500 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-rose-600"
                onClick={startPuzzle}
              >
                Start the puzzle
              </button>
            )}

            {wordleStatus === "lose" && (
              <button
                className="rounded-full bg-rose-500 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-rose-600"
                onClick={handleWordleRestart}
              >
                Try again
              </button>
            )}
          </div>
        )}

        {screen === "puzzle" && (
          <div className="flex w-full flex-col items-center gap-5">
            <div className="flex w-full items-center justify-between text-sm font-semibold text-rose-400">
              <span>Photo Puzzle</span>
              <span>{puzzleSize}x{puzzleSize} grid</span>
            </div>

            <div className="w-full rounded-3xl bg-rose-50 p-4 shadow-inner">
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${puzzleSize}, minmax(0, 1fr))`
                }}
              >
                {puzzleTiles.map((value, index) => {
                  const isEmpty = value === puzzleTiles.length - 1;
                  const row = Math.floor(value / puzzleSize);
                  const col = value % puzzleSize;
                  const positionX =
                    puzzleSize === 1 ? 0 : (col / (puzzleSize - 1)) * 100;
                  const positionY =
                    puzzleSize === 1 ? 0 : (row / (puzzleSize - 1)) * 100;
                  return (
                    <button
                      key={`tile-${value}-${index}`}
                      type="button"
                      onClick={() => handlePuzzleMove(index)}
                      className={`aspect-square rounded-2xl border-2 transition ${
                        isEmpty
                          ? "border-transparent bg-transparent"
                          : "border-rose-200 shadow-sm hover:scale-[1.01]"
                      }`}
                      style={
                        isEmpty
                          ? undefined
                          : {
                              backgroundImage: `url(${gameConfig.slidingPuzzle.imageSrc})`,
                              backgroundSize: `${puzzleSize * 100}% ${
                                puzzleSize * 100
                              }%`,
                              backgroundPosition: `${positionX}% ${positionY}%`
                            }
                      }
                      aria-label={isEmpty ? "Empty tile" : "Puzzle tile"}
                    />
                  );
                })}
              </div>
            </div>

            {puzzleSolved ? (
              <div className="flex w-full flex-col items-center gap-3">
                <p className="text-sm font-semibold text-rose-500">
                  You rebuilt the photo! Ready for the word hunt.
                </p>
                <button
                  className="rounded-full bg-rose-500 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-rose-600"
                  onClick={startHunt}
                >
                  Start the word hunt
                </button>
              </div>
            ) : (
              <div className="flex w-full flex-col items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">
                  Slide tiles to complete the picture
                </p>
                <button
                  className="rounded-full bg-rose-100 px-6 py-2 text-sm font-semibold text-rose-600 shadow-md transition hover:bg-rose-200"
                  onClick={handlePuzzleShuffle}
                >
                  Shuffle
                </button>
              </div>
            )}
          </div>
        )}

        {screen === "states" && (
          <div className="flex w-full flex-col items-center gap-5">
            <div className="flex w-full items-center justify-between text-sm font-semibold text-rose-400">
              <span>States We&apos;ve Been To</span>
              <span>Tap the map</span>
            </div>

            <p className="text-sm text-rose-500">
              Click the states we&apos;ve visited together to continue. Think
              about it deeply.
            </p>

            <div className="w-full rounded-3xl bg-rose-50 p-4 shadow-inner">
              {statesLoading && (
                <p className="text-center text-sm font-semibold text-rose-400">
                  Loading map...
                </p>
              )}
              {statesLoadError && (
                <p className="text-center text-sm font-semibold text-rose-400">
                  Map failed to load. Make sure `public/us-states.svg` exists.
                </p>
              )}
              {!statesLoading && !statesLoadError && (
                <div
                  ref={statesMapRef}
                  className="usa-map"
                  onClick={handleStateClick}
                  role="img"
                  aria-label="United States map with clickable states"
                  dangerouslySetInnerHTML={{ __html: statesSvg }}
                />
              )}
            </div>

            <div className="flex w-full flex-wrap justify-center gap-2 text-xs font-semibold text-rose-500">
              {selectedStates.length === 0 && (
                <span className="text-rose-300">No states selected yet</span>
              )}
              {selectedStates.map((abbr) => (
                <span
                  key={abbr}
                  className="rounded-full bg-rose-200 px-3 py-1 text-rose-700"
                >
                  {stateNames[abbr] ?? abbr}
                </span>
              ))}
            </div>

            {statesSolved && (
              <button
                className="rounded-full bg-rose-500 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-rose-600"
                onClick={startWordle}
              >
                Start Wordle
              </button>
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

            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="rounded-full bg-rose-500 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-rose-600"
                  onMouseEnter={() => setYesHover(true)}
                  onMouseLeave={() => setYesHover(false)}
                  onClick={handleFinalYes}
                >
                  {yesHover ? "No" : "Yes 💘"}
                </button>
                <button
                  className="rounded-full bg-rose-200 px-6 py-3 text-base font-semibold text-rose-700 shadow-md transition hover:bg-rose-300"
                  onClick={handleFinalOfCourse}
                >
                  Of course 💘
                </button>
              </div>

              {finalChoice === "nope" && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm font-semibold text-rose-500">
                    WOW, can&apos;t believe you :(
                  </p>
                  <button
                    className="rounded-full bg-rose-100 px-6 py-2 text-sm font-semibold text-rose-700 shadow-md transition hover:bg-rose-200"
                    onClick={handleFinalReset}
                  >
                    Choose again
                  </button>
                </div>
              )}

              {finalChoice === "of-course" && (
                <div className="confetti-hearts pointer-events-none">
                  {Array.from({ length: 20 }).map((_, index) => (
                    <span
                      key={`confetti-${index}`}
                      className="confetti-heart"
                      style={{
                        left: `${5 + index * 4.5}%`,
                        animationDelay: `${index * 0.08}s`
                      }}
                    >
                      ❤
                    </span>
                  ))}
                </div>
              )}
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
