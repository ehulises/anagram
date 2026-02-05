export type Puzzle = {
  id: string;
  answer: string;
  clue: string;
  reward: string;
};

export const phraseBuildPuzzles: Puzzle[] = [
  {
    id: "will",
    answer: "WILL",
    clue: "A gentle promise for tomorrow.",
    reward: "WILL"
  },
  {
    id: "you",
    answer: "YOU",
    clue: "The sweetest word I know.",
    reward: "YOU"
  },
  {
    id: "be",
    answer: "BE",
    clue: "To exist, to stay, to choose.",
    reward: "BE"
  },
  {
    id: "my",
    answer: "MY",
    clue: "A tiny word, a big feeling.",
    reward: "MY"
  },
  {
    id: "valentine",
    answer: "VALENTINE",
    clue: "The title I hope you claim.",
    reward: "VALENTINE"
  }
];

export const tokenRevealPuzzles: Puzzle[] = [
  {
    id: "sunshine",
    answer: "SUNSHINE",
    clue: "You brighten every morning.",
    reward: "Will"
  },
  {
    id: "laughter",
    answer: "LAUGHTER",
    clue: "My favorite sound from you.",
    reward: "you"
  },
  {
    id: "forever",
    answer: "FOREVER",
    clue: "The timeline I dream about.",
    reward: "be"
  },
  {
    id: "sparkle",
    answer: "SPARKLE",
    clue: "How you make my world feel.",
    reward: "my"
  },
  {
    id: "heart",
    answer: "HEART",
    clue: "Where you live with me.",
    reward: "Valentine?"
  }
];
