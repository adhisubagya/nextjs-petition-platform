import { Card, CardContent } from "@/components/ui/card";
import { percent } from "@/lib/format";

export function ProgressBar({ count, goal }: { count: number; goal: number }) {
  const pct = percent(count, goal);
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-4xl font-bold tracking-tight tabular-nums">{count.toLocaleString("en-US")}</p>
            <p className="text-sm text-muted-foreground">signatures</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p className="font-medium text-foreground tabular-nums">{pct}%</p>
            <p>of {goal.toLocaleString("en-US")} goal</p>
          </div>
        </div>
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Signature progress"
        >
          <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}
