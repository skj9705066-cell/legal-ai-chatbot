import { CircleCheck } from "lucide-react";
import { CHECK_CASES, CHECK_CASES_FOOTNOTE } from "@/lib/content";
import { ApplyCta } from "./ApplyCta";
import { Section } from "./Section";

export function CheckCases() {
  return (
    <Section id="cases" eyebrow="체크리스트" title="이런 경우 점검해 보세요">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CHECK_CASES.map((c) => (
          <li key={c.title} className="rounded-2xl border border-navy-200/80 bg-white p-5">
            <p className="flex items-start gap-2 text-[16px] font-bold leading-snug text-navy">
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-mint" aria-hidden="true" />
              {c.title}
            </p>
            <p className="mt-2 pl-7 text-[14px] leading-relaxed text-navy-600">{c.body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[13px] leading-relaxed text-navy-500">{CHECK_CASES_FOOTNOTE}</p>
      <div className="mt-8">
        <ApplyCta source="cases" size="lg" variant="navy">
          내 상황 점검 상담 신청
        </ApplyCta>
      </div>
    </Section>
  );
}
