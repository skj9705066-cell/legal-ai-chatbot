"use client";

import { Check, FileStack, TriangleAlert } from "lucide-react";
import { SERVICE_TYPES } from "@/lib/types";
import { SERVICE_CONTENT } from "@/lib/content";
import { cn } from "@/lib/utils";
import { OfficialLink } from "@/components/site/OfficialLink";
import { useApply } from "./ApplyContext";
import { ApplyCta } from "./ApplyCta";
import { Section } from "./Section";
import { SERVICE_ICON } from "./ServiceIcons";

export function ServiceTypes() {
  const { serviceType, selectType } = useApply();
  return (
    <Section
      id="services"
      eyebrow="점검 유형"
      title="어떤 점검이 필요하신가요?"
      description="상황에 맞는 유형을 고르면 필요 자료와 진행 절차를 안내해 드립니다. 신청 전에 미리 살펴보셔도 됩니다."
    >
      <fieldset>
        <legend className="sr-only">점검 유형 선택</legend>
        <div className="grid gap-4 lg:grid-cols-3">
          {SERVICE_TYPES.map((id) => {
            const c = SERVICE_CONTENT[id];
            const Icon = SERVICE_ICON[id];
            const selected = serviceType === id;
            return (
              <div
                key={id}
                className={cn(
                  "flex flex-col rounded-2xl border bg-white p-5 shadow-card transition-[border-color,box-shadow] sm:p-6",
                  selected ? "border-blue ring-2 ring-blue/20" : "border-navy-200/80",
                )}
              >
                <label className="group flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="service-type-browse"
                    value={id}
                    checked={selected}
                    onChange={() => selectType(id)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue peer-focus-visible:ring-offset-2",
                      selected ? "bg-blue text-white" : "bg-blue-50 text-blue",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[17px] font-bold leading-snug text-navy">{c.title}</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          selected ? "border-blue bg-blue text-white" : "border-navy-300",
                        )}
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </span>
                    <span className="mt-2 block text-[14.5px] leading-relaxed text-navy-600">{c.summary}</span>
                  </span>
                </label>

                <div className="mt-5 space-y-4 border-t border-navy-100 pt-4 text-[13.5px] leading-relaxed">
                  <div>
                    <p className="flex items-center gap-1.5 font-bold text-navy">
                      <FileStack className="h-4 w-4 text-navy-400" aria-hidden="true" />
                      필요 자료
                    </p>
                    <ul className="mt-1.5 space-y-1 text-navy-600">
                      {c.documents.map((d) => (
                        <li key={d} className="flex gap-2">
                          <span aria-hidden="true" className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-navy-400" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 font-bold text-navy">
                      <TriangleAlert className="h-4 w-4 text-caution" aria-hidden="true" />
                      주의사항
                    </p>
                    <ul className="mt-1.5 space-y-1 text-navy-600">
                      {c.notices.map((n) => (
                        <li key={n} className="flex gap-2">
                          <span aria-hidden="true" className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-navy-400" />
                          {n}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-2 pt-5">
                  {id === "hidden" && (
                    <OfficialLink className="justify-center rounded-xl bg-blue-50 px-4 py-3 text-[15px] font-semibold text-blue-700 hover:bg-blue-100">
                      내보험찾아줌에서 바로 조회
                    </OfficialLink>
                  )}
                  <ApplyCta source="type_card" type={id} variant={id === "hidden" ? "outline" : "primary"} size="lg" className="w-full">
                    {id === "hidden" ? "조회가 어려우면 상담 신청" : "이 유형으로 점검 신청"}
                  </ApplyCta>
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>
    </Section>
  );
}
