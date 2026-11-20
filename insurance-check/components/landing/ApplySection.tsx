import { Info } from "lucide-react";
import { APPLY } from "@/lib/content";
import type { PublicConfig } from "@/lib/config";
import { ApplyForm } from "./ApplyForm";

/**
 * 7. 방문 상담 신청서 섹션. 데스크톱은 왼쪽(안내)·오른쪽(폼) 2열, 모바일은 안내 → 폼.
 */
export function ApplySection({ config }: { config: PublicConfig }) {
  return (
    <section id="apply" aria-labelledby="apply-title" className="scroll-mt-16 bg-sage py-12 sm:py-20 lg:py-24">
      <div className="container grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <div className="lg:pt-4">
          <h2 id="apply-title" tabIndex={-1} className="text-balance text-[30px] font-extrabold leading-[1.32] tracking-[-0.03em] text-charcoal focus:outline-none sm:text-[36px] lg:text-[42px]">
            {APPLY.title}
          </h2>
          <p className="mt-3 text-[18px] leading-[1.7] text-navy-700 sm:text-[19px]">{APPLY.description}</p>
          <ul className="mt-6 space-y-2" data-testid="apply-trust">
            {APPLY.notes.map((n) => (
              <li key={n} className="flex gap-2 text-[15.5px] leading-relaxed text-navy-600">
                <Info className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                {n}
              </li>
            ))}
          </ul>
        </div>
        <ApplyForm config={config} />
      </div>
    </section>
  );
}
