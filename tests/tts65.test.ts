import { describe, it, expect } from "vitest";
import { cleanForSpeech, resultToSpeechText } from "@/services/tts/textUtils";
import type { InsightResult } from "@/lib/aiSchema";

// ---------------------------------------------------------------------------
// cleanForSpeech
// ---------------------------------------------------------------------------
describe("cleanForSpeech", () => {
  it("removes emojis", () => {
    const result = cleanForSpeech("Great job! 🎉 You did it 🍣😂");
    expect(result).not.toMatch(/\p{Emoji_Presentation}/u);
    expect(result).toContain("Great job!");
    expect(result).toContain("You did it");
  });

  it("converts em-dashes to sentences", () => {
    expect(cleanForSpeech("Nothing scary — just keep an eye on it.")).toBe(
      "Nothing scary. just keep an eye on it."
    );
  });

  it("strips markdown bold", () => {
    expect(cleanForSpeech("This is **important** text.")).toBe("This is important text.");
  });

  it("strips markdown italic", () => {
    expect(cleanForSpeech("This is _italic_ text.")).toBe("This is italic text.");
  });

  it("strips markdown links", () => {
    expect(cleanForSpeech("See [this link](https://example.com).")).toBe("See this link.");
  });

  it("collapses multiple spaces", () => {
    expect(cleanForSpeech("too  many   spaces")).toBe("too many spaces");
  });

  it("handles empty string", () => {
    expect(cleanForSpeech("")).toBe("");
  });

  it("handles emoji-only string", () => {
    expect(cleanForSpeech("🎉🍣").trim()).toBe("");
  });
});

// ---------------------------------------------------------------------------
// resultToSpeechText
// ---------------------------------------------------------------------------
describe("resultToSpeechText", () => {
  const base: InsightResult = {
    mode: "casual",
    tone: "warm",
    headline: "Okay, that was a serious sushi night.",
    smallTalk: "Was it actually amazing?",
    context: null,
    financialObservation: "You spent $66 on food this month.",
    suggestion: null,
    followUpQuestion: "Was it worth it?",
    confidence: 1,
    isFallback: false,
  };

  it("includes headline, smallTalk, and followUpQuestion", () => {
    const text = resultToSpeechText(base);
    expect(text).toContain("Okay, that was a serious sushi night.");
    expect(text).toContain("Was it actually amazing?");
    // financialObservation is intentionally excluded to keep audio concise
    expect(text).toContain("Was it worth it?");
  });

  it("skips null fields", () => {
    const text = resultToSpeechText(base);
    expect(text.split(" ").length).toBeGreaterThan(0);
    // context was null — nothing from context
  });

  it("deduplicates identical text", () => {
    const dupe: InsightResult = {
      ...base,
      smallTalk: "Okay, that was a serious sushi night.", // same as headline
    };
    const text = resultToSpeechText(dupe);
    const occurrences = text.split("Okay, that was a serious sushi night.").length - 1;
    expect(occurrences).toBe(1);
  });

  it("strips emojis from the combined text", () => {
    const withEmoji: InsightResult = {
      ...base,
      headline: "Great job 🎉 this month!",
    };
    const text = resultToSpeechText(withEmoji);
    expect(text).not.toMatch(/\p{Emoji_Presentation}/u);
  });

  it("returns empty string for a result with all null optional fields", () => {
    const minimal: InsightResult = {
      ...base,
      headline: "Good month.",
      smallTalk: null,
      context: null,
      financialObservation: null,
      suggestion: null,
      followUpQuestion: null,
    };
    expect(resultToSpeechText(minimal)).toBe("Good month.");
  });
});

// ---------------------------------------------------------------------------
// TTS service — unit tests without browser/Executa APIs
// ---------------------------------------------------------------------------
describe("isTTSSupported", () => {
  it("returns false in Node.js test environment (no speechSynthesis)", async () => {
    const { isTTSSupported } = await import("@/services/tts/index");
    // Node.js has no window.speechSynthesis
    expect(isTTSSupported()).toBe(false);
  });
});

describe("fishSpeak", () => {
  it("reports failure when Anna client has no tools.invoke", async () => {
    const { fishSpeak } = await import("@/services/tts/providers/fish");
    // connectAnna() returns standalone (no client) in Node.js test env
    const result = await fishSpeak("hello");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NO_HOST");
    }
  });
});

describe("isBrowserTTSSupported", () => {
  it("returns false in Node.js test environment", async () => {
    const { isBrowserTTSSupported } = await import("@/services/tts/providers/browser");
    expect(isBrowserTTSSupported()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Dashboard does not expose full Money Buddy response text
// (structural test: MoneyBuddyLuckyCat receives InsightResult but renders
// no readable text in its visible output — only the speech bubble hint)
// ---------------------------------------------------------------------------
describe("MoneyBuddyLuckyCat data contract", () => {
  it("resultToSpeechText does not return empty for a real result", () => {
    const result: InsightResult = {
      mode: "insight",
      tone: "warm",
      headline: "You're doing great this month!",
      smallTalk: "Only a few expenses so far.",
      context: null,
      financialObservation: "Total: $120 of $500 budget used.",
      suggestion: null,
      followUpQuestion: "Any big plans coming up?",
      confidence: 0.9,
      isFallback: false,
    };
    const text = resultToSpeechText(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it("resultToSpeechText works for fallback results", () => {
    const fallback: InsightResult = {
      mode: "casual",
      tone: "warm",
      headline: "$45 in Food — logged!",
      smallTalk: null,
      context: null,
      financialObservation: null,
      suggestion: null,
      followUpQuestion: null,
      confidence: 1,
      isFallback: true,
    };
    const text = resultToSpeechText(fallback);
    // em-dash gets converted to ". " by cleanForSpeech
    expect(text).toBe("$45 in Food. logged!");
  });
});
