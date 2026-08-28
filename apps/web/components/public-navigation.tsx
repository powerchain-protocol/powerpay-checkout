"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Menu, ShoppingBag, X } from "lucide-react";
import { ROUTES } from "@/constants/routes";

const navItems = [
  { href: ROUTES.checkout, label: "Buy PWRC", shortLabel: "Buy", Icon: ShoppingBag },
  { href: ROUTES.send, label: "Send", shortLabel: "Send", Icon: ArrowUpFromLine },
  { href: ROUTES.receive, label: "Receive", shortLabel: "Receive", Icon: ArrowDownToLine },
] as const;

export function PublicNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousActive = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []);
    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      (triggerRef.current ?? previousActive)?.focus();
    };
  }, [open]);

  return (
    <>
      <nav className="header-nav desktop-public-nav" aria-label="PowerPay primary navigation">
        {navItems.map(({ href, shortLabel, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              className={`header-link ${active ? "active" : ""}`}
              href={href}
              key={href}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={16} />
              <span>{shortLabel}</span>
            </Link>
          );
        })}
      </nav>

      <button
        ref={triggerRef}
        type="button"
        className="public-nav-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="powerpay-mobile-navigation"
        onClick={() => setOpen(true)}
      >
        <Menu size={18} />
        <span>Menu</span>
      </button>

      {open ? (
        <div className="public-nav-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div
            id="powerpay-mobile-navigation"
            ref={dialogRef}
            className="public-nav-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-nav-title"
            aria-describedby="public-nav-description"
          >
            <div className="public-nav-dialog-head">
              <div>
                <span className="section-kicker">PowerPay</span>
                <h2 id="public-nav-title">Navigation</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation">
                <X size={18} />
              </button>
            </div>
            <p id="public-nav-description">Move between PWRC checkout and wallet transaction tools.</p>
            <nav className="public-nav-list" aria-label="PowerPay mobile navigation">
              {navItems.map(({ href, label, Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    href={href}
                    key={href}
                    className={active ? "active" : ""}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <span><Icon size={19} /></span>
                    <strong>{label}</strong>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
