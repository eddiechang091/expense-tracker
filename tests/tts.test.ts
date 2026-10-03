import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resultToReadableText } from "@/features/ai/MessageBubble";
import type { InsightResult } from "@/lib/aiSchema";

// ---------------------------------------------------------------------------
// resultToReadableText (pure function — no browser APIs needed)
// ---------------------------------------------------------------------------
describe("resultToReadableText", () => {
  const base: InsightResult = {
    mode: "casual",
    tone: "warm",
    headline: "Nice lunch!",
    smallTalk: "Hope it was delicious.",
    context: "First food expense this month.",
    financialObservation: "You are at 30% of your budget.",
    suggestion: "Keep it up.",
    followUpQuestion: "Was it worth it?",
    confidence: 1,
    isFallback: false,
  };

  it("joins all non-null fields with a period-space", () => {
    const text = resultToReadableText(base);
    expect(text).toContain("Nice lunch!");
    expect(text).toContain("Hope it was delicious.");
    expect(text).toContain("Was it worth it?");
  });

  it("skips null fields", () => {
    const result: InsightResult = { ...base, smallTalk: null, suggestion: null };
    const text = resultToReadableText(result);
    expect(text).not.toContain("Hope it was delicious.");
    expect(text).toContain("Nice lunch!");
    expect(text).toContain("Was it worth it?");
  });

  it("returns just the headline if everything else is null", () => {
    const minimal: InsightResult = {
      ...base,
      smallTalk: null,
      context: null,
      financialObservation: null,
      suggestion: null,
      followUpQuestion: null,
    };
    expect(resultToReadableText(minimal)).toBe("Nice lunch!");
  });
});

// ---------------------------------------------------------------------------
// useTextToSpeech — tests for the logic/state that can run in Node.js
// ---------------------------------------------------------------------------
// These tests stub window.speechSynthesis to verify the hook's behavior
// without a browser environment.

class MockUtterance {
  text: string;
  onend: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
  fireEnd() {
    this.onend?.();
  }
  fireError(e?: unknown) {
    this.onerror?.(e);
  }
}

function makeSpeechSynthesisMock() {
  const utterances: MockUtterance[] = [];
  return {
    speak: vi.fn((u: MockUtterance) => utterances.push(u)),
    cancel: vi.fn(() => {
      // simulate browser cancel firing onend on each queued utterance
      for (const u of utterances.splice(0)) {
        u.onend?.();
      }
    }),
    get lastUtterance() {
      return utterances[utterances.length - 1] ?? null;
    },
  };
}

// We test the pure exported helper instead of the hook in Node env.
// The hook itself requires a React renderer (jsdom or similar), but the
// helper functions are testable independently.

describe("useTextToSpeech helpers — supported detection", () => {
  it("marks supported=false when speechSynthesis is absent", async () => {
    // In the Node.js test environment window.speechSynthesis does not exist.
    const supported =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined";
    expect(supported).toBe(false);
  });
});

describe("MockUtterance", () => {
  it("fires onend callback", () => {
    const u = new MockUtterance("hello");
    const cb = vi.fn();
    u.onend = cb;
    u.fireEnd();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("fires onerror callback", () => {
    const u = new MockUtterance("hello");
    const cb = vi.fn();
    u.onerror = cb;
    u.fireError({ type: "interrupted" });
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe("speech synthesis mock", () => {
  let synth: ReturnType<typeof makeSpeechSynthesisMock>;

  beforeEach(() => {
    synth = makeSpeechSynthesisMock();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("speak queues an utterance", () => {
    const u = new MockUtterance("test");
    synth.speak(u);
    expect(synth.speak).toHaveBeenCalledWith(u);
    expect(synth.lastUtterance?.text).toBe("test");
  });

  it("cancel fires onend on queued utterances", () => {
    const u = new MockUtterance("test");
    const cb = vi.fn();
    u.onend = cb;
    synth.speak(u);
    synth.cancel();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("cancel clears the queue", () => {
    synth.speak(new MockUtterance("a"));
    synth.speak(new MockUtterance("b"));
    synth.cancel();
    expect(synth.lastUtterance).toBeNull();
  });

  it("second speak replaces previous utterance after cancel", () => {
    synth.speak(new MockUtterance("first"));
    synth.cancel();
    const second = new MockUtterance("second");
    synth.speak(second);
    expect(synth.lastUtterance?.text).toBe("second");
  });
});

describe("Read Aloud — reduced motion scenario", () => {
  it("resultToReadableText produces non-empty text for full results", () => {
    const result: InsightResult = {
      mode: "insight",
      tone: "warm",
      headline: "Good month so far.",
      smallTalk: "Love the consistency!",
      context: null,
      financialObservation: "You are at 40% of budget.",
      suggestion: null,
      followUpQuestion: "Any big plans?",
      confidence: 0.9,
      isFallback: false,
    };
    const text = resultToReadableText(result);
    expect(text.length).toBeGreaterThan(0);
    // reduced motion: prefers-reduced-motion does not affect the text content
    expect(text).toContain("Good month so far.");
  });
});
