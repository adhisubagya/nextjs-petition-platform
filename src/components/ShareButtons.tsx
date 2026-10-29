"use client";

import { Link2, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const q = encodeURIComponent;
  const cls = "inline-flex items-center gap-2 rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50";

  return (
    <div className="flex flex-wrap gap-2">
      <a className={cls} href={`https://wa.me/?text=${q(`${text} ${url}`)}`} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-4" aria-hidden /> WhatsApp
      </a>
      <a
        className={cls}
        href={`https://x.com/intent/post?text=${q(text)}&url=${q(url)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Share2 className="size-4" aria-hidden /> Post on X
      </a>
      <button
        type="button"
        className={cls}
        onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}
      >
        <Link2 className="size-4" aria-hidden /> {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
