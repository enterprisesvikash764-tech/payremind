import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HealthReminders } from "@/components/health-reminders";
import { Button } from "@/components/ui/button";
import { PAY_APPS, openSmartApp, findSubscriptionApp } from "@/lib/catalog";
import { enableChime, playChime, INSTRUMENTAL_RINGTONES } from "@/lib/health-notifications";
import {
  Home, Receipt, Wallet, CalendarClock, Pill, Plus, Bell, Settings,
  MessageCircle, ArrowDownLeft, ArrowUpRight, Trash2, Check, Volume2,
  ExternalLink, Smartphone, Sparkles, Clock
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "PayRemind — Smart Payment, Schedule & Medicine Reminders" }],
  }),
  component: App,
});

type Lang = "en" | "hinglish" | "hi";
type Kind = "sub" | "bill" | "udhari" | "schedule";
type RepeatType = "Once" | "Everyday" | "Weekends" | "Monday" | "Sunday" | "Monthly" | "Yearly";

interface ReminderItem {
  id: string;
  kind: Kind;
  title: string;
  amount: number;
  date: string;
  time: string;
  repeat: RepeatType;
  personName?: string;
  phone?: string;
  dir?: "receive" | "pay";
  done?: boolean;
}

const TEXT: Record<Lang, Record<string, string>> = {
  en: {
    upcoming: "Upcoming Payment",
    budget: "Limit: Unlimited",
    home: "Home",
    bills: "Pay Bill",
    cash: "Udhari & Rent",
    schedule: "Time Table",
    medicine: "Medicine",
    add: "Add New",
    receive: "Money to Receive",
    pay: "Money to Pay",
    person: "Person Name",
    whatsapp: "Send WhatsApp Reminder",
    cancelSub: "Cancel Subscription",
    payBillNow: "Pay Bill Now",
    empty: "No items added yet. Tap + to add.",
  },
  hinglish: {
    upcoming: "Upcoming Payment",
    budget: "Limit: Unlimited",
    home: "Home",
    bills: "Pay Bill",
    cash: "Udhari & Rent",
    schedule: "Time Table",
    medicine: "Medicine",
    add: "Naya Jodein",
    receive: "Paise Lene Hain",
    pay: "Paise Dene Hain",
    person: "Person Name",
    whatsapp: "Send WhatsApp Reminder",
    cancelSub: "Cancel Subscription",
    payBillNow: "Bill Pay Karein",
    empty: "Abhi kuch nahi joda gaya hai. + dabakar jodein.",
  },
  hi: {
    upcoming: "आगामी भुगतान",
    budget: "सीमा: असीमित (Unlimited)",
    home: "होम",
    bills: "बिल भरें",
    cash: "उधारी और किराया",
    schedule: "टाइम टेबल",
    medicine: "दवा",
    add: "नया जोड़ें",
    receive: "पैसे लेने हैं",
    pay: "पैसे देने हैं",
    person: "व्यक्ति का नाम (Person Name)",
    whatsapp: "व्हाट्सएप रिमाइंडर भेजें",
    cancelSub: "सब्सक्रिप्शन रद्द करें",
    payBillNow: "बिल भुगतान करें",
    empty: "अभी कुछ नहीं जोड़ा गया है। नया जोड़ने के लिए + दबाएं।",
  },
};

const inr = (n: number) => "₹" + (Number(n) || 0).toLocaleString("en-IN");

