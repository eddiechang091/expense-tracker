// Interactive 2D lucky cat companion modal.
//
// Floating semi-transparent modal over the Dashboard: a cozy cat-room scene
// with the cat (pose changes per interaction), action buttons, inventory,
// happiness meter, and daily check-in. Talk reuses the existing TTS spending
// summary.

import { useEffect, useMemo, useRef, useState } from "react";
import { useCat } from "@/services/cat/useCat";
import { CAT_BACKGROUND, CAT_POSES } from "@/services/cat/catImages";
import type { CatPose } from "@/services/cat/catImages";
import { THEME_CAT_ART } from "@/services/theme/art/themeArt";
import { useTheme } from "@/services/theme/useTheme";
import { CAT_ITEMS, getItem } from "@/services/cat/items";
import type { CatItem, ItemKind } from "@/services/cat/types";
import { playCheckin, playMeow, playPop, playPurr, playSnore } from "@/services/cat/sounds";
import { RewardCelebration } from "./RewardCelebration";
import { useTTS } from "@/services/tts/useTTS";
import { resultToSpeechText } from "@/services/tts/textUtils";
import type { InsightResult } from "@/lib/aiSchema";
import "./catCompanion.css";

interface CatCompanionModalProps {
  open: boolean;
  onClose: () => void;
  insightResult: InsightResult | null;
  expenseStats: { streakDays: number; longestStreak: number; totalExpenses: number };
}

type PickerKind = ItemKind | null;

const ACTION_LABELS: Record<string, string> = {
  feed: "Feed",
  play: "Play",
  groom: "Groom",
  poop: "Litter",
  sleep: "Sleep",
  wake: "Wake",
  talk: "Talk",
};

