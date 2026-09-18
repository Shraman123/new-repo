import type { CalcParamFile, DirectoryFile, SchemeCard } from "./schema";
import type { LoadedFile } from "./load";

export interface ValidationIssue {
  file: string;
  message: string;
}

// Every rule or figure that carries a value must cite the page it came from.
export function checkCardCitations(card: SchemeCard): string[] {
  const issues: string[] = [];
  for (const [i, rule] of card.eligibility.entries()) {
    if (rule.value !== null && rule.page === null) {
      issues.push(`eligibility[${i}] ("${rule.rule_en}") has a value but no source page`);
    }
  }
  const { benefit } = card;
  if ((benefit.percent !== null || benefit.cap_inr !== null) && benefit.page === null) {
    issues.push(`benefit has a percent/cap but no source page`);
  }
  for (const [i, doc] of card.documents.entries()) {
    if (doc.name_bn.trim() !== "" && doc.page === null) {
      issues.push(`documents[${i}] ("${doc.name_bn}") has no source page`);
    }
  }
  return issues;
}

export function checkDuplicateCardIds(cards: LoadedFile<SchemeCard>[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, string>();
  for (const { file, data } of cards) {
    const prevFile = seen.get(data.id);
    if (prevFile) {
      issues.push({ file, message: `duplicate id "${data.id}" (already used in ${prevFile})` });
    } else {
      seen.set(data.id, file);
    }
  }
  return issues;
}

export function checkParamCitations(paramFile: CalcParamFile): string[] {
  const issues: string[] = [];
  for (const [name, param] of Object.entries(paramFile.params)) {
    if (param.value !== null && param.page_or_note.trim() === "" && param.source.trim() === "") {
      issues.push(`param "${name}" has a value but no source or page/note`);
    }
  }
  return issues;
}

export function checkDuplicateBlocks(files: LoadedFile<DirectoryFile>[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, string>();
  for (const { file, data } of files) {
    for (const block of data.blocks) {
      const key = `${data.district}/${block.block}`;
      const prevFile = seen.get(key);
      if (prevFile) {
        issues.push({ file, message: `duplicate district/block "${key}" (already used in ${prevFile})` });
      } else {
        seen.set(key, file);
      }
    }
  }
  return issues;
}
