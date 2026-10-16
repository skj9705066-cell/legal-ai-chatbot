import { FINAL_CTA } from "@/lib/content";
import { ApplyCta } from "./ApplyCta";

export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="bg-navy-50 pb-12 sm:pb-20 lg:pb-24">
      <div className="container">
        <div id="final-cta" className="relative overflow-hidden rounded-[28px] bg-deep px-6 py-9 text-center sm:px-12 sm:py-14 lg:py-16">
          <svg aria-hidden="true" className="absolute -left-20 -top-20 h-64 w-64 text-white/[0.06]" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="99" stroke="currentColor" strokeWidth="2" />
            <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="2" />
          </svg>
          <h2 id="final-cta-title" className="relative text-balance text-[26px] font-extrabold leading-[1.32] tracking-[-0.03em] text-white sm:text-[36px] lg:text-[42px]">
            {FINAL_CTA.title}
          </h2>
          <div className="relative mt-7 flex flex-col items-center gap-3">
            <ApplyCta source="final" target="types" variant="white" size="xl" className="h-[62px] w-full text-[18px] shadow-none sm:w-auto sm:min-w-[340px]">
              {FINAL_CTA.button}
            </ApplyCta>
            <p className="text-[14px] text-navy-300">{FINAL_CTA.trust}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
