import { TodoComment } from '../types';
import { IndexEntry, SidecarIndex } from './SidecarIndex';

export type MatchResult =
  | { kind: 'matched'; entry: IndexEntry }
  | { kind: 'new' }
  | { kind: 'ambiguous'; candidates: IndexEntry[] };

const SIMILARITY_THRESHOLD = 0.85;

export class FuzzyMatcher {
  constructor(private readonly index: SidecarIndex) {}

  match(todo: TodoComment): MatchResult {
    // 1. Stable code ID — rock-solid match.
    if (todo.id) {
      const entry = this.index.findByCodeId(todo.id);
      if (entry) return { kind: 'matched', entry };
    }

    // 2. Exact text + same file.
    const exact = this.index.findByTextAndFile(todo.text, todo.file);
    if (exact) return { kind: 'matched', entry: exact };

    // 3. Fuzzy: all entries in the same file above the similarity threshold.
    const candidates = this.index
      .all()
      .filter(
        e =>
          e.file === todo.file &&
          similarity(normalise(todo.text), normalise(e.text)) >= SIMILARITY_THRESHOLD,
      );

    if (candidates.length === 1) return { kind: 'matched', entry: candidates[0] };
    if (candidates.length > 1) return { kind: 'ambiguous', candidates };

    return { kind: 'new' };
  }
}

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalised Levenshtein similarity in [0, 1].
 * Returns 1 for identical strings, 0 for completely different ones.
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function levenshtein(a: string, b: string): number {
  // Fast-path: only compare up to the first 200 chars to keep it O(n²) bounded.
  const s = a.slice(0, 200);
  const t = b.slice(0, 200);
  const m = s.length;
  const n = t.length;

  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] =
        s[i - 1] === t[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}
