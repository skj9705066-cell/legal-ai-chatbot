import { Check } from "lucide-react";
import type { PublicConfig } from "@/lib/config";
import { trialMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";

const JOURNEY = [
  { short: "신청", long: "점검 신청" },
  { short: "접수 완료", long: "신청 완료" },
  { short: "보장 분석", long: "보장 분석 (선택)" },
];

/** 신청 이후 화면 공통 틀. journey를 주면 상단에 진행 위치를 보여준다. */
export function ApplyShell({
  config,
  children,
  journey,
  wide = false,
}: {
  config: PublicConfig;
  children: React.ReactNode;
  journey?: 1 | 2;
  wide?: boolean;
}) {
  const trial = trialMode(config.mode);
  return (
    <>
      {trial && <DemoBanner trial={trial} />}
      <SiteHeader trial={trial} />
      <main id="main" className="min-h-[70svh] bg-navy-50">
        <div className={cn("container py-8 sm:py-14", wide ? "max-w-3xl" : "max-w-[600px]")}>
          {journey && (
            <ol aria-label="신청 진행 상황" className="mb-6 flex items-center gap-2 text-[14px] font-semibold sm:mb-8">
              {JOURNEY.map(({ short, long }, i) => {
                const done = i < journey;
                const current = i === journey;
                return (
                  <li key={long} aria-current={current ? "step" : undefined} className="flex min-w-0 items-center gap-2">
                    {i > 0 && <span aria-hidden="true" className={cn("h-px w-4 shrink-0 sm:w-8", done || current ? "bg-blue" : "bg-navy-200")} />}
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px]",
                        done ? "bg-blue text-white" : current ? "bg-navy text-white" : "bg-navy-200 text-navy-600",
                      )}
                      aria-hidden="true"
                    >
                      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className={cn("whitespace-nowrap", current ? "text-navy" : "text-navy-600")}>
                      <span className="sm:hidden">{short}</span>
                      <span className="hidden sm:inline">{long}</span>
                      <span className="sr-only">{done ? " (완료)" : current ? " (현재)" : ""}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {children}
        </div>
      </main>
      <SiteFooter operator={config.operator} trial={trial} />
    </>
  );
}
