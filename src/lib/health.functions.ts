import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reminderSchema, nextOccurrence } from "./health";
import { medicineBatchSchema } from "./medicine-schedule";

export const saveMedicineSchedule = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => medicineBatchSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.reminders.some((r) => Date.parse(r.due_at) <= Date.now())) throw new Error("Aane wala waqt chuniye");
    const result = await context.supabase.from("health_reminders").insert(data.reminders.map((r) => ({ ...r, user_id: context.userId }))).select("id");
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const getHealthData = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [reminders, profile] = await Promise.all([
    context.supabase.from("health_reminders").select("*").order("due_at").limit(1000),
    context.supabase.from("profiles").select("display_name,avatar_url").eq("id", context.userId).maybeSingle(),
  ]);
  if (reminders.error) throw new Error(reminders.error.message);
  if (profile.error) throw new Error(profile.error.message);
  return { reminders: reminders.data, profile: profile.data };
});
export const saveHealthReminder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid().optional(), reminder: reminderSchema }).parse(input))
  .handler(async ({ data, context }) => {
    if (Date.parse(data.reminder.due_at) <= Date.now()) throw new Error("Aane wali date aur time chuniye");
    const query = data.id
      ? context.supabase.from("health_reminders").update({ ...data.reminder, completed: false, last_notified_at: null }).eq("id", data.id).eq("user_id", context.userId)
      : context.supabase.from("health_reminders").insert({ ...data.reminder, user_id: context.userId });
    const result = await query.select("id").single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });
export const changeHealthReminder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), action: z.enum(["done", "delete", "snooze"]) }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.action === "delete") {
      const r = await context.supabase.from("health_reminders").delete().eq("id", data.id).eq("user_id", context.userId);
      if (r.error) throw new Error(r.error.message);
      return true;
    }
    const r = await context.supabase.from("health_reminders").select("*").eq("id", data.id).eq("user_id", context.userId).single();
    if (r.error) throw new Error(r.error.message);
    const next = data.action === "snooze" ? new Date(Date.now() + 10 * 60000).toISOString() : nextOccurrence(r.data.due_at, r.data.recurrence, r.data.timezone, Date.now());
    const update = await context.supabase.from("health_reminders").update(next ? { due_at: next, completed: false, last_notified_at: null } : { completed: true }).eq("id", data.id).eq("user_id", context.userId);
    if (update.error) throw new Error(update.error.message);
    return true;
  });
export const saveCustomerProfile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ display_name: z.string().trim().min(1).max(100), avatar_url: z.union([z.literal(""), z.string().url().max(2000).refine((s) => s.startsWith("https://"))]) }).parse(input))
  .handler(async ({ data, context }) => {
    const r = await context.supabase.from("profiles").upsert({ ...data, id: context.userId });
    if (r.error) throw new Error(r.error.message);
    return true;
  });
export const registerHealthDevice = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ token: z.string().min(1).max(4096) }).parse(input))
  .handler(async ({ data, context }) => {
    const r = await context.supabase.from("health_devices").upsert({ token: data.token, user_id: context.userId }, { onConflict: "token" });
    if (r.error) throw new Error(r.error.message);
    return true;
  });