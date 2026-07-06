// ─── Text similarity utilities for the Plagiarism Checker ─────────────────────

const SHINGLE_SIZE = 2; // Bigrams 
const MIN_TOKENS_FOR_COMPARISON = 2; 
const MIN_MATCH_SHINGLES = 2; 
const MAX_EXCERPT_SECTIONS = 3; 

// Strip absolutely everything except letters and numbers. 
// This destroys formatting traps entirely.
export const tokenize = (text) => {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ") // Only keep alphanumeric
    .split(/\s+/) // Split on any whitespace
    .filter(Boolean); // Remove empty strings
};

export const buildShingleSet = (tokens, k = SHINGLE_SIZE) => {
  const set = new Set();
  for (let i = 0; i <= tokens.length - k; i++) {
    set.add(tokens.slice(i, i + k).join(" "));
  }
  return set;
};

export const findMatchedSections = (tokensA, tokensB, k = SHINGLE_SIZE) => {
  const shinglesB = buildShingleSet(tokensB, k);
  const matchedStartIndices = [];

  for (let i = 0; i <= tokensA.length - k; i++) {
    const shingle = tokensA.slice(i, i + k).join(" ");
    if (shinglesB.has(shingle)) matchedStartIndices.push(i);
  }

  if (matchedStartIndices.length === 0) return [];

  const runs = [];
  let runStart = matchedStartIndices[0];
  let runEnd = runStart + k;

  for (let idx = 1; idx < matchedStartIndices.length; idx++) {
    const start = matchedStartIndices[idx];
    if (start <= runEnd) {
      runEnd = Math.max(runEnd, start + k);
    } else {
      runs.push([runStart, runEnd]);
      runStart = start;
      runEnd = start + k;
    }
  }
  runs.push([runStart, runEnd]);

  const significant = runs
    .filter(([s, e]) => e - s >= MIN_MATCH_SHINGLES + k - 1)
    .sort(([s1, e1], [s2, e2]) => (e2 - s2) - (e1 - s1))
    .slice(0, MAX_EXCERPT_SECTIONS);

  return significant.map(([s, e]) => {
    return {
      excerpt: tokensA.slice(s, e).join(" "),
      similarity: 100, 
    };
  });
};

export const compareTexts = (textA, textB) => {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length < MIN_TOKENS_FOR_COMPARISON || tokensB.length < MIN_TOKENS_FOR_COMPARISON) {
    return null;
  }

  // DIAGNOSTIC LOGGING: See exactly what the engine is reading
  console.log(`\n--- ENGINE COMPARISON ---`);
  console.log(`Doc A start: "${tokensA.slice(0, 10).join(" ")}..."`);
  console.log(`Doc B start: "${tokensB.slice(0, 10).join(" ")}..."`);

  const setA = buildShingleSet(tokensA);
  const setB = buildShingleSet(tokensB);

  if (setA.size === 0 || setB.size === 0) return { similarity: 0, matchedSections: [] };

  let intersection = 0;
  for (const shingle of setA) {
    if (setB.has(shingle)) intersection++;
  }

  const minSize = Math.min(setA.size, setB.size);
  const similarity = Math.round((intersection / minSize) * 100);

  console.log(`Result: Doc A (${setA.size} chunks) vs Doc B (${setB.size} chunks) | Shared: ${intersection} | Score: ${similarity}%\n`);

  const matchedSections = similarity > 0 ? findMatchedSections(tokensA, tokensB) : [];

  return { similarity, matchedSections };
};

export const MIN_TOKENS = MIN_TOKENS_FOR_COMPARISON;