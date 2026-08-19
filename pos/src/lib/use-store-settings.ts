import { useEffect, useState } from "react";
import {
  SETTINGS_EVENT,
  loadStoreSettings,
  type StoreSettings,
} from "./store-settings";
import {
  TILLS_EVENT,
  loadBranches,
  loadTills,
  type BranchRecord,
  type TillRecord,
} from "./tills";

export function useStoreSettings(): StoreSettings {
  const [settings, setSettings] = useState(loadStoreSettings);

  useEffect(() => {
    const refresh = () => setSettings(loadStoreSettings());
    window.addEventListener(SETTINGS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return settings;
}

export function useTills(): { tills: TillRecord[]; branches: BranchRecord[] } {
  const [tills, setTills] = useState(loadTills);
  const [branches, setBranches] = useState(loadBranches);

  useEffect(() => {
    const refresh = () => {
      setTills(loadTills());
      setBranches(loadBranches());
    };
    window.addEventListener(TILLS_EVENT, refresh);
    window.addEventListener(SETTINGS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(TILLS_EVENT, refresh);
      window.removeEventListener(SETTINGS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return { tills, branches };
}
