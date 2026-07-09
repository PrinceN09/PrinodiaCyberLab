"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Layers,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type Card = {
  id: string;
  deck: string;
  front: string;
  back: string;
  confidence: number;
};
const EMPTY = { deck: "General", front: "", back: "" };

export function FlashcardsClient({ initial }: { initial: Card[] }) {
  const [cards, setCards] = useState<Card[]>(initial);
  const [deck, setDeck] = useState<string>("All");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const decks = useMemo(
    () => ["All", ...Array.from(new Set(cards.map((c) => c.deck)))],
    [cards]
  );
  const deckCards = useMemo(
    () => (deck === "All" ? cards : cards.filter((c) => c.deck === deck)),
    [cards, deck]
  );
  const current = deckCards[index] ?? null;

  function go(delta: number) {
    setFlipped(false);
    setIndex((i) => (i + delta + deckCards.length) % Math.max(deckCards.length, 1));
  }

  async function rate(confidence: number) {
    if (!current) return;
    setCards((prev) =>
      prev.map((c) => (c.id === current.id ? { ...c, confidence } : c))
    );
    await fetch(`/api/flashcards/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confidence, reviewed: true }),
    });
    setTimeout(() => go(1), 200);
  }

  async function add() {
    setSaving(true);
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const saved = await res.json();
      setCards([...cards, saved]);
      setForm({ ...EMPTY });
      setAdding(false);
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {decks.map((d) => (
            <button
              key={d}
              onClick={() => {
                setDeck(d);
                setIndex(0);
                setFlipped(false);
              }}
              className={cn(
                "border px-3 py-1.5 text-xs transition-colors",
                deck === d
                  ? "border-cds-blue bg-cds-blue/10 text-cds-text"
                  : "border-cds-border text-cds-text-secondary hover:text-cds-text"
              )}
            >
              {d}
            </button>
          ))}
        </div>
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> New card
        </Button>
      </div>

      {deckCards.length === 0 || !current ? (
        <div className="border border-cds-border bg-cds-layer">
          <EmptyState
            icon={Layers}
            title="No flashcards in this deck"
            description="Create flashcards to drill key concepts, event IDs, ports, and frameworks."
            action={
              <Button variant="primary" onClick={() => setAdding(true)}>
                <Plus className="h-4 w-4" /> New card
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <button
            onClick={() => setFlipped((f) => !f)}
            className="group relative flex min-h-[16rem] w-full flex-col items-center justify-center border border-cds-border bg-cds-layer p-8 text-center transition-colors hover:border-cds-border-strong"
          >
            <span className="absolute left-4 top-4 text-2xs font-semibold uppercase tracking-wider text-cds-helper">
              {current.deck} · {flipped ? "Answer" : "Question"}
            </span>
            <span className="absolute right-4 top-4 flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={cn(
                    "h-3 w-3",
                    n <= current.confidence
                      ? "text-cds-yellow"
                      : "text-cds-border-strong"
                  )}
                  fill={n <= current.confidence ? "currentColor" : "none"}
                />
              ))}
            </span>
            <p className="max-w-xl text-lg leading-relaxed text-cds-text">
              {flipped ? current.back : current.front}
            </p>
            <span className="absolute bottom-4 flex items-center gap-1.5 text-2xs text-cds-helper">
              <RotateCcw className="h-3 w-3" /> Click to flip
            </span>
          </button>

          <div className="mt-4 flex items-center justify-between">
            <Button variant="secondary" onClick={() => go(-1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <div className="text-xs text-cds-helper">
              {index + 1} / {deckCards.length}
            </div>
            <Button variant="secondary" onClick={() => go(1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {flipped && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="mr-1 text-2xs text-cds-helper">
                How well did you know it?
              </span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => rate(n)}
                  className="flex h-8 w-8 items-center justify-center border border-cds-border text-xs text-cds-text-secondary transition-colors hover:border-cds-blue hover:text-cds-text"
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="New flashcard"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={add} disabled={saving}>
              {saving ? "Saving…" : "Add card"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Deck</Label>
            <Input
              value={form.deck}
              onChange={(e) => setForm({ ...form, deck: e.target.value })}
            />
          </div>
          <div>
            <Label>Front (question)</Label>
            <Textarea
              rows={2}
              value={form.front}
              onChange={(e) => setForm({ ...form, front: e.target.value })}
            />
          </div>
          <div>
            <Label>Back (answer)</Label>
            <Textarea
              rows={3}
              value={form.back}
              onChange={(e) => setForm({ ...form, back: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
