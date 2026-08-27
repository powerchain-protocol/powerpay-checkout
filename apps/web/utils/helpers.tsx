import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, ExternalLink } from "lucide-react";
import { cn } from "./util";

export function StatusPill({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={cn("status-pill", ok ? "status-pill-ok" : "status-pill-warn")}>
      {ok ? <CircleCheck size={13} /> : <CircleAlert size={13} />}
      {children}
    </span>
  );
}

export function ExternalAnchor({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="external-anchor">
      {children}<ExternalLink size={13} aria-hidden="true" />
    </a>
  );
}
