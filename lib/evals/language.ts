export type ScriptGuess = "bn" | "hi" | "en" | "mixed";

/** Guesses which script a reply is written in, by character-class share. Good enough for eval checks, not a real language detector. */
export function detectScript(text: string): ScriptGuess {
  const bn = (text.match(/[ঀ-৿]/g) ?? []).length;
  const hi = (text.match(/[ऀ-ॿ]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const total = bn + hi + latin;
  if (total === 0) return "mixed";
  if (bn / total > 0.5) return "bn";
  if (hi / total > 0.5) return "hi";
  if (latin / total > 0.5) return "en";
  return "mixed";
}
