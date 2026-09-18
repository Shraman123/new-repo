import { describe, expect, it } from "vitest";
import { estimateFarm, PARAM_KEYS_BY_FARM_TYPE } from "../estimateFarm";
import { p } from "./testHelpers";

describe("estimateFarm", () => {
  it("reports which params are missing instead of guessing, per farm type", () => {
    const outcome = estimateFarm("layer", 100, {});
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.farmType).toBe("layer");
      expect(outcome.missing.sort()).toEqual([...PARAM_KEYS_BY_FARM_TYPE.layer].sort());
    }
  });

  it("dispatches to broiler_contract's param set", () => {
    const outcome = estimateFarm("broiler_contract", 100, {
      shed_cost_per_sqft: p(80),
    });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.missing).not.toContain("shed_cost_per_sqft");
      expect(outcome.missing).toContain("growing_charge_per_kg_inr");
    }
  });
});
