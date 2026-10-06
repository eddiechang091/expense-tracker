import { useEffect, useState } from "react";
import { getLlmService } from "@/services/anna/llm";
import { getKvStore } from "@/services/anna/storage";
import { STORAGE_KEYS } from "@/lib/constants";
import { todayIso } from "@/lib/utils";
import {
  buildDelightMessages,
  cleanDelightText,
  fallbackDelight,
  type DailyDelight,
} from "./dailyDelight";

export type DelightStatus = "loading" | "ready";

interface DelightState {
  status: DelightStatus;
  delight: DailyDelight | null;
}

/**
 * One fresh delight per day. Reads today's cached delight; if missing,
 * asks the LLM once (passing recent delights to avoid repeats) and caches
 * the result. Falls back to the local pool when the LLM is unavailable.
 */
export function useDailyDelight(): DelightState {
  const [state, setState] = useState<DelightState>({ status: "loading", delight: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dateKey = todayIso();
      const store = await getKvStore();
      const cached = await store.get<DailyDelight>(STORAGE_KEYS.dailyDelight(dateKey));
      if (cached && cached.date === dateKey) {
        if (!cancelled) setState({ status: "ready", delight: cached });
        return;
      }

      // Collect recent delights so the LLM avoids repeating itself.
      const recent: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
        const prev = await store.get<DailyDelight>(STORAGE_KEYS.dailyDelight(key));
        if (prev?.text) recent.push(prev.text);
        if (cancelled) return;
      }

      let delight: DailyDelight;
      try {
        const llm = await getLlmService();
        if (!llm.available) throw new Error("unavailable");
        const result = await llm.complete({ messages: buildDelightMessages(recent) });
        const text = cleanDelightText(result.text ?? "");
        delight = text
          ? { text, kind: "moment", date: dateKey, fallback: false }
          : fallbackDelight(dateKey);
      } catch {
        delight = fallbackDelight(dateKey);
      }

      await store.set(STORAGE_KEYS.dailyDelight(dateKey), delight);
      if (!cancelled) setState({ status: "ready", delight });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
