# Calculator parameters

One YAML file per farm type (`layer.yaml`, `broiler_owned.yaml`,
`broiler_contract.yaml`), matching the shape in `docs/SPEC.md` §5 and
validated by `lib/schemes/schema.ts` / `npm run validate-data`.

Every parameter is `{ value, unit, low, high, source, page_or_note, verified }`.
Values start as `null` with a `TODO` source — filled from official extension
material, district ARD offices, or farmer interviews (`source:
field-interview-<date>`, `verified: false` until cross-checked). Never invent
a value.
