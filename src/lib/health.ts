import { z } from "zod";

export const HEALTH_CATEGORIES = [
  { id: "medicine", label: "Dawa", icon: "pill", tone: "bg-pink-soft text-pink" },
  { id: "sugar", label: "Sugar check", icon: "droplet", tone: "bg-orange-soft text-orange" },
  { id: "bp", label: "Blood pressure", icon: "heart", tone: "bg-danger-soft text-destructive" },
  { id: "urine", label: "Urine test", icon: "flask", tone: "bg-yellow-soft text-orange" },
  { id: "blood", label: "Blood test", icon: "test", tone: "bg-primary-soft text-primary" },
  { id: "doctor", label: "Doctor appointment", icon: "doctor", tone: "bg-teal-soft text-teal" },
] as const;
export const reminderSchema = z.object({
  category: z.enum(["medicine", "sugar", "bp", "urine", "blood", "doctor"]),
  title: z.string().trim().min(1, "Naam daaliye").max(100),
  notes: z.string().trim().max(500),
  due_at: z.string().datetime({ offset: true }),
  recurrence: z.enum(["once", "daily", "weekly"]),
  timezone: z.string().max(100).refine((s) => { try { new Intl.DateTimeFormat("en", { timeZone: s }); return true; } catch { return false; } }),
});
export type ReminderInput = z.infer<typeof reminderSchema>;
export type HealthReminder = ReminderInput & { id: string; completed: boolean; last_notified_at: string | null };
export function isReminderDue(reminder: HealthReminder, now: number) {
  return !reminder.completed && Date.parse(reminder.due_at) <= now;
}
export function nextOccurrence(due: string, recurrence: string, timezone: string, now: number) {
  if (recurrence === "once") return null;
  const days = recurrence === "weekly" ? 7 : 1;
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const wallTime = (t: number) => {
    const p = Object.fromEntries(formatter.formatToParts(t).map((v) => [v.type, v.value]));
    return Date.UTC(Number(p['year']), Number(p['month']) - 1, Number(p['day']), Number(p['hour']), Number(p['minute']), Number(p['second']));
  };
  let next = Date.parse(due);
  do {
    const target = wallTime(next) + days * 86400000;
    let candidate = next + days * 86400000;
    for (let i = 0; i < 2; i++) candidate += target - wallTime(candidate);
    next = candidate;
  } while (next <= now);
  return new Date(next).toISOString();
}
export const allowsAmount = (kind: string) => kind === "ration";