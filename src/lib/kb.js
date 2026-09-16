const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "is", "are",
  "was", "were", "i", "you", "my", "your", "it", "this", "that", "with",
  "have", "has", "not", "be", "as", "at", "from", "but", "if", "so", "we",
  "us", "our", "me", "he", "she", "they", "them", "will", "would", "can",
  "could", "do", "does", "did", "been", "being", "there", "what", "when",
  "where", "how", "just", "about",
]);

function tokenize(str) {
  const matches = (str || "").toLowerCase().match(/[a-z0-9']+/g);
  return (matches || []).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function scoreEntry(queryTokens, entry) {
  const entryTokens = tokenize(`${entry.title} ${entry.content}`);
  let score = 0;
  for (const t of entryTokens) {
    if (queryTokens.has(t)) score += 1;
  }
  return score;
}

export function getRelevantKb(message, extraContext, kbEntries, topN = 10) {
  if (kbEntries.length <= topN) return kbEntries;
  const queryTokens = new Set(tokenize(`${message} ${extraContext || ""}`));
  return kbEntries
    .map((entry) => ({ entry, score: scoreEntry(queryTokens, entry) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((x) => x.entry);
}

export function truncate(str, n) {
  if (!str) return "";
  return str.length > n ? `${str.slice(0, n).trim()}…` : str;
}
