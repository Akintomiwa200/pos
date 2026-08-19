import { useEffect, useState } from "react";
import { apiUrl } from "./api-base";

export async function readHardwareHex(): Promise<string> {
  try {
    const response = await fetch(apiUrl("/api/hardware/device"));
    if (!response.ok) return "";
    const body = (await response.json()) as { hex?: string };
    return (body.hex ?? "").toUpperCase();
  } catch {
    return "";
  }
}

export function useHardwareHex() {
  const [hex, setHex] = useState("");
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const next = await readHardwareHex();
      if (cancelled) return;
      setHex(next);
      setLive(Boolean(next));
    }
    void tick();
    const timer = window.setInterval(() => void tick(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return { hex, live };
}
