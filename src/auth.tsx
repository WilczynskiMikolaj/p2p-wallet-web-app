import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";


const Context = createContext<{ session: Session | null; ready: boolean }>({
  session: null,
  ready: false,
});


export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    session: Session | null;
    ready: boolean;
  }>({ session: null, ready: !supabase });

  useEffect(() => {
    
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setState({ session, ready: true }),
    );

    return () => data.subscription.unsubscribe();
  }, []);

  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);
