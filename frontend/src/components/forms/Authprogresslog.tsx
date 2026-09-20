import { useCallback, useEffect, useRef, useState } from "react";

export type LogTone = "info" | "success" | "error" | "banter";
export type AuthRole = "farmer" | "company";

export interface LogLine {
  id: number;
  elapsed: number;
  tone: LogTone;
  text: string;
}

const BANTER_INTERVAL_MS = 3500;
const WAKING_NOTICE_MS = 7000;
const LONG_WAIT_NOTICE_MS = 30000;

const WAKING_NOTICE =
  "Still waiting. If the server was idle, the first request can take up to a minute.";
const LONG_WAIT_NOTICE =
  "Still going. Slow starts happen, and this hasn't failed yet.";

export const LOGIN_BANTER: Record<AuthRole, string[]> = {
  farmer: [
    "Waking the server. It naps like it's already off-season.",
    "Checking your password. Your tulsi has better security than half the internet.",
    "The ledger never loses a receipt, unlike everyone's desk drawer.",
    "Somewhere a rooster is judging our response time.",
    "Patience: the one crop that never fails.",
    "Still here? Good. The cows have waited longer for less.",
    "A scarecrow would be faster, but it can't verify passwords.",
    "The server is on a free plan, carrying this water one bucket at a time.",
    "Your crops are fine. Only the connection is wilting.",
    "Rain, sunshine or cold start, we deliver.",
  ],
  company: [
    "Waking the server. It naps like it's already off-season.",
    "Checking your credentials. Farmers ask for references, and the ledger remembers everything.",
    "Loading your orders. Every kilo of tulsi accounted for, unlike the office biscuits.",
    "Somewhere a rooster is judging our response time.",
    "Patience: the one crop that never fails.",
    "A scarecrow would be faster, but it can't verify passwords.",
    "The server is on a free plan, carrying this water one bucket at a time.",
    "Procurement at farm speed: slow to sow, worth the harvest.",
    "Rain, sunshine or cold start, we deliver.",
    "Still here? Good. The cows have waited longer for less.",
  ],
};

export const REGISTER_BANTER: Record<AuthRole, string[]> = {
  farmer: [
    "Waking the server. Give it a cup of chai.",
    "Writing your name in the ledger. Ink is permanent, so we hope you spelled it right.",
    "The network nodes are agreeing with each other. Family WhatsApp groups never manage that.",
    "Pinning your farm on the map. The cows have been notified, unofficially.",
    "Your herbs are about to get a better paper trail than most of us.",
    "Cutting out the middlemen, one signup at a time.",
    "Even a banyan tree started slow.",
    "Nothing to water here. Your account grows on its own.",
    "Somewhere a rooster is judging our response time.",
    "The server is on a free plan, doing its best with one bucket of water.",
  ],
  company: [
    "Waking the server. Give it a cup of chai.",
    "Writing your company into the ledger. Ink is permanent, so check the spelling.",
    "The network nodes are agreeing with each other. Family WhatsApp groups never manage that.",
    "Setting up your buyer account. Bring an appetite for tulsi.",
    "Making sure you're a real company. Farmers ask this a lot, and they're right.",
    "Even a banyan tree started slow.",
    "Nothing to water here. Your account grows on its own.",
    "Somewhere a rooster is judging our response time.",
    "The server is on a free plan, doing its best with one bucket of water.",
    "Direct from farm to buyer, with no middlemen tax.",
  ],
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function describeError(err: unknown, fallback: string): string {
  if (err instanceof TypeError) {
    return "Couldn't reach the server. It may still be waking up, so try again in a few seconds.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function useProgressLog(banter: string[]) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const startedAt = useRef(0);
  const nextId = useRef(0);
  const queue = useRef<string[]>([]);

  const push = useCallback((tone: LogTone, text: string) => {
    const id = nextId.current;
    nextId.current += 1;
    const elapsed = (Date.now() - startedAt.current) / 1000;
    setLines((prev) => [...prev, { id, elapsed, tone, text }]);
  }, []);

  const start = useCallback(
    (firstLine: string) => {
      startedAt.current = Date.now();
      nextId.current = 0;
      queue.current = shuffle(banter);
      setLines([]);
      setRunning(true);
      push("info", firstLine);
    },
    [banter, push],
  );

  const stop = useCallback(() => setRunning(false), []);

  useEffect(() => {
    if (!running) return;

    const banterTimer = window.setInterval(() => {
      if (queue.current.length === 0) queue.current = shuffle(banter);
      const line = queue.current.pop();
      if (line) push("banter", line);
    }, BANTER_INTERVAL_MS);

    const wakingTimer = window.setTimeout(
      () => push("info", WAKING_NOTICE),
      WAKING_NOTICE_MS,
    );

    const longWaitTimer = window.setTimeout(
      () => push("info", LONG_WAIT_NOTICE),
      LONG_WAIT_NOTICE_MS,
    );

    return () => {
      window.clearInterval(banterTimer);
      window.clearTimeout(wakingTimer);
      window.clearTimeout(longWaitTimer);
    };
  }, [running, banter, push]);

  return { lines, running, start, push, stop };
}

const TONE_STYLE: Record<LogTone, { glyph: string; className: string }> = {
  info: { glyph: "›", className: "text-emerald-100/80" },
  success: { glyph: "✓", className: "text-emerald-300" },
  error: { glyph: "✗", className: "text-rose-300" },
  banter: { glyph: "🌾", className: "italic text-amber-200" },
};

function formatElapsed(seconds: number) {
  const total = Math.floor(seconds);
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  return `${minutes}:${secs}`;
}

interface ProgressLogProps {
  lines: LogLine[];
  running: boolean;
}

export function ProgressLog({ lines, running }: ProgressLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  if (lines.length === 0) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-lg bg-[#0f2a1a] shadow-inner">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] text-emerald-100/60">
        <span>Live log</span>
        <span className="flex items-center gap-1.5">
          {running && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
          )}
          {running ? "working" : "finished"}
        </span>
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        className="max-h-44 space-y-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed"
      >
        {lines.map((line) => (
          <p
            key={line.id}
            className={`flex gap-2 ${TONE_STYLE[line.tone].className}`}
          >
            <span className="shrink-0 text-emerald-100/40">
              {formatElapsed(line.elapsed)}
            </span>
            <span className="shrink-0">{TONE_STYLE[line.tone].glyph}</span>
            <span>{line.text}</span>
          </p>
        ))}
      </div>
    </div>
  );
}