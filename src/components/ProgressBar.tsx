import { percent } from "@/lib/format";

export function ProgressBar({ count, goal }: { count: number; goal: number }) {
  const pct = percent(count, goal);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>
          <strong className="text-2xl">{count.toLocaleString("en-US")}</strong> signatures
        </span>
        <span className="text-neutral-500">Goal {goal.toLocaleString("en-US")}</span>
      </div>
      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-200"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Signature progress"
      >
        <div className="h-full bg-neutral-900 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
