import { Button } from "./Button";

// Phase 1 stub. The Read Aloud flow ships in a later phase.
export function ReadAloudButton({ label = "Read this" }: { label?: string }) {
  return (
    <Button variant="secondary" size="sm" disabled title="Read Aloud arrives in a later phase">
      {label}
    </Button>
  );
}
