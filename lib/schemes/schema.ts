import { z } from "zod";

export const ProfileFieldSchema = z.enum([
  "age",
  "district",
  "block",
  "farm_type",
  "capital_band",
  "space_band",
  "prior_experience",
  "social_category",
  "gender",
  "manual",
]);

export const EligibilityOpSchema = z.enum([
  "eq",
  "in",
  "gte",
  "lte",
  "between",
  "manual",
]);

export const EligibilityRuleSchema = z.object({
  rule_en: z.string(),
  rule_bn: z.string(),
  field: ProfileFieldSchema,
  op: EligibilityOpSchema,
  value: z.unknown().nullable(),
  page: z.number().int().positive().nullable(),
});

export const BenefitTypeSchema = z.enum([
  "capital_subsidy",
  "interest_subvention",
  "loan",
  "training",
  "other",
]);

export const BenefitSchema = z.object({
  type: BenefitTypeSchema,
  summary_bn: z.string(),
  percent: z.number().min(0).max(100).nullable(),
  cap_inr: z.number().nonnegative().nullable(),
  page: z.number().int().positive().nullable(),
});

export const DocumentSchema = z.object({
  name_bn: z.string(),
  page: z.number().int().positive().nullable(),
});

export const SchemeCardSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be kebab-case, e.g. pm-poultry-venture"),
  name_bn: z.string(),
  name_en: z.string(),
  level: z.enum(["central", "state"]),
  status: z.enum(["active", "closed", "unknown"]),
  source: z.object({
    file: z.string(),
    url: z.string(),
    retrieved_on: z.string(),
  }),
  eligibility: z.array(EligibilityRuleSchema),
  benefit: BenefitSchema,
  documents: z.array(DocumentSchema),
  apply_via: z.string(),
  verified: z.boolean(),
  verified_by: z.string(),
  verified_on: z.string(),
  notes: z.array(z.string()).default([]),
});

export type SchemeCard = z.infer<typeof SchemeCardSchema>;

export const CalcParamSchema = z.object({
  value: z.number().nullable(),
  unit: z.string(),
  low: z.number().nullable(),
  high: z.number().nullable(),
  source: z.string(),
  page_or_note: z.string(),
  verified: z.boolean(),
});

export type CalcParam = z.infer<typeof CalcParamSchema>;

export const FarmTypeSchema = z.enum(["layer", "broiler_owned", "broiler_contract"]);

export const CalcParamFileSchema = z.object({
  farm_type: FarmTypeSchema,
  params: z.record(z.string(), CalcParamSchema),
});

export type CalcParamFile = z.infer<typeof CalcParamFileSchema>;

export const OfficeBlockSchema = z.object({
  block: z.string(),
  office_bn: z.string(),
  address: z.string(),
  phone: z.string(),
  source: z.string(),
  verified: z.boolean(),
});

export const DirectoryFileSchema = z.object({
  district: z.string(),
  blocks: z.array(OfficeBlockSchema),
});

export type DirectoryFile = z.infer<typeof DirectoryFileSchema>;
