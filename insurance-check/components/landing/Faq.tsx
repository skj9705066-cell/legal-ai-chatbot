"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { CARD_POINT_LOOKUP, FAQ, FAQ_PRIMARY } from "@/lib/content";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { OfficialLink } from "@/components/site/OfficialLink";
import { Reveal } from "@/components/motion/Reveal";
import { Section, SectionHeading } from "./Section";

const OFFICIAL_Q = FAQ.findIndex((f) => f.q.startsWith("숨은 보험금은 혼자"));
const CARD_Q = FAQ.findIndex((f) => f.q.startsWith("카드포인트는"));

export function Faq({ contactPhone }: { contactPhone: string | null }) {
  const [open, setOpen] = useState<number | null>(null);
  const [more, setMore] = useState(false);

  // 헤더·절차 안내의 "공식 조회 안내"(#faq-official)로 들어오면 해당 질문을 펼친다
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#faq-official") {
        if (OFFICIAL_Q >= FAQ_PRIMARY) setMore(true);
        setOpen(OFFICIAL_Q);
        // '더 보기' 안의 질문이면 렌더된 뒤에 위치로 이동
        window.setTimeout(() => document.getElementById("faq-official")?.scrollIntoView({ block: "start" }), 60);
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <Section id="faq" tone="white">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading id="faq" title="자주 묻는 질문" />
          {contactPhone && (
            <p className="mt-4 text-[18px] text-navy-600">
              전화 문의{" "}
              <a href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`} className="font-bold text-forest-700 underline underline-offset-4">
                {contactPhone}
              </a>
            </p>
          )}
        </Reveal>
        <div className="space-y-2.5">
          {FAQ.map((f, i) => {
            if (i >= FAQ_PRIMARY && !more) return null;
            const isOpen = open === i;
            return (
              <div
                key={f.q}
                id={i === OFFICIAL_Q ? "faq-official" : undefined}
                className={cn("scroll-mt-28 rounded-2xl bg-ivory transition-shadow duration-300", isOpen ? "shadow-card ring-1 ring-forest-200" : "ring-1 ring-navy-100 hover:shadow-card")}
              >
                <h3>
                  <button
                    type="button"
                    id={`faq-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a-${i}`}
                    onClick={() => {
                      if (!isOpen) track("faq_open");
                      setOpen(isOpen ? null : i);
                    }}
                    className="flex min-h-[64px] w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left text-[18px] font-semibold leading-snug text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest sm:px-6 sm:py-5 sm:text-[20px]"
                  >
                    {f.q}
                    <Plus
                      className={cn("h-6 w-6 shrink-0 text-navy-500 transition-transform duration-300", isOpen && "rotate-45 text-forest")}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} className="faq-panel" data-open={isOpen}>
                  <div>
                    <div className="px-5 pb-6 sm:px-6">
                      <p className="text-[18px] leading-[1.8] text-navy-700">{f.a}</p>
                      {i === CARD_Q && (
                        <ul className="mt-3 space-y-1 text-[17px]">
                          {CARD_POINT_LOOKUP.map((c) => (
                            <li key={c.url}>
                              <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-forest-700 underline underline-offset-4">
                                {c.name}
                                <span className="sr-only">(새 창에서 열림)</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                      {i === OFFICIAL_Q && (
                        <p className="mt-3 text-[17px] leading-[1.7] text-navy-700">
                          공식 사이트:{" "}
                          <OfficialLink className="font-semibold text-forest-700 underline underline-offset-4" />
                        </p>
                      )}
                      {f.q.startsWith("동의를 철회") && (
                        <Link href="/privacy/withdraw" className="mt-3 inline-block text-[17px] font-semibold text-forest-700 underline underline-offset-4">
                          동의 철회·삭제 요청 페이지로 이동
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {!more && (
            <button
              type="button"
              onClick={() => setMore(true)}
              className="flex min-h-[60px] w-full items-center justify-center gap-1 rounded-2xl text-[18px] font-semibold text-navy-700 ring-2 ring-inset ring-navy-200 hover:bg-ivory hover:text-charcoal"
            >
              질문 {FAQ.length - FAQ_PRIMARY}개 더 보기
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </Section>
  );
}
