"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { FAQ } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Section, SectionHeading } from "./Section";

export function Faq({ contactPhone }: { contactPhone: string | null }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" tone="tint">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading id="faq" eyebrow="자주 묻는 질문" title="궁금한 점을 모았어요" />
          <p className="mt-4 text-[17px] leading-[1.7] text-navy-600">
            찾는 답이 없다면 상담 신청 후 편하게 물어보세요.
            {contactPhone && (
              <>
                <br />
                전화 문의 <strong className="font-semibold text-navy">{contactPhone}</strong>
              </>
            )}
          </p>
        </div>
        <div className="space-y-3">
          {FAQ.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className={cn("rounded-2xl bg-white transition-shadow", isOpen ? "shadow-card" : "shadow-ring")}>
                <h3>
                  <button
                    type="button"
                    id={`faq-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-5 text-left text-[17px] font-semibold leading-snug text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue sm:px-6 sm:text-[18px]"
                  >
                    {f.q}
                    <Plus
                      className={cn("h-5 w-5 shrink-0 text-navy-500 transition-transform duration-200", isOpen && "rotate-45 text-blue")}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} hidden={!isOpen} className="px-5 pb-6 sm:px-6">
                  <p className="text-[16px] leading-[1.75] text-navy-600">{f.a}</p>
                  {f.q.startsWith("동의를 철회") && (
                    <Link href="/privacy/withdraw" className="mt-3 inline-block text-[16px] font-semibold text-blue-700 underline-offset-4 hover:underline">
                      동의 철회·삭제 요청 페이지로 이동
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
