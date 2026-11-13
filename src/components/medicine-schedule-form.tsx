import { useState } from "react";
import { Moon, Sun, Sunrise, Sunset, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildMedicineSchedule, MEDICINE_PERIODS } from "@/lib/medicine-schedule";
import type { ReminderInput } from "@/lib/health";

const periodIcons = [Sunrise, Sun, Sunset, Moon];
export function MedicineScheduleForm({ busy, close, save }: { busy: boolean; close: () => void; save: (reminders: ReminderInput[]) => Promise<void> }) {
  const [times, setTimes] = useState<Record<string, string>>({});
  const today = new Date();
  const date = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return <div role="dialog" aria-modal="true" aria-label="Dawa ke waqt" className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
    <form className="max-h-[90dvh] w-full max-w-md space-y-4 overflow-auto rounded-lg bg-background p-5" onSubmit={async (e) => {
      e.preventDefault(); const form = new FormData(e.currentTarget);
      try {
        const reminders = buildMedicineSchedule({ title: String(form.get("title")), notes: String(form.get("notes")), date: String(form.get("date")), times: Object.values(times), recurrence: form.get("recurrence") as ReminderInput["recurrence"], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
        await save(reminders);
      } catch (error) { toast.error(error instanceof Error ? error.message : "Waqt dobara check karein"); }
    }}>
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Dawa ke waqt</h2><Button disabled={busy} type="button" size="icon" variant="ghost" aria-label="Close medicine" onClick={close}><X /></Button></div>
      <label className="block text-sm">Dawa ka naam<input autoFocus name="title" required maxLength={100} placeholder="Diabetes, BP, heart — dawa ka naam" className="mt-1 w-full rounded-md border bg-background p-3" /></label>
      <label className="block text-sm">Shuru ki date<input name="date" type="date" required min={date} defaultValue={date} className="mt-1 w-full min-w-0 rounded-md border bg-background p-3" /></label>
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Dawa lene ke waqt</legend>{MEDICINE_PERIODS.map((period, index) => {
        const Icon = periodIcons[index] ?? Sun;
        const selected = period.id in times;
        return <div key={period.id} className="flex min-h-14 items-center gap-3 border-b py-2">
          <Icon className="size-5 shrink-0 text-teal" />
          <label className="flex min-w-0 flex-1 items-center gap-2 text-sm"><input type="checkbox" checked={selected} onChange={(e) => setTimes((current) => { const next = { ...current }; if (e.target.checked) next[period.id] = ""; else delete next[period.id]; return next; })} />{period.label}</label>
          {selected && <input aria-label={`${period.label} ka waqt`} type="time" required value={times[period.id]} onChange={(e) => setTimes((current) => ({ ...current, [period.id]: e.target.value }))} className="w-32 min-w-0 rounded-md border bg-background p-2 text-sm" />}
        </div>;
      })}</fieldset>
      <label className="block text-sm">Repeat<select name="recurrence" defaultValue="daily" className="mt-1 w-full rounded-md border bg-background p-3"><option value="daily">Roz</option><option value="weekly">Har hafte</option><option value="once">Ek baar</option></select></label>
      <label className="block text-sm">Aapki jaankari (optional)<textarea name="notes" maxLength={500} placeholder="Jaise doctor ne bataya: khane ke baad" className="mt-1 w-full rounded-md border bg-background p-3" /></label>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : "Save dawa ke waqt"}</Button>
    </form>
  </div>;
}