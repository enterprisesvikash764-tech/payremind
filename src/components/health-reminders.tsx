import { useEffect, useRef, useState } from "react";
import { Pill, Thermometer, HeartPulse, Plus, Volume2, Check, Trash2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enableChime, playChime } from "@/lib/health-notifications";

export interface MedicineItem {
  id: string;
  title: string;
  slot: "Morning" | "Afternoon" | "Evening" | "Night";
  date: string;
  time: string;
  repeat: "Once" | "Everyday" | "Weekends" | "Monday" | "Sunday";
  notes: string;
  completed: boolean;
}

export function HealthReminders({ visible, lang = "en" }: { visible: boolean; lang?: "en" | "hinglish" | "hi" }) {
  const [list, setList] = useState<MedicineItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("payremind-medicine-v2") || "[]");
    } catch {
      return [];
    }
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slot, setSlot] = useState<MedicineItem["slot"]>("Morning");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [repeat, setRepeat] = useState<MedicineItem["repeat"]>("Everyday");
  const [notes, setNotes] = useState("");
  const alerted = useRef(new Set<string>());

  useEffect(() => {
    localStorage.setItem("payremind-medicine-v2", JSON.stringify(list));
  }, [list]);

  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todayStr = now.toISOString().slice(0, 10);
      const dayIdx = now.getDay(); // 0=Sun, 1=Mon, 6=Sat

      list.forEach((item) => {
        if (item.completed && item.repeat === "Once") return;
        const matchesDay =
          item.repeat === "Everyday" ||
          (item.repeat === "Once" && item.date === todayStr) ||
          (item.repeat === "Weekends" && (dayIdx === 0 || dayIdx === 6)) ||
          (item.repeat === "Monday" && dayIdx === 1) ||
          (item.repeat === "Sunday" && dayIdx === 0);

        const alertKey = `${item.id}-${todayStr}-${item.time}`;
        if (matchesDay && item.time === hhmm && !alerted.current.has(alertKey)) {
          alerted.current.add(alertKey);
          playChime();
          toast.warning(`💊 ${item.title}`, {
            description: `${item.slot} (${item.time}) ${item.notes ? `· ${item.notes}` : ""}`,
            duration: 20000,
            action: {
              label: "Done ✓",
              onClick: () => markDone(item.id),
            },
          });
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`💊 Medicine Alert: ${item.title}`, {
              body: `${item.slot} • ${item.time} ${item.notes ? `- ${item.notes}` : ""}`,
            });
          }
        }
      });
    };

    const timer = setInterval(checkAlarms, 5000);
    return () => clearInterval(timer);
  }, [list]);

  async function saveReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await enableChime();
    const item: MedicineItem = {
      id: crypto.randomUUID(),
      title: title.trim(),
      slot,
      date,
      time,
      repeat,
      notes: notes.trim(),
      completed: false,
    };
    setList((prev) => [item, ...prev]);
    setTitle("");
    setNotes("");
    setOpen(false);
    toast.success(lang === "hi" ? "दवा रिमाइंडर सेव हो गया!" : "Medicine reminder saved!");
  }

  function markDone(id: string) {
    setList((prev) => prev.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)));
  }

  function remove(id: string) {
    setList((prev) => prev.filter((i) => i.id !== id));
    toast("Reminder deleted");
  }

  function quickPreset(presetTitle: string) {
    setTitle(presetTitle);
    setOpen(true);
  }

  if (!visible) return null;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-teal">
            {lang === "hi" ? "दवा और स्वास्थ्य" : "MEDICINE & HEALTH"}
          </p>
          <h2 className="text-xl font-extrabold">
            {lang === "hi" ? "दवा रिमाइंडर" : lang === "hinglish" ? "Dawai Reminders" : "Medicine Reminders"}
          </h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await enableChime();
            playChime();
            toast.success("Alarm ringtone working!");
          }}
        >
          <Volume2 className="mr-1 size-4" /> Test Sound
        </Button>
      </div>

      {/* Quick One-Tap Medicine Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => quickPreset("Take Medicine")}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-teal-soft p-3 text-teal font-semibold transition active:scale-95"
        >
          <Pill className="size-6" />
          <span className="text-xs">{lang === "hi" ? "दवा लें" : "Medicine"}</span>
        </button>
        <button
          type="button"
          onClick={() => quickPreset("BP Check")}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-pink-soft p-3 text-pink font-semibold transition active:scale-95"
        >
          <HeartPulse className="size-6" />
          <span className="text-xs">{lang === "hi" ? "बीपी जाँच" : "BP Check"}</span>
        </button>
        <button
          type="button"
          onClick={() => quickPreset("Fever Temperature Check")}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-orange-soft p-3 text-orange font-semibold transition active:scale-95"
        >
          <Thermometer className="size-6" />
          <span className="text-xs">{lang === "hi" ? "बुखार जाँच" : "Fever Check"}</span>
        </button>
      </div>

      {/* Add Form */}
      {open ? (
        <form onSubmit={saveReminder} className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
          <h3 className="font-bold">{lang === "hi" ? "नया दवा रिमाइंडर जोड़ें" : "Add Medicine Reminder"}</h3>
          <input
            type="text"
            placeholder="Medicine name (e.g. BP Tablet, Fever Syrup)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border bg-background p-3 text-sm"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border bg-background p-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border bg-background p-2.5 text-sm"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value as MedicineItem["slot"])}
              className="rounded-xl border bg-background p-2.5 text-sm"
            >
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Evening">Evening</option>
              <option value="Night">Night</option>
            </select>
            <select
              value={repeat}
              onChange={(e) => setRepeat(e.target.value as MedicineItem["repeat"])}
              className="rounded-xl border bg-background p-2.5 text-sm"
            >
              <option value="Everyday">Everyday</option>
              <option value="Once">Specific Date Only</option>
              <option value="Weekends">Weekends (Sat-Sun)</option>
              <option value="Monday">Every Monday</option>
              <option value="Sunday">Every Sunday</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Note (e.g. After food)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border bg-background p-3 text-sm"
          />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Save</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <Button className="w-full" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          {lang === "hi" ? "नया रिमाइंडर जोड़ें" : "Add New Medicine Reminder"}
        </Button>
      )}

      {/* List */}
      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <CalendarClock className="mx-auto size-10 text-teal opacity-70" />
          <p className="mt-2 font-semibold">
            {lang === "hi" ? "अभी कोई दवा रिमाइंडर नहीं है" : "No medicine reminders yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-2xl border bg-card p-4 ${
                              className={`flex items-center justify-between rounded-2xl border bg-card p-4 ${
                item.completed && item.repeat === "Once" ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-teal-soft text-teal">
                  <Pill size={20} />
                </div>
                <div>
                  <p className="font-bold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.slot} · ⏰ {item.time} · {item.repeat}
                  </p>
                  {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button size="icon" variant="outline" onClick={() => markDone(item.id)}>
                  <Check className="size-4 text-success" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(item.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