export function CatCompanionModal({ open, onClose, insightResult, expenseStats }: CatCompanionModalProps) {
  const { state, loaded, checkIn, canCheckIn, feed, play, groom, cleanLitter, toggleSleep, maybeHappyDrop } = useCat();
  const { theme } = useTheme();
  const themeArt = THEME_CAT_ART[theme] ?? null;
  const { speak, isSpeaking } = useTTS();

  const [pose, setPose] = useState<CatPose>("idle");
  const sceneBg = themeArt ? themeArt.poses[pose] : CAT_BACKGROUND;
  const [bubble, setBubble] = useState("Let's make today a great logging day!");
  const [picker, setPicker] = useState<PickerKind>(null);
  const [dropNotice, setDropNotice] = useState<CatItem | null>(null);
  const [checkinItems, setCheckinItems] = useState<CatItem[] | null>(null);
  const [rewardShow, setRewardShow] = useState<{ title: string; items: CatItem[] } | null>(null);
  const poseTimer = useRef<number | null>(null);

  // Reset when opened.
  useEffect(() => {
    if (open) {
      setPose(state.asleep ? "sleep" : "idle");
      setPicker(null);
      setDropNotice(null);
      setCheckinItems(null);
      setBubble(state.asleep ? "Zzz… (the lucky cat is asleep)" : "Let's make today a great logging day!");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  // Revert to idle/sleep pose after a few seconds.
  const revertPose = (ms = 3500) => {
    if (poseTimer.current) window.clearTimeout(poseTimer.current);
    poseTimer.current = window.setTimeout(() => {
      setPose(state.asleep ? "sleep" : "idle");
    }, ms);
  };
  useEffect(() => () => {
    if (poseTimer.current) window.clearTimeout(poseTimer.current);
  }, []);

  const checkDrop = () => {
    const drop = maybeHappyDrop(expenseStats);
    if (drop) {
      setDropNotice(drop);
      playPop();
      setBubble(`Wow! The lucky cat dropped ${drop.emoji} ${drop.name}!`);
      window.setTimeout(() => setDropNotice(null), 4000);
    }
  };

  const ownedByKind = useMemo(() => {
    const kinds: Record<ItemKind, CatItem[]> = { food: [], toy: [], care: [] };
    for (const [id, count] of Object.entries(state.inventory)) {
      if (count <= 0) continue;
      const item = getItem(id);
      if (item) kinds[item.kind].push({ ...item, count } as CatItem & { count: number });
    }
    return kinds;
  }, [state.inventory]);

  const doCheckIn = () => {
    const res = checkIn();
    if (res.ok) {
      playCheckin();
      setCheckinItems(res.items);
      setBubble(`Checked in! ${res.streak}-day streak — you got ${res.items.length} items 🎁`);
      if (res.items.length > 0) {
        setRewardShow({ title: `Daily Check-in (Day ${res.streak})`, items: res.items });
      }
    }
  };

  const usePickedItem = (kind: ItemKind, item: CatItem) => {
    let used: CatItem | null = null;
    if (kind === "food") {
      used = feed(item.id);
      if (used) {
        setPose("eat");
        playMeow();
        setBubble(`Yum! ${used.emoji} ${used.name} is delicious!`);
      }
    } else if (kind === "toy") {
      used = play(item.id);
      if (used) {
        setPose("play");
        playMeow();
        setBubble(`So fun! The ${used.emoji} ${used.name} is the best!`);
      }
    } else {
      used = groom(item.id);
      if (used) {
        setPose("groom");
        playPurr();
        setBubble(`So relaxing… the ${used.emoji} ${used.name} feels amazing, purr…`);
      }
    }
    if (used) {
      setPicker(null);
      revertPose();
      checkDrop();
    }
  };

  const doCleanLitter = () => {
    const found = cleanLitter();
    setPose("poop");
    if (found.length > 0) {
      playPop();
      setBubble(`Litter box cleaned! Found ${found.map((f) => `${f.emoji} ${f.name}`).join(", ")} ✨`);
    } else {
      setBubble("The litter box is sparkling clean — the cat approves!");
    }
    revertPose();
    checkDrop();
  };

  const doToggleSleep = () => {
    toggleSleep();
    if (!state.asleep) {
      setPose("sleep");
      playSnore();
      setBubble("Zzz… (asleep — tap Wake to wake up)");
    } else {
      setPose("idle");
      playMeow();
      setBubble("I'm awake! Want to play?");
      revertPose();
    }
  };

  const doTalk = () => {
    if (!insightResult) {
      setBubble("Let me crunch this month's numbers…");
      return;
    }
    setPose("talk");
    setBubble("Let me tell you about this month's spending!");
    const text = resultToSpeechText(insightResult);
    try {
      speak(text);
    } catch {
      /* TTS unavailable */
    }
    revertPose(8000);
  };

  if (!open) return null;

  const pickerItems = picker ? ownedByKind[picker] : [];

  return (
    <div className="cat-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Lucky cat companion">
      <div className="cat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cat-modal-header">
          <span className="cat-modal-title">🐱 Lucky Cat</span>
          <div className="cat-happiness" title={`Joy ${state.happiness}`}>
            <span className="cat-happiness-label">Joy</span>
            <div className="cat-happiness-bar">
              <div className="cat-happiness-fill" style={{ width: `${state.happiness}%` }} />
            </div>
            <span className="cat-happiness-num">{state.happiness}</span>
          </div>
          <button className="cat-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Scene: cozy room + cat pose + speech bubble */}
        <div className="cat-scene" style={sceneBg ? { backgroundImage: `url(${sceneBg})` } : undefined}>
          {bubble && <div className="cat-bubble">{bubble}</div>}
          {!themeArt && (
            CAT_POSES[pose] ? (
              <img className="cat-figure" src={CAT_POSES[pose]} alt="Lucky cat" />
            ) : (
              <div className="cat-figure cat-figure--emoji">🐱</div>
            )
          )}
          {state.asleep && <div className="cat-sleep-z">💤</div>}
        </div>

        {/* Drop / check-in notices */}
        {dropNotice && (
          <div className="cat-notice">🎁 Dropped: {dropNotice.emoji} {dropNotice.name}</div>
        )}
        {checkinItems && (
          <div className="cat-notice">📅 Check-in rewards: {checkinItems.map((i) => `${i.emoji} ${i.name}`).join(", ")}</div>
        )}

        {/* Item picker */}
        {picker && (
          <div className="cat-picker">
            <div className="cat-picker-title">
              {picker === "food" ? "Pick a treat to feed" : picker === "toy" ? "Pick a toy to play with" : "Pick a care item"}
              <button className="cat-picker-close" onClick={() => setPicker(null)}>✕</button>
            </div>
            <p className="muted" style={{ fontSize: 12, margin: "0 0 8px" }}>
              {picker === "food"
                ? "🍖 Food keeps your cat happy and fed."
                : picker === "toy"
                  ? "🐾 Toys are for playtime together!"
                  : "💆 Care items make grooming extra relaxing."}
            </p>
            {pickerItems.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>
                Backpack is empty — check in daily to earn items!
              </p>
            ) : (
              <div className="cat-picker-items">
                {pickerItems.map((item: CatItem & { count?: number }) => (
                  <button
                    key={item.id}
                    className="cat-item-btn"
                    onClick={() => usePickedItem(picker, item)}
                    title={item.blurb}
                  >
                    <span className="cat-item-emoji">{item.emoji}</span>
                    <span className="cat-item-name">{item.name}</span>
                    <span className="cat-item-count">×{item.count ?? state.inventory[item.id] ?? 0}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inventory strip */}
        <div className="cat-inventory">
          <span className="cat-inventory-label">🎒 Backpack</span>
          {Object.keys(state.inventory).length === 0 ? (
            <span className="muted" style={{ fontSize: 12 }}>Empty — check in to earn items</span>
          ) : (
            <div className="cat-inventory-items">
              {Object.entries(state.inventory).map(([id, count]) => {
                const item = getItem(id);
                if (!item || count <= 0) return null;
                return (
                  <span key={id} className="cat-inventory-item" title={`${item.name}：${item.blurb}`}>
                    {item.emoji}×{count}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="cat-actions">
          {canCheckIn && (
            <button className="cat-action cat-action--checkin" onClick={doCheckIn}>
              📅 Check in
            </button>
          )}
          <button className="cat-action" onClick={() => setPicker("food")} disabled={state.asleep}>
            🍖<span>{ACTION_LABELS.feed}</span>
          </button>
          <button className="cat-action" onClick={() => setPicker("toy")} disabled={state.asleep}>
            🐾<span>{ACTION_LABELS.play}</span>
          </button>
          <button className="cat-action" onClick={() => setPicker("care")} disabled={state.asleep}>
            💆<span>{ACTION_LABELS.groom}</span>
          </button>
          <button className="cat-action" onClick={doCleanLitter} disabled={state.asleep}>
            💩<span>{ACTION_LABELS.poop}</span>
          </button>
          <button className="cat-action" onClick={doToggleSleep}>
            {state.asleep ? "☀️" : "🌙"}<span>{state.asleep ? ACTION_LABELS.wake : ACTION_LABELS.sleep}</span>
          </button>
          <button className="cat-action" onClick={doTalk} disabled={state.asleep || isSpeaking}>
            🎧<span>{ACTION_LABELS.talk}</span>
          </button>
        </div>
        {!loaded && <p className="muted" style={{ fontSize: 12 }}>Loading…</p>}
      </div>
      {rewardShow && (
        <RewardCelebration
          title={rewardShow.title}
          items={rewardShow.items}
          onDone={() => setRewardShow(null)}
        />
      )}
    </div>
  );
}

/** All catalog items (for tests / debugging). */
export function allCatItems(): CatItem[] {
  return CAT_ITEMS;
}
