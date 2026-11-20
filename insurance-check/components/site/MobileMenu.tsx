"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileMenu({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-charcoal hover:bg-sage"
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
      </button>
      <div id={id} hidden={!open} className="absolute inset-x-0 top-full border-b border-navy-100 bg-ivory shadow-lift">
        <nav aria-label="모바일 메뉴" className="container flex flex-col py-3">
          {items.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-4 text-[19px] font-semibold text-charcoal hover:bg-sage"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
