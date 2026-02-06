import { gameConfig } from "./gameConfig";

export type WordHuntTile = {
  id: number;
  letter: string;
  row: number;
  col: number;
};

export const wordHuntConfig = {
  gridSize: 5,
  timerSeconds: gameConfig.wordHunt.timerSeconds,
  minWordLength: gameConfig.wordHunt.minWordLength,
  maxWordLength: gameConfig.wordHunt.maxWordLength,
  targetPoints: gameConfig.wordHunt.targetPoints
};

const letterFrequencies: Array<{ letter: string; weight: number }> = [
  { letter: "E", weight: 16 },
  { letter: "A", weight: 12 },
  { letter: "I", weight: 12 },
  { letter: "O", weight: 10 },
  { letter: "U", weight: 8 },
  { letter: "N", weight: 7 },
  { letter: "R", weight: 7 },
  { letter: "T", weight: 7 },
  { letter: "L", weight: 6 },
  { letter: "S", weight: 6 },
  { letter: "D", weight: 5 },
  { letter: "G", weight: 4 },
  { letter: "B", weight: 3 },
  { letter: "C", weight: 3 },
  { letter: "M", weight: 3 },
  { letter: "P", weight: 3 },
  { letter: "F", weight: 3 },
  { letter: "H", weight: 3 },
  { letter: "V", weight: 2 },
  { letter: "W", weight: 2 },
  { letter: "Y", weight: 2 },
  { letter: "K", weight: 1 },
  { letter: "J", weight: 1 },
  { letter: "X", weight: 1 },
  { letter: "Q", weight: 1 },
  { letter: "Z", weight: 1 }
];

const letterBag = letterFrequencies.flatMap(({ letter, weight }) =>
  Array.from({ length: weight }, () => letter)
);

const vowels = new Set(["A", "E", "I", "O", "U", "Y"]);

const countVowels = (tiles: WordHuntTile[]) =>
  tiles.reduce((total, tile) => (vowels.has(tile.letter) ? total + 1 : total), 0);

export const wordHuntDictionaryUrl =
  "https://cdn.jsdelivr.net/gh/david47k/top-english-wordlists@master/top_english_words_lower_50000.txt";

const wordHuntBanned = new Set([
  "AA",
  "AAA",
  "AAAA",
  "AAH",
  "AHA",
  "AH",
  "AHH",
  "EH",
  "EHH",
  "ER",
  "ERR",
  "MM",
  "MMM",
  "HMM",
  "HM",
  "OH",
  "OHH",
  "OOH",
  "UH",
  "UHH",
  "UM",
  "UMM",
  "YEA",
  "YEAH"
]);

export const normalizeWord = (value: string) =>
  value.replace(/[^A-Z]/gi, "").toUpperCase();

export const isDictionaryWord = (dictionary: Set<string>, value: string) =>
  dictionary.has(normalizeWord(value));

export const loadWordHuntDictionary = async () => {
  const response = await fetch(wordHuntDictionaryUrl);
  if (!response.ok) {
    throw new Error("Failed to load word list");
  }
  const text = await response.text();
  const words = text.split(/\r?\n/);
  const filtered = words
    .map((word) => word.trim().toUpperCase())
    .filter(Boolean)
    .filter((word) => /^[A-Z]+$/.test(word))
    .filter(
      (word) =>
        word.length >= wordHuntConfig.minWordLength &&
        word.length <= wordHuntConfig.maxWordLength
    )
    .filter((word) => !wordHuntBanned.has(word));
  return new Set(filtered);
};

export const createWordHuntGrid = (
  size: number = wordHuntConfig.gridSize
): WordHuntTile[] => {
  const total = size * size;
  const minVowels = size === 4 ? 6 : size === 5 ? 9 : Math.ceil(total * 0.33);
  const maxAttempts = 6;
  let attempt = 0;

  const buildTiles = () => {
    const tiles: WordHuntTile[] = [];
    for (let index = 0; index < total; index += 1) {
      const letter = letterBag[Math.floor(Math.random() * letterBag.length)];
      tiles.push({
        id: index,
        letter,
        row: Math.floor(index / size),
        col: index % size
      });
    }
    return tiles;
  };

  let tiles = buildTiles();
  while (attempt < maxAttempts && countVowels(tiles) < minVowels) {
    tiles = buildTiles();
    attempt += 1;
  }

  return tiles;
};

export const getWordHuntScore = (word: string) => {
  const length = normalizeWord(word).length;
  if (length < wordHuntConfig.minWordLength) {
    return 0;
  }
  if (length >= 8) {
    return 900;
  }
  if (length === 7) {
    return 700;
  }
  if (length === 6) {
    return 500;
  }
  if (length === 5) {
    return 350;
  }
  if (length === 4) {
    return 200;
  }
  return 100;
};
