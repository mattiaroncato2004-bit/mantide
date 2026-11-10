// Reads Gemma's answer. Kept free of native modules so it can be tested in Node
// (scripts/test-parse.ts).
import { INTEREST_IDS, type InterestId } from './interests';

export type Analysis = { scene: string; interests: InterestId[] };

// Keeps only what we can trust: the first {...} block, known interest ids, no duplicates.
export function parseAnswer(text: string): Analysis | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[0]);
    const interests = [...new Set<string>(Array.isArray(raw.interests) ? raw.interests : [])]
      .filter((id): id is InterestId => (INTEREST_IDS as readonly string[]).includes(id))
      .slice(0, 3);
    if (!interests.length) return null;
    return { scene: String(raw.scene ?? '').slice(0, 80), interests };
  } catch {
    return null;
  }
}
