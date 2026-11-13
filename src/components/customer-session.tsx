import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
const SessionContext = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });
export const useCustomer = () => useContext(SessionContext);
export function CustomerSession({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      setUser(session?.user ?? null); setReady(true);
      if (event === "SIGNED_OUT") { void queryClient.cancelQueries(); queryClient.clear(); }
      else if (event === "SIGNED_IN" || event === "USER_UPDATED") void queryClient.invalidateQueries();
    });
    void supabase.auth.getUser().then(({ data }) => { if (active) { setUser(data.user); setReady(true); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, [queryClient]);
  useEffect(() => {
    const theme = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => document.documentElement.classList.toggle("dark", theme.matches);
    sync(); theme.addEventListener("change", sync);
    return () => theme.removeEventListener("change", sync);
  }, []);
  return <SessionContext.Provider value={{ user, ready }}>{children}</SessionContext.Provider>;
}