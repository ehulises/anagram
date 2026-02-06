export type GameMode = "phrase-build" | "token-reveal";

export const gameConfig = {
  mode: "phrase-build" as GameMode,
  playerName: "My Love",
  accent: "rose",
  totalHearts: 5,
  wordHunt: {
    timerSeconds: 90,
    minWordLength: 3,
    maxWordLength: 12,
    targetPoints: 2500
  }
};
