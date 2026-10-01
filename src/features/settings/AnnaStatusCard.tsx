import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { connectAnna } from "@/services/anna/runtime";
import { getKvStore } from "@/services/anna/storage";
import { getLlmService } from "@/services/anna/llm";
import type { AnnaStatus } from "@/lib/types";

const INITIAL: AnnaStatus = {
  state: "connecting",
  isHosted: false,
  storageKind: "unknown",
  llmAvailable: false,
};

export function AnnaStatusCard() {
  const [status, setStatus] = useState<AnnaStatus>(INITIAL);
  const [roundTrip, setRoundTrip] = useState("checking");

  useEffect(() => {
    let active = true;
    (async () => {
      const runtime = await connectAnna();
      const store = await getKvStore();
      const llm = await getLlmService();
      if (!active) return;
      setStatus({
        state: runtime.state,
        isHosted: runtime.isHosted,
        storageKind: store.kind,
        llmAvailable: llm.available,
      });
      try {
        const key = "diagnostics:ping";
        await store.set(key, { at: new Date().toISOString() });
        const value = await store.get<{ at: string }>(key);
        if (active) setRoundTrip(value && value.at ? "ok" : "empty");
      } catch {
        if (active) setRoundTrip("failed");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card title="Anna connection">
      <ul className="stack" style={{ gap: 8 }}>
        <li>
          Runtime: <strong>{status.state}</strong>
          {status.isHosted ? " (inside Anna host)" : " (standalone)"}
        </li>
        <li>
          Storage backend: <strong>{status.storageKind}</strong>
        </li>
        <li>
          Host LLM available: <strong>{status.llmAvailable ? "yes" : "no"}</strong>
        </li>
        <li>
          Storage round-trip: <strong>{roundTrip}</strong>
        </li>
      </ul>
    </Card>
  );
}
