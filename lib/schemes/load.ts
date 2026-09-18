import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load as parseYaml } from "js-yaml";
import type { z } from "zod";
import {
  CalcParamFileSchema,
  DirectoryFileSchema,
  SchemeCardSchema,
  type CalcParamFile,
  type DirectoryFile,
  type SchemeCard,
} from "./schema";

export interface LoadedFile<T> {
  file: string;
  data: T;
}

export interface LoadError {
  file: string;
  message: string;
}

export interface LoadResult<T> {
  ok: LoadedFile<T>[];
  errors: LoadError[];
}

function yamlFilesIn(dir: string): string[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((name) => name.endsWith(".yaml") || name.endsWith(".yml"))
    .map((name) => join(dir, name))
    .sort();
}

function loadDir<T>(dir: string, schema: z.ZodType<T>): LoadResult<T> {
  const ok: LoadedFile<T>[] = [];
  const errors: LoadError[] = [];
  for (const file of yamlFilesIn(dir)) {
    let raw: unknown;
    try {
      raw = parseYaml(readFileSync(file, "utf8"));
    } catch (err) {
      errors.push({ file, message: `invalid YAML: ${(err as Error).message}` });
      continue;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ file, message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
      continue;
    }
    ok.push({ file, data: parsed.data });
  }
  return { ok, errors };
}

export function loadSchemeCards(dir = "data/schemes"): LoadResult<SchemeCard> {
  return loadDir(dir, SchemeCardSchema);
}

export function loadCalcParams(dir = "data/params"): LoadResult<CalcParamFile> {
  return loadDir(dir, CalcParamFileSchema);
}

export function loadDirectory(dir = "data/directory"): LoadResult<DirectoryFile> {
  return loadDir(dir, DirectoryFileSchema);
}
