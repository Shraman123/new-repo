import type Anthropic from "@anthropic-ai/sdk";

// Matches the tool table in CLAUDE.md. Every scheme fact, number, document
// or office detail the agent states must come from one of these tool
// results this turn (enforced by the number-check guardrail).
export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "find_schemes",
    description:
      "Finds government schemes that might match the user's profile so far. Returns the top matches with why each matched, plus which profile fields would sharpen the match.",
    input_schema: {
      type: "object",
      properties: {
        district: { type: "string" },
        block: { type: "string" },
        farm_type: { type: "string", enum: ["layer", "broiler_owned", "broiler_contract", "duck", "desi", "undecided"] },
        capital_band: { type: "string", enum: ["under_50k", "50k_2l", "2l_5l", "over_5l"] },
        space_band: { type: "string", enum: ["backyard", "small_plot", "large_plot", "unknown"] },
        prior_experience: { type: "boolean" },
        social_category: { type: "string" },
        gender: { type: "string" },
        age: { type: "number" },
      },
    },
  },
  {
    name: "check_eligibility",
    description: "Checks whether the user is eligible/likely/not_eligible/unknown for one specific scheme, with reasons and page citations.",
    input_schema: {
      type: "object",
      properties: {
        scheme_id: { type: "string" },
        district: { type: "string" },
        block: { type: "string" },
        farm_type: { type: "string" },
        capital_band: { type: "string" },
        space_band: { type: "string" },
        prior_experience: { type: "boolean" },
        social_category: { type: "string" },
        gender: { type: "string" },
        age: { type: "number" },
      },
      required: ["scheme_id"],
    },
  },
  {
    name: "estimate_farm",
    description:
      "Computes capex, monthly opex/revenue, and break-even month for low/base/high scenarios for a poultry farm. Never estimate these numbers yourself — always call this tool.",
    input_schema: {
      type: "object",
      properties: {
        farm_type: { type: "string", enum: ["layer", "broiler_owned", "broiler_contract"] },
        flock_size: { type: "number", description: "Number of birds, if the user gave one." },
        capital_band: { type: "string", enum: ["under_50k", "50k_2l", "2l_5l", "over_5l"] },
      },
      required: ["farm_type"],
    },
  },
  {
    name: "get_documents",
    description: "Returns the document checklist for one scheme, with page citations.",
    input_schema: {
      type: "object",
      properties: { scheme_id: { type: "string" } },
      required: ["scheme_id"],
    },
  },
  {
    name: "get_office",
    description: "Looks up the block office contact for a district/block.",
    input_schema: {
      type: "object",
      properties: {
        district: { type: "string" },
        block: { type: "string" },
      },
      required: ["district", "block"],
    },
  },
  {
    name: "log_event",
    description: "Records a non-PII funnel event (e.g. onboarding_done, result_seen). Never pass names, phone numbers, or other personal data.",
    input_schema: {
      type: "object",
      properties: {
        stage: { type: "string" },
        data: { type: "object" },
      },
      required: ["stage"],
    },
  },
];
