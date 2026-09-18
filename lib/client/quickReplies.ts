/** Extracts "[option]" groups the agent appends to offer tappable quick replies (see lib/agent/prompt.ts). */
export function parseQuickReplies(text: string): string[] {
  return [...text.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim()).filter((s) => s.length > 0);
}
