import { loadCalcParams, loadDirectory, loadSchemeCards } from "../lib/schemes/load";
import {
  checkCardCitations,
  checkDuplicateBlocks,
  checkDuplicateCardIds,
  checkParamCitations,
} from "../lib/schemes/validate";

let failed = false;

function fail(file: string, message: string) {
  failed = true;
  console.error(`✗ ${file}: ${message}`);
}

function main() {
  const schemes = loadSchemeCards();
  for (const err of schemes.errors) fail(err.file, err.message);
  for (const issue of checkDuplicateCardIds(schemes.ok)) fail(issue.file, issue.message);
  for (const { file, data } of schemes.ok) {
    for (const message of checkCardCitations(data)) fail(file, message);
  }

  const params = loadCalcParams();
  for (const err of params.errors) fail(err.file, err.message);
  for (const { file, data } of params.ok) {
    for (const message of checkParamCitations(data)) fail(file, message);
  }

  const directory = loadDirectory();
  for (const err of directory.errors) fail(err.file, err.message);
  for (const issue of checkDuplicateBlocks(directory.ok)) fail(issue.file, issue.message);

  const totalChecked = schemes.ok.length + params.ok.length + directory.ok.length;
  if (failed) {
    console.error(`\nvalidate-data: FAILED (${totalChecked} file(s) checked)`);
    process.exit(1);
  }
  console.log(`validate-data: OK (${totalChecked} file(s) checked)`);
}

main();
