import { PartyPopper } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_MODE } from "@/lib/demo";
import { ShareButtons } from "./ShareButtons";

/** Replaces the sign form once this visitor has signed: one signature, then share. */
export function ShareCard({ title, url }: { title: string; url: string }) {
  return (
    <Card className="shadow-lg">
      <CardHeader className="items-center text-center">
        <PartyPopper className="mb-1 size-8" aria-hidden />
        <CardTitle className="text-xl">Thanks for signing!</CardTitle>
        <CardDescription>
          {DEMO_MODE ? "Demo Mode: nothing was saved. " : ""}Now help it reach the goal by sharing it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ShareButtons url={url} text={`I signed: ${title}`} />
      </CardContent>
    </Card>
  );
}
