"use client";

import { Check, Link2, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const q = encodeURIComponent;
  const cls = cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full");

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <a className={cls} href={`https://wa.me/?text=${q(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer">
        <MessageCircle aria-hidden /> WhatsApp
      </a>
      <a
        className={cls}
        href={`https://x.com/intent/post?text=${q(text)}&url=${q(url)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Share2 aria-hidden /> Post on X
      </a>
      <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}>
        {copied ? <Check aria-hidden /> : <Link2 aria-hidden />} {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
