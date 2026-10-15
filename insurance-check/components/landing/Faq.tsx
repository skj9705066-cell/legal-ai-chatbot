"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { FAQ } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Section } from "./Section";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" eyebrow="FAQ" title="자주 묻는 질문" tone="tint">
      <div className="mx-auto max-w-3xl divide-y divide-navy-100 overflow-hidden rounded-2xl border border-navy-200/80 bg-white">
        {FAQ.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q}>
              <h3>
                <button
                  type="button"
                  id={`faq-q-${i}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15.5px] font-bold text-navy hover:bg-navy-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue sm:px-6 sm:py-5 sm:text-[16.5px]"
                >
                  <span>
                    <span className="mr-2 text-blue" aria-hidden="true">
                      Q
                    </span>
                    {f.q}
                  </span>
                  <ChevronDown className={cn("h-5 w-5 shrink-0 text-navy-400 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                </button>
              </h3>
              <div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} hidden={!isOpen} className="px-5 pb-5 sm:px-6">
                <p className="text-[14.5px] leading-[1.75] text-navy-600">{f.a}</p>
                {f.q.startsWith("동의를 철회") && (
                  <Link href="/privacy/withdraw" className="mt-2 inline-block text-[14px] font-semibold text-blue underline-offset-4 hover:underline">
                    동의 철회·삭제 요청 페이지로 이동
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
