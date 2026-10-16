"use client";

import { useState } from "react";
import { Check, Info } from "lucide-react";
import type { ServiceType } from "@/lib/types";
import { ACTION, EMPATHY, PICK, SERVICE_CONTENT } from "@/lib/content";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { CaseArt, ObjectArt } from "@/components/illustrations/Art";
import { Reveal } from "@/components/motion/Reveal";
import { Stagger } from "@/components/motion/Stagger";
import { useApply } from "./ApplyContext";
import { ApplyCta } from "./ApplyCta";

const sceneTitle = "text-balance text-[26px] font-extrabold leading-[1.3] tracking-[-0.03em] text-navy sm:text-[32px] lg:text-[38px]";

/** 장면 2 — 공감: "보험료는 매달 내는데…" + 보험증권·병원 영수증·달력이 하나씩 등장 */
export function EmpathyScene() {
  return (
    <section id="empathy" aria-labelledby="empathy-title" className="bg-white py-12 text-center sm:py-20 lg:py-24">
      <div className="container">
        <Reveal>
          <h2 id="empathy-title" className={sceneTitle}>
            {EMPATHY.title}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-balance text-[20px] font-bold leading-[1.45] tracking-[-0.025em] text-blue sm:text-[24px]">{EMPATHY.emphasis}</p>
        </Reveal>
        <Stagger as="ul" className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-2 sm:max-w-xl sm:gap-6 lg:mt-12">
          {EMPATHY.items.map((it, i) => (
            <li key={it.art} className="stagger-item flex flex-col items-center" style={{ "--i": i } as React.CSSProperties}>
              <ObjectArt kind={it.art} className="h-[92px] w-[92px] sm:h-[120px] sm:w-[120px] lg:h-[140px] lg:w-[140px]" />
              <span className="mt-2 text-[14.5px] font-semibold tracking-[-0.02em] text-navy sm:text-[16px]">{it.label}</span>
            </li>
          ))}
        </Stagger>
        <Reveal>
          <p className="mx-auto mt-7 max-w-md text-pretty text-[16px] leading-[1.6] text-navy-600 sm:text-[17px]" data-testid="empathy-desc">
            {EMPATHY.description}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * 장면 4 — "혹시 나도 해당될까요?" 선택형 카드. 고른 카드의 점검 유형이 신청 폼에 바로 반영된다.
 * '잘 모르겠어요'는 유형을 비워 두고 폼에서 고르게 한다. 고른다고 화면을 강제로 이동시키지 않는다.
 */
export function PickScene() {
  const { serviceType, selectType, clearType } = useApply();
  const [picked, setPicked] = useState<string | null>(null);

  const choose = (id: string, type: ServiceType | null) => {
    setPicked(id);
    track("scenario_card_click", { serviceType: type });
    if (type) selectType(type);
    else clearType();
  };
  // 다른 곳(폼·절차 탭)에서 유형을 바꾸면 그 유형에 맞는 카드를 선택 상태로 보여준다
  const active = picked === "unsure" && !serviceType ? "unsure" : PICK.items.find((it) => it.type && it.type === serviceType)?.id ?? null;

  return (
    <section id="services" aria-labelledby="services-title" className="bg-navy-50 py-12 sm:py-20 lg:py-24">
      <div className="container">
        <Reveal>
          <h2 id="services-title" tabIndex={-1} className={cn(sceneTitle, "text-center focus:outline-none")}>
            {PICK.title}
          </h2>
        </Reveal>
        <ul className="mx-auto mt-7 grid max-w-xl gap-3 lg:mt-10 lg:max-w-none lg:grid-cols-3 lg:gap-5">
          {PICK.items.map((it, i) => {
            const on = active === it.id;
            return (
              <Reveal as="li" key={it.id} delay={i * 80}>
                <button
                  type="button"
                  aria-pressed={on}
                  data-testid={`pick-${it.id}`}
                  onClick={() => choose(it.id, it.type)}
                  className={cn(
                    "group relative flex w-full items-center gap-4 overflow-hidden rounded-[22px] border-2 bg-white p-2.5 pr-4 text-left transition-[border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/25 active:scale-[0.99] lg:flex-col lg:items-stretch lg:p-0",
                    on ? "border-blue shadow-lift" : "border-transparent shadow-card hover:border-blue/40",
                  )}
                >
                  <CaseArt kind={it.art} className="block aspect-[240/150] w-[112px] shrink-0 rounded-[16px] lg:w-full lg:rounded-none" />
                  <span className="min-w-0 flex-1 text-[16.5px] font-bold leading-[1.4] tracking-[-0.025em] text-navy [word-break:keep-all] lg:px-6 lg:pb-6 lg:pt-1 lg:text-[19px]">
                    {it.title}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors lg:absolute lg:right-4 lg:top-4",
                      on ? "border-blue bg-blue text-white" : "border-navy-200 bg-white text-transparent",
                    )}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                </button>
              </Reveal>
            );
          })}
        </ul>
        <p aria-live="polite" className="mt-4 min-h-[24px] text-center text-[15px] font-semibold text-blue-700" data-testid="pick-hint">
          {active ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
              {PICK.pickedHint}
            </span>
          ) : null}
        </p>
        <p className="mx-auto mt-1 flex max-w-xl gap-1.5 text-[13.5px] leading-relaxed text-navy-600 lg:max-w-none lg:justify-center" data-testid="pick-footnote">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {PICK.footnote}
        </p>
      </div>
    </section>
  );
}

/** 장면 5 — 행동: 고른 내용을 이어받아 같은 신청 폼으로 */
export function ActionScene() {
  const { serviceType } = useApply();
  return (
    <section id="action" aria-labelledby="action-title" className="bg-navy-50 pb-12 sm:pb-20 lg:pb-24">
      <div className="container">
        <Reveal>
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-blue to-blue-700 px-6 py-9 text-center text-white shadow-cta sm:px-12 sm:py-12">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-white/[0.07]" />
            {serviceType && (
              <p className="relative mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[13.5px] font-semibold ring-1 ring-inset ring-white/25" data-testid="action-picked">
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                {SERVICE_CONTENT[serviceType].pickTitle} 점검
              </p>
            )}
            <h2 id="action-title" className="relative text-balance text-[25px] font-extrabold leading-[1.35] tracking-[-0.03em] sm:text-[32px]">
              {ACTION.title}
            </h2>
            <p className="relative mx-auto mt-2.5 max-w-md text-pretty text-[16px] leading-[1.6] text-white/85 sm:text-[17px]">{ACTION.description}</p>
            <div id="action-cta" className="relative mt-7">
              <ApplyCta
                source="action"
                type={serviceType ?? undefined}
                variant="white"
                size="xl"
                className="h-[58px] w-full text-[17px] shadow-none sm:w-auto sm:min-w-[320px] sm:text-[18px]"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
