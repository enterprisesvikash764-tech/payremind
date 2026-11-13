import { z } from "zod";
import { nextOccurrence, reminderSchema, type ReminderInput } from "./health";

export const MEDICINE_PERIODS = [
  { id: "morning", label: "Subah" },
  { id: "day", label: "Dopahar / din" },
  { id: "evening", label: "Shaam" },
  { id: "night", label: "Raat" },
] as const;

export const medicineBatchSchema = z.object({
  reminders: z.array(reminderSchema).min(1).max(4),
}).superRefine(({ reminders }, ctx) => {
  if (reminders.some((r) => r.category !== "medicine")) ctx.addIssue({ code: "custom", message: "Sirf dawa ke waqt chuniye" });
  if (new Set(reminders.map((r) => r.due_at)).size !== reminders.length) ctx.addIssue({ code: "custom", message: "Har waqt alag rakhiye" });
});

export function buildMedicineSchedule(input: {
  title: string; notes: string; date: string; times: string[];
  recurrence: ReminderInput["recurrence"]; timezone: string;
}, now = Date.now()): ReminderInput[] {
  if (!input.times.length || input.times.length > 4) throw new Error("Kam se kam ek waqt chuniye");
  if (new Set(input.times).size !== input.times.length) throw new Error("Har waqt alag rakhiye");
  const reminders = input.times.map((time) => {
    if (!/^\d{2}:\d{2}$/.test(time) || Number(time.slice(0, 2)) > 23 || Number(time.slice(3)) > 59) throw new Error("Sahi waqt daaliye");
    const date = new Date(`${input.date}T${time}:00`);
    if (!Number.isFinite(date.getTime())) throw new Error("Sahi date daaliye");
    let due = date.toISOString();
    if (date.getTime() <= now) {
      if (input.recurrence === "once") throw new Error("Aane wali date aur time chuniye");
      due = nextOccurrence(due, input.recurrence, input.timezone, now) ?? due;
    }
    return reminderSchema.parse({ category: "medicine", title: input.title, notes: input.notes, due_at: due, recurrence: input.recurrence, timezone: input.timezone });
  });
  return medicineBatchSchema.parse({ reminders }).reminders;
}