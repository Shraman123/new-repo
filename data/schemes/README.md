# Scheme cards

One YAML file per scheme or scheme component, matching the shape in
`docs/SPEC.md` §5 and validated by `lib/schemes/schema.ts` /
`npm run validate-data`.

Empty until Phase 1's manual step: official PDFs are downloaded into
`data/sources/`, then cards are drafted from them with `verified: false`,
then checked by a human against `docs/VERIFY.md` and marked `verified: true`.
No card here may contain a number or rule that isn't cited to a source file
and page.
