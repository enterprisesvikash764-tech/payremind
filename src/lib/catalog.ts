export interface SmartApp {
  name: string;
  packageName?: string;
  deepLink?: string;
  playStoreUrl?: string;
  webUrl: string;
}

export const PAY_APPS: SmartApp[] = [
  {
    name: "Google Pay",
    packageName: "com.google.android.apps.nbu.paisa.user",
    deepLink: "tez://upi/",
    playStoreUrl: "https://google.com",
    webUrl: "https://google.com",
  },
  {
    name: "Amazon Pay",
    packageName: "in.amazon.mShop.android.shopping",
    deepLink: "amzn://amazonpay",
    playStoreUrl: "https://google.com",
    webUrl: "https://amazon.in",
  },
  {
    name: "PhonePe",
    packageName: "com.phonepe.app",
    deepLink: "phonepe://",
    playStoreUrl: "https://google.com",
    webUrl: "https://phonepe.com",
  },
  {
    name: "Paytm",
    packageName: "net.one97.paytm",
    deepLink: "paytmmp://",
    playStoreUrl: "https://google.com",
    webUrl: "https://paytm.com",
  },
];

export const SUBSCRIPTION_APPS: Record<string, SmartApp> = {
  netflix: {
    name: "Netflix",
    packageName: "com.netflix.mediaclient",
    deepLink: "nflx://://netflix.com",
    playStoreUrl: "https://google.com",
    webUrl: "https://://netflix.comaccount",
  },
  "amazon prime": {
    name: "Amazon Prime Video",
    packageName: "com.amazon.avod.thirdpartyclient",
    deepLink: "primevideo://",
    playStoreUrl: "https://google.com",
    webUrl: "https://primevideo.com",
  },
  spotify: {
    name: "Spotify",
    packageName: "com.spotify.music",
    deepLink: "spotify://",
    playStoreUrl: "https://google.com",
    webUrl: "https://spotify.com",
  },
  hotstar: {
    name: "JioHotstar",
    packageName: "in.startv.hotstar",
    deepLink: "hotstar://",
    playStoreUrl: "https://google.com",
    webUrl: "https://hotstar.com",
  },
  youtube: {
    name: "YouTube",
    packageName: "com.google.android.youtube",
    deepLink: "vnd.youtube://",
    playStoreUrl: "https://google.com",
    webUrl: "https://youtube.com",
  },
};

export function openSmartApp(app: SmartApp) {
  if (typeof window === "undefined") return;
  const isAndroid = /Android/i.test(navigator.userAgent);

  // Rule 1: Android par pehle seedha app kholega, na hone par Play Store par bhejega
  if (isAndroid && app.packageName) {
    const fallback = encodeURIComponent(app.playStoreUrl || app.webUrl);
    const scheme = (app.deepLink || "https://").replace("://", "");
    window.location.href = `intent://open#Intent;scheme=${scheme};package=${app.packageName};S.browser_fallback_url=${fallback};end`;
    return;
  }

  // Rule 2: Play Store link agar available hai
  if (app.playStoreUrl) {
    window.open(app.playStoreUrl, "_blank", "noopener,noreferrer");
    return;
  }

  // Rule 3: Website sirf tab jab app available na ho
  window.open(app.webUrl, "_blank", "noopener,noreferrer");
}

export function findSubscriptionApp(name: string): SmartApp {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(SUBSCRIPTION_APPS)) {
    if (key.includes(k)) return v;
  }
  return {
    name,
    playStoreUrl: `https://google.com{encodeURIComponent(name)}&c=apps`,
    webUrl: `https://google.com{encodeURIComponent(name + " cancel subscription")}`,
  };
}
