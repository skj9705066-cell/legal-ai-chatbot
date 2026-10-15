"use client";

import { useRef } from "react";
import { SERVICE_TYPES, type ServiceType } from "@/lib/types";
import { REFUND_COMPARISON, SERVICE_CONTENT } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { OfficialLink } from "@/components/site/OfficialLink";
import { useApply } from "./ApplyContext";
import { ApplyCta } from "./ApplyCta";
import { Section } from "./Section";

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
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (i + 1) % SERVICE_TYPES.length;
    if (e.key === "ArrowLeft") next = (i - 1 + SERVICE_TYPES.length) % SERVICE_TYPES.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = SERVICE_TYPES.length - 1;
    if (next === null) return;
    e.preventDefault();
    const t = SERVICE_TYPES[next];
    selectType(t);
    tabRefs.current[t]?.focus();
  };

  return (
    <Section
      id="process"
      eyebrow="진행 절차"
      title="유형별로 실제 이렇게 진행됩니다"
      description="청구와 지급 결정은 고객과 보험사 사이에서 이뤄집니다. 저희는 확인 방법과 순서를 안내합니다."
      tone="tint"
    >
      <div role="tablist" aria-label="점검 유형별 절차" className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-card sm:inline-flex" onKeyDown={onKeyDown}>
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
              "shrink-0 rounded-xl px-4 py-2.5 text-[14.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue",
              active === t ? "bg-navy text-white" : "text-navy-600 hover:bg-navy-50",
            )}
          >
            {SERVICE_CONTENT[t].shortTitle}
          </button>
        ))}
      </div>

      <div id="process-panel" role="tabpanel" aria-labelledby={`tab-${active}`} tabIndex={0} className="mt-6 rounded-2xl focus-visible:outline-none">
        <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {c.steps.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl border border-navy-200/80 bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue text-[13px] font-bold text-white" aria-hidden="true">
                  {i + 1}
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-bold", ACTOR_STYLE[s.actor])}>{s.actor}</span>
              </div>
              <p className="mt-3 text-[16px] font-bold text-navy">
                <span className="sr-only">{i + 1}단계: </span>
                {s.title}
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-navy-600">{s.body}</p>
            </li>
          ))}
        </ol>

        {active === "refund" && (
          <div className="mt-6 space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-navy-200/80 bg-white">
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <caption className="sr-only">과오납 보험료와 해지환급금 비교</caption>
                <thead className="bg-navy-50 text-navy">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">구분</th>
                    <th scope="col" className="px-4 py-3 font-bold">무엇인가요</th>
                    <th scope="col" className="px-4 py-3 font-bold">확인 방법</th>
                    <th scope="col" className="px-4 py-3 font-bold">계약·보장</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100 text-navy-600">
                  {REFUND_COMPARISON.map((r) => (
                    <tr key={r.term}>
                      <th scope="row" className="px-4 py-3 font-bold text-navy">{r.term}</th>
                      <td className="px-4 py-3">{r.what}</td>
                      <td className="px-4 py-3">{r.how}</td>
                      <td className="px-4 py-3">{r.effect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Alert tone="caution" title="해지 전에 꼭 확인하세요">
              해지하면 그 보험의 보장이 사라지고, 해지환급금은 납입한 보험료보다 적을 수 있습니다. 다시 가입할 때는 나이·건강 상태에 따라 보험료가
              오르거나 가입이 어려울 수 있습니다. 저희는 해지를 권유하지 않습니다.
            </Alert>
          </div>
        )}
        {active === "hidden" && (
          <Alert tone="info" className="mt-6" title="상담 없이도 바로 조회할 수 있어요">
            숨은보험금 조회는 공식 서비스에서 본인인증만으로 가능합니다.{" "}
            <OfficialLink className="font-semibold text-blue underline underline-offset-2" />
          </Alert>
        )}
        {active === "unclaimed" && (
          <Alert tone="info" className="mt-6" title="안내와 손해사정은 다릅니다">
            저희는 청구 방법과 필요 서류를 안내합니다. 보험금 지급 여부 판단과 손해액 산정은 보험회사와 손해사정사의 업무입니다.
          </Alert>
        )}

        <div className="mt-8">
          <ApplyCta source="process" type={active} size="lg">
            이 절차로 점검 상담 신청
          </ApplyCta>
        </div>
      </div>
    </Section>
  );
}
