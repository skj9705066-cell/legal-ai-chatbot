"use client";

import { useRef } from "react";
import { FileText, ShieldAlert } from "lucide-react";
import { SERVICE_TYPES, type ServiceType } from "@/lib/types";
import { REFUND_COMPARISON, SERVICE_CONTENT } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Reveal } from "@/components/motion/Reveal";
import { useApply } from "./ApplyContext";
import { ApplyCta } from "./ApplyCta";
import { Section, SectionHeading } from "./Section";

const ACTOR_STYLE: Record<string, string> = {
  고객: "bg-navy-100 text-navy-700",
  상담사: "bg-blue-50 text-blue-700",
  보험사: "bg-mint-50 text-mint-700",
  "공식 서비스": "bg-mint-50 text-mint-700",
};

export function Process() {
  const { serviceType, selectType } = useApply();
  const active: ServiceType = serviceType ?? "unclaimed";
  const c = SERVICE_CONTENT[active];
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = SERVICE_TYPES.indexOf(active);
    const map: Record<string, number> = {
      ArrowRight: (i + 1) % SERVICE_TYPES.length,
      ArrowLeft: (i - 1 + SERVICE_TYPES.length) % SERVICE_TYPES.length,
      Home: 0,
      End: SERVICE_TYPES.length - 1,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    const t = SERVICE_TYPES[map[e.key]];
    selectType(t);
    tabRefs.current[t]?.focus();
  };

  return (
    <Section id="process">
      <Reveal>
      <SectionHeading
        id="process"
        eyebrow="점검 절차"
        title="점검은 4단계로 진행돼요"
        description="청구와 지급 결정은 고객님과 보험사 사이에서 이뤄집니다. 저희는 확인 방법과 순서를 알기 쉽게 안내해 드려요."
      />
      </Reveal>

      <div
        role="tablist"
        aria-label="점검 유형별 절차"
        onKeyDown={onKeyDown}
        className="mt-10 grid grid-cols-3 gap-1 rounded-2xl bg-navy-50 p-1.5 sm:inline-grid sm:min-w-[520px] lg:mt-12"
      >
        {SERVICE_TYPES.map((t) => (
          <button
            key={t}
            ref={(el) => {
              tabRefs.current[t] = el;
            }}
            role="tab"
            id={`tab-${t}`}
            aria-selected={active === t}
            aria-controls="process-panel"
            tabIndex={active === t ? 0 : -1}
            onClick={() => selectType(t)}
            className={cn(
              "rounded-xl px-2 py-3 text-[15px] font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue sm:px-4 sm:text-[16px]",
              active === t ? "bg-navy text-white shadow-card" : "text-navy-600 hover:bg-white",
            )}
          >
            {SERVICE_CONTENT[t].tabLabel}
          </button>
        ))}
      </div>

      <div id="process-panel" role="tabpanel" aria-labelledby={`tab-${active}`} tabIndex={0} className="mt-6 focus-visible:outline-none">
        <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <div className="rounded-3xl bg-navy-50 p-6 sm:p-8">
            <h3 className="text-[20px] font-bold tracking-[-0.02em] text-navy">{c.title}</h3>
            <ol className="relative mt-7 space-y-7">
              <span aria-hidden="true" className="absolute bottom-3 left-[17px] top-3 w-px bg-navy-200" />
              {c.steps.map((s, i) => (
                <li key={s.title} className="relative flex gap-4">
                  <span
                    aria-hidden="true"
                    className="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-[15px] font-bold text-white ring-4 ring-navy-50"
                  >
                    {i + 1}
                  </span>
                  <div className="pt-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-[17px] font-bold text-navy">
                        <span className="sr-only">{i + 1}단계: </span>
                        {s.title}
                      </span>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[13px] font-semibold", ACTOR_STYLE[s.actor])}>{s.actor}</span>
                    </p>
                    <p className="mt-1.5 text-[16px] leading-[1.65] text-navy-600">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col gap-5">
            <div className="rounded-3xl bg-navy-50 p-6 sm:p-7">
              <p className="flex items-center gap-2 text-[17px] font-bold text-navy">
                <FileText className="h-5 w-5 text-blue" aria-hidden="true" />
                준비하면 좋은 자료
              </p>
              <ul className="mt-4 space-y-2.5">
                {c.documents.map((d) => (
                  <li key={d} className="flex gap-2.5 text-[16px] leading-relaxed text-navy-600">
                    <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-navy-50 p-6 sm:p-7">
              <p className="flex items-center gap-2 text-[17px] font-bold text-navy">
                <ShieldAlert className="h-5 w-5 text-caution" aria-hidden="true" />꼭 확인하세요
              </p>
              <ul className="mt-4 space-y-2.5">
                {c.notices.map((n) => (
                  <li key={n} className="flex gap-2.5 text-[16px] leading-relaxed text-navy-600">
                    <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-navy-400" />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {active === "refund" && (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {REFUND_COMPARISON.map((r) => (
              <div key={r.term} className="rounded-3xl bg-navy-50 p-6 sm:p-7">
                <p className="text-[19px] font-bold text-navy">{r.term}</p>
                <dl className="mt-4 space-y-3 text-[16px] leading-relaxed">
                  <div>
                    <dt className="text-[14px] font-semibold text-navy-600">무엇인가요</dt>
                    <dd className="mt-0.5 text-ink">{r.what}</dd>
                  </div>
                  <div>
                    <dt className="text-[14px] font-semibold text-navy-600">확인 방법</dt>
                    <dd className="mt-0.5 text-ink">{r.how}</dd>
                  </div>
                  <div>
                    <dt className="text-[14px] font-semibold text-navy-600">계약·보장</dt>
                    <dd className="mt-0.5 font-semibold text-navy">{r.effect}</dd>
                  </div>
                </dl>
              </div>
            ))}
            <Alert tone="caution" className="md:col-span-2" title="해지 전에 꼭 확인하세요">
              해지하면 그 보험의 보장이 사라지고, 해지환급금은 납입한 보험료보다 적을 수 있습니다. 다시 가입할 때는 나이·건강 상태에 따라 보험료가
              오르거나 가입이 어려울 수 있어요. 저희는 해지를 권유하지 않습니다.
            </Alert>
          </div>
        )}
        {active === "hidden" && (
          <Alert tone="info" className="mt-5" title="공식 조회 서비스는 직접 무료로 이용할 수 있어요">
            숨은보험금은 공식 조회 서비스(내보험찾아줌)에서 본인이 직접 조회할 수 있고, 이 사이트의 신청이나 개인정보 입력이 필요하지 않습니다.
            조회 방법이 어렵거나 결과를 함께 확인하고 싶을 때 상담을 신청해 주세요.{" "}
            <a href="#faq-official" className="font-semibold text-blue-700 underline underline-offset-2">
              자세히 보기
            </a>
          </Alert>
        )}
        {active === "unclaimed" && (
          <Alert tone="neutral" className="mt-5" title="청구 안내와 손해사정은 다릅니다">
            저희는 청구 방법과 필요 서류를 안내합니다. 보험금 지급 여부 판단과 손해액 산정은 보험회사와 손해사정사의 업무입니다.
          </Alert>
        )}

        <div className="mt-10">
          <ApplyCta source="process" type={active} size="xl" className="w-full sm:w-auto sm:min-w-[320px]">
            이 절차로 무료 점검 상담 신청하기
          </ApplyCta>
        </div>
      </div>
    </Section>
  );
}
