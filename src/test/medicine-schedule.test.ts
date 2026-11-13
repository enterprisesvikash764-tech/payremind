import { describe, expect, it } from "vitest";
import { buildMedicineSchedule, medicineBatchSchema } from "@/lib/medicine-schedule";
import { isReminderDue, nextOccurrence } from "@/lib/health";

const input = { title: "Meri BP dawa", notes: "Khane ke baad", date: "2030-01-10", times: ["08:00", "13:00", "18:00", "22:00"], recurrence: "daily" as const, timezone: "UTC" };
describe("Customer's medicine schedule", () => {
  it("keeps the customer's medicine name and instructions at all four chosen times", () => {
    const rows = buildMedicineSchedule(input, 0);
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => new Date(r.due_at).getHours())).toEqual([8, 13, 18, 22]);
    expect(rows.every((r) => r.title === "Meri BP dawa" && r.notes === "Khane ke baad" && r.recurrence === "daily")).toBe(true);
  });
  it("is not due before the entered time and is due at that time", () => {
    const r = { ...buildMedicineSchedule(input, 0)[0], id: "test", completed: false, last_notified_at: null };
    if (!r.due_at) throw new Error("Missing reminder");
    expect(isReminderDue(r as Parameters<typeof isReminderDue>[0], Date.parse(r.due_at) - 1)).toBe(false);
    expect(isReminderDue(r as Parameters<typeof isReminderDue>[0], Date.parse(r.due_at))).toBe(true);
  });
  it("repeats daily at the same chosen time", () => {
    expect(nextOccurrence("2030-01-10T08:00:00Z", "daily", "UTC", Date.parse("2030-01-10T08:00:00Z"))).toBe("2030-01-11T08:00:00.000Z");
  });
  it("requires at least one chosen time", () => {
    expect(() => buildMedicineSchedule({ ...input, times: [] }, 0)).toThrow();
  });
  it("rejects duplicate times", () => {
    expect(() => buildMedicineSchedule({ ...input, times: ["08:00", "08:00"] }, 0)).toThrow();
  });
  it("does not accept other health categories in a medicine batch", () => {
    const rows = buildMedicineSchedule(input, 0);
    expect(medicineBatchSchema.safeParse({ reminders: rows.map((r) => ({ ...r, category: "bp" })) }).success).toBe(false);
  });
});