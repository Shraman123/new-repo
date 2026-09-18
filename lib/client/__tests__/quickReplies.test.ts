import { describe, expect, it } from "vitest";
import { parseQuickReplies } from "../quickReplies";

describe("parseQuickReplies", () => {
  it("extracts each bracketed option in order", () => {
    expect(parseQuickReplies("রাজি আছেন? [হ্যাঁ, রাজি] [না]")).toEqual(["হ্যাঁ, রাজি", "না"]);
  });

  it("returns an empty list when there are no brackets", () => {
    expect(parseQuickReplies("আপনার ব্লক অফিসে যোগাযোগ করুন।")).toEqual([]);
  });
});
