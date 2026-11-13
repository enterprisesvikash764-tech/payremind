import { describe, it, expect } from "vitest";
import { trialDaysLeft, TRIAL_DAYS, PRICE_PER_MONTH } from "@/routes/index";
const DAY = 864e5;
describe("trial", () => {
  it("is 60 days", () => expect(TRIAL_DAYS).toBe(60));
  it("costs ₹30/month after", () => expect(PRICE_PER_MONTH).toBe(30));
  it("shows 60 left on day 0", () => expect(trialDaysLeft(0, 0)).toBe(60));
  it("shows 0 after 60 days", () => expect(trialDaysLeft(0, 60 * DAY)).toBe(0));
  it("shows 1 left on day 59", () => expect(trialDaysLeft(0, 59 * DAY)).toBe(1));
});