function App() {
  const [tab, setTab] = useState<"home" | "bills" | "cash" | "schedule" | "medicine">("home");
  const [lang, setLang] = useState<Lang>("en");
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [showAdd, setShowAdd] = useState<Kind | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [payModalItem, setPayModalItem] = useState<ReminderItem | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [ringtone, setRingtone] = useState("piano");
  const alerted = useRef(new Set<string>());

  useEffect(() => {
    try {
      const saved = localStorage.getItem("payremind-v3-items");
      if (saved) setItems(JSON.parse(saved));
      const savedLang = localStorage.getItem("payremind-lang") as Lang;
      if (savedLang) setLang(savedLang);
      setSoundOn(localStorage.getItem("payremind-sound") !== "off");
      setRingtone(localStorage.getItem("payremind-ringtone") || "piano");
    } catch { /* ignore */ }
    enableChime();
  }, []);

  useEffect(() => {
    localStorage.setItem("payremind-v3-items", JSON.stringify(items));
  }, [items]);

  // Automatic Alarm & Notification Checker
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const today = now.toISOString().slice(0, 10);
      const dayIdx = now.getDay();

      items.forEach((it) => {
        if (it.done && it.repeat === "Once") return;
        const matchDay =
          it.repeat === "Everyday" ||
          (it.repeat === "Once" && it.date === today) ||
          (it.repeat === "Weekends" && (dayIdx === 0 || dayIdx === 6)) ||
          (it.repeat === "Monday" && dayIdx === 1) ||
          (it.repeat === "Sunday" && dayIdx === 0) ||
          (it.repeat === "Monthly" && it.date.slice(8, 10) === today.slice(8, 10)) ||
          (it.repeat === "Yearly" && it.date.slice(5, 10) === today.slice(5, 10));

        const key = `${it.id}-${today}-${it.time}`;
        if (matchDay && it.time === hhmm && !alerted.current.has(key)) {
          alerted.current.add(key);
          playChime();
          toast.warning(`⏰ ${it.title}`, {
            description: `${it.amount > 0 ? inr(it.amount) + " · " : ""}${it.time} (${it.repeat})`,
            duration: 20000,
          });
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`PayRemind: ${it.title}`, {
              body: `${it.amount > 0 ? inr(it.amount) + " - " : ""}${it.time}`,
            });
          }
        }
      });
    };
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, [items]);

  const t = TEXT[lang];
  // Default 0 rahega jab tak user real amount na bhare
  const upcomingTotal = items
    .filter((i) => !i.done && (i.kind === "bill" || i.kind === "sub" || (i.kind === "udhari" && i.dir === "pay")))
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  function addItem(newItem: Omit<ReminderItem, "id">) {
    setItems((prev) => [{ ...newItem, id: crypto.randomUUID() }, ...prev]);
    toast.success("Saved!");
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast("Removed");
  }

  function openWhatsApp(it: ReminderItem) {
    const cleanPhone = (it.phone || "").replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Namaste ${it.personName || ""}, reminder for ${it.title}${it.amount > 0 ? ` of ${inr(it.amount)}` : ""} on ${it.date} at ${it.time}.`
    );
    const url = cleanPhone ? `https://wa.me{cleanPhone}?text=${msg}` : `https://wa.me{msg}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background shadow-sm">
        {/* Professional Teal-Blue Gradient Header + Script Font Name */}
        <header className="rounded-b-3xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 px-5 pb-6 pt-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Custom Professional Logo */}
              <div className="grid size-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30">
                <Bell className="size-5 text-white" />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold tracking-wide text-white"
                  style={{ fontFamily: "'Georgia', 'Brush Script MT', cursive" }}
                >
                  PayRemind
                </h1>
                <p className="text-[11px] text-white/80">Smart Payments, Schedule & Medicine</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="grid size-10 place-items-center rounded-full bg-white/15 hover:bg-white/25 transition"
              title="Settings"
            >
              <Settings className="size-5 text-white" />
            </button>
          </div>

          {/* Upcoming Payment Card (Default ₹0 & Unlimited) */}
          <div className="mt-5 rounded-2xl bg-white/15 p-4 backdrop-blur-md border border-white/20">
            <div className="flex items-center justify-between text-xs text-white/90">
              <span>{t.upcoming}</span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-semibold">{t.budget}</span>
            </div>
            <p className="mt-1 text-3xl font-extrabold tracking-tight">{inr(upcomingTotal)}</p>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 px-4 pb-28 pt-4">
          {tab === "home" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="outline" className="h-12 justify-start rounded-xl" onClick={() => setShowAdd("bill")}>
                  <Receipt className="mr-2 size-4 text-blue-600" /> + {t.bills}
                </Button>
                <Button variant="outline" className="h-12 justify-start rounded-xl" onClick={() => setShowAdd("sub")}>
                  <Sparkles className="mr-2 size-4 text-teal-600" /> + Subscription
                </Button>
                <Button variant="outline" className="h-12 justify-start rounded-xl" onClick={() => setShowAdd("udhari")}>
                  <Wallet className="mr-2 size-4 text-emerald-600" /> + {t.cash}
                </Button>
                <Button variant="outline" className="h-12 justify-start rounded-xl" onClick={() => setShowAdd("schedule")}>
                  <CalendarClock className="mr-2 size-4 text-orange-600" /> + {t.schedule}
                </Button>
              </div>

              <h2 className="font-bold text-base pt-2">{t.upcoming}</h2>
              {items.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t.empty}</p>
              ) : (
                <div className="space-y-2.5">
                  {items.map((it) => (
                    <ItemCard
                      key={it.id}
                      item={it}
                      t={t}
                      onPay={() => setPayModalItem(it)}
                      onWhatsApp={() => openWhatsApp(it)}
                      onDelete={() => removeItem(it.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "bills" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold">{t.bills} & Subscriptions</h2>
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={() => setShowAdd("bill")}>+ Bill</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAdd("sub")}>+ Sub</Button>
                </div>
              </div>

              {/* Direct Pay Bill Apps (GPay, Amazon Pay, PhonePe, Paytm) */}
              <div className="rounded-2xl border bg-card p-3.5">
                <p className="mb-2.5 text-xs font-bold text-muted-foreground">QUICK PAY VIA APP</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAY_APPS.map((app) => (
                    <button
                      key={app.name}
                      type="button"
                      onClick={() => openSmartApp(app)}
                      className="flex items-center justify-between rounded-xl border bg-background px-3 py-2.5 text-xs font-bold hover:bg-muted transition"
                    >
                      <span>{app.name}</span>
                      <ExternalLink className="size-3.5 text-primary" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                {items
                  .filter((i) => i.kind === "bill" || i.kind === "sub")
                  .map((it) => (
                    <ItemCard
                      key={it.id}
                      item={it}
                      t={t}
                      onPay={() => setPayModalItem(it)}
                      onWhatsApp={() => openWhatsApp(it)}
                      onDelete={() => removeItem(it.id)}
                    />
                  ))}
              </div>
            </div>
          )}

          {tab === "cash" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold">{t.cash}</h2>
                <Button size="sm" onClick={() => setShowAdd("udhari")}>+ {t.add}</Button>
              </div>
              <div className="space-y-2.5">
                {items
                  .filter((i) => i.kind === "udhari")
                  .map((it) => (
                    <ItemCard
                      key={it.id}
                      item={it}
                      t={t}
                      onPay={() => setPayModalItem(it)}
                      onWhatsApp={() => openWhatsApp(it)}
                      onDelete={() => removeItem(it.id)}
                    />
                  ))}
              </div>
            </div>
          )}

          {tab === "schedule" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold">{t.schedule}</h2>
                  <p className="text-xs text-muted-foreground">Everyday, Weekends, Specific Day, Monthly & Yearly</p>
                </div>
                <Button size="sm" onClick={() => setShowAdd("schedule")}>+ {t.add}</Button>
              </div>
              <div className="space-y-2.5">
                {items
                  .filter((i) => i.kind === "schedule")
                  .map((it) => (
                    <ItemCard
                      key={it.id}
                      item={it}
                      t={t}
                      onPay={() => setPayModalItem(it)}
                      onWhatsApp={() => openWhatsApp(it)}
                      onDelete={() => removeItem(it.id)}
                    />
                  ))}
              </div>
            </div>
          )}

          <HealthReminders visible={tab === "medicine"} lang={lang} />
        </main>

        {/* Simple UPI-Style Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-5 py-2">
            {[
              { id: "home", label: t.home, Icon: Home },
              { id: "bills", label: t.bills, Icon: Receipt },
              { id: "cash", label: t.cash, Icon: Wallet },
              { id: "schedule", label: t.schedule, Icon: CalendarClock },
              { id: "medicine", label: t.medicine, Icon: Pill },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id as typeof tab)}
                className={`flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-bold transition ${
                  tab === id ? "text-teal-600" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-5" />
                <span className="truncate max-w-[64px]">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <AddReminderModal
          kind={showAdd}
          t={t}
          onClose={() => setShowAdd(null)}
          onSave={(data) => {
            addItem(data);
            setShowAdd(null);
          }}
        />
      )}

      {/* Pay Bill Modal (Opens App -> Play Store -> Website) */}
      {payModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-5 shadow-xl">
            <h3 className="text-lg font-extrabold">{payModalItem.title}</h3>
            <p className="text-2xl font-black text-teal-600">{inr(payModalItem.amount)}</p>
            <p className="text-xs text-muted-foreground">Choose app to pay directly:</p>
            <div className="grid grid-cols-2 gap-2">
              {PAY_APPS.map((app) => (
                <Button key={app.name} variant="outline" onClick={() => openSmartApp(app)}>
                  <Smartphone className="mr-1.5 size-4" /> {app.name}
                </Button>
              ))}
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setItems((p) => p.map((i) => (i.id === payModalItem.id ? { ...i, done: true } : i)));
                setPayModalItem(null);
                toast.success("Marked as Paid!");
              }}
            >
              <Check className="mr-1.5 size-4" /> Mark as Paid
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setPayModalItem(null)}>Close</Button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold">App Settings</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowSettings(false)}>Close</Button>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">LANGUAGE / भाषा</label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {[
                  { id: "en", label: "English" },
                  { id: "hinglish", label: "Hinglish" },
                  { id: "hi", label: "हिन्दी" },
                ].map((l) => (
                  <Button
                    key={l.id}
                    size="sm"
                    variant={lang === l.id ? "default" : "outline"}
                    onClick={() => {
                      setLang(l.id as Lang);
                      localStorage.setItem("payremind-lang", l.id);
                    }}
                  >
                    {l.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <span className="text-sm font-bold">Notification Sound</span>
              <Button
                size="sm"
                variant={soundOn ? "default" : "outline"}
                onClick={() => {
                  const next = !soundOn;
                  setSoundOn(next);
                  localStorage.setItem("payremind-sound", next ? "on" : "off");
                  if (next) playChime();
                }}
              >
                {soundOn ? "ON" : "OFF"}
              </Button>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">DEFAULT INSTRUMENTAL RINGTONES</label>
              <div className="mt-1.5 space-y-1.5">
                {INSTRUMENTAL_RINGTONES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRingtone(r.id);
                      localStorage.setItem("payremind-ringtone", r.id);
                      playChime(r.id);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold ${
                      ringtone === r.id ? "border-teal-600 bg-teal-50 text-teal-800" : ""
                    }`}
                  >
                    <span>🎵 {r.name}</span>
                    <Volume2 className="size-3.5" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">CUSTOM RINGTONE (FROM PHONE)</label>
              <input
                type="file"
                accept="audio/*"
                className="mt-1.5 w-full text-xs"
                onChange={(e) => {
                  const files = e.target.files;
                  const file = files && files.length > 0 ? files[0] : null;
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const dataUrl = String(reader.result || "");
                    localStorage.setItem("payremind-custom-ringtone", dataUrl);
                    localStorage.setItem("payremind-ringtone", "custom");
                    setRingtone("custom");
                    playChime("custom", dataUrl);
                    toast.success("Custom ringtone saved!");
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item,
  t,
  onPay,
  onWhatsApp,
  onDelete,
}: {
  item: ReminderItem;
  t: Record<string, string>;
  onPay: () => void;
  onWhatsApp: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`rounded-2xl border bg-card p-4 shadow-sm ${item.done ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold uppercase">{item.repeat}</span>
          <h3 className="mt-1 font-bold">{item.title}</h3>
          {item.personName && <p className="text-xs text-muted-foreground">{t.person}: {item.personName}</p>}
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" /> {item.date} · {item.time}
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-extrabold">{inr(item.amount)}</p>
          <button type="button" onClick={onDelete} className="mt-1 text-destructive">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(item.kind === "bill" || item.kind === "sub") && (
          <Button size="sm" onClick={onPay}>{t.payBillNow}</Button>
        )}
        {item.kind === "sub" && (
          <Button size="sm" variant="outline" onClick={() => openSmartApp(findSubscriptionApp(item.title))}>
            {t.cancelSub}
          </Button>
        )}
        {item.kind === "udhari" && (
          <Button size="sm" variant="outline" onClick={onWhatsApp}>
            <MessageCircle className="mr-1 size-3.5 text-green-600" /> {t.whatsapp}
          </Button>
        )}
      </div>
    </div>
  );
}

function AddReminderModal({
  kind,
  t,
  onClose,
  onSave,
}: {
  kind: Kind;
  t: Record<string, string>;
  onClose: () => void;
  onSave: (item: Omit<ReminderItem, "id">) => void;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [repeat, setRepeat] = useState<RepeatType>("Once");
  const [personName, setPersonName] = useState("");
  const [phone, setPhone] = useState("");
  const [dir, setDir] = useState<"receive" | "pay">("receive");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enableChime();
          onSave({
            kind,
            title: title.trim() || "Reminder",
            amount: Number(amount) || 0,
            date,
            time,
            repeat,
            personName: personName.trim(),
            phone: phone.trim(),
            dir,
          });
        }}
        className="w-full max-w-sm space-y-3 rounded-2xl bg-card p-5 shadow-xl"
      >
        <h3 className="text-lg font-extrabold">{t.add}</h3>

        {kind === "udhari" && (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={dir === "receive" ? "default" : "outline"} onClick={() => setDir("receive")}>
              <ArrowDownLeft className="mr-1 size-4" /> {t.receive}
            </Button>
            <Button type="button" variant={dir === "pay" ? "default" : "outline"} onClick={() => setDir("pay")}>
              <ArrowUpRight className="mr-1 size-4" /> {t.pay}
            </Button>
          </div>
        )}

        <input
          type="text"
          placeholder="Title / Reason (e.g. Electricity Bill, Netflix, Gym)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border bg-background p-3 text-sm"
          required
        />

        {kind === "udhari" && (
          <>
            <input
              type="text"
              placeholder={t.person}
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="w-full rounded-xl border bg-background p-3 text-sm"
            />
            <input
              type="tel"
              placeholder="WhatsApp Number (with 91, e.g. 919876543210)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border bg-background p-3 text-sm"
            />
          </>
        )}

        {kind !== "schedule" && (
          <input
            type="number"
            placeholder="Amount ₹ (Default: 0)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border bg-background p-3 text-sm"
          />
        )}

        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border bg-background p-2.5 text-sm"
          />
                   <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-xl border bg-background p-2.5 text-sm"
            required
          />
        </div>

        <select
          value={repeat}
          onChange={(e) => setRepeat(e.target.value as RepeatType)}
          className="w-full rounded-xl border bg-background p-3 text-sm"
        >
          <option value="Once">Specific Date (Once)</option>
          <option value="Everyday">Everyday</option>
          <option value="Weekends">Weekends (Sat & Sun)</option>
          <option value="Monday">Every Monday</option>
          <option value="Sunday">Every Sunday</option>
          <option value="Monthly">Monthly</option>
          <option value="Yearly">Yearly</option>
        </select>

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">Save</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}

