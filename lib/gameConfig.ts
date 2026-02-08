export type GameMode = "phrase-build" | "token-reveal";

export const gameConfig = {
  mode: "phrase-build" as GameMode,
  playerName: "My Love",
  accent: "rose",
  totalHearts: 5,
  slidingPuzzle: {
    imageSrc: "/A867074F-2C83-4C0E-A372-BEC5FCEB261D.JPG",
    gridSize: 3,
  },
  statesPuzzle: {
    svgSrc: "/us-states.svg",
    requiredStates: ["WA", "TX", "IL", "MA", "OR", "MO", "AR"],
  },
  wordHunt: {
    timerSeconds: 90,
    minWordLength: 3,
    maxWordLength: 12,
    targetPoints: 2500,
  },
};
