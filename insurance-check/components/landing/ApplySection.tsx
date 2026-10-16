import Link from "next/link";
import { Check, Info } from "lucide-react";
import { APPLY } from "@/lib/content";
import type { PublicConfig } from "@/lib/config";
import { orSetting } from "@/lib/display";
import { cn } from "@/lib/utils";
import { ApplyForm } from "./ApplyForm";

/**
 * 신청 — 이름·전화번호를 입력하기 직전의 불안을 줄인다.
 * 위: 제목·설명·"어떤 도움을 받을 수 있나요?" / 가운데: 폼 / 아래: 지급 비보장·공식 조회 안내 + 실제 운영 주체 정보.
 * 운영 주체 정보는 설정된 값만 보여 주고, 비어 있으면 '[설정 필요]'로 표시한다(임의로 채우지 않음).
 * 데스크톱은 왼쪽(안내)·오른쪽(폼) 2열.
 */
export function ApplySection({ config }: { config: PublicConfig }) {
  const o = config.operator;
  // TODO(운영자): 아래 값은 모두 환경변수에서 읽는다. 비어 있으면 '[설정 필요]'로 보이며 운영 모드에서는 접수가 잠긴다.
  //   OPERATOR_NAME · AGENCY_NAME · AGENCY_REG_NO · PLANNER_NAME · PLANNER_REG_NO · CONTACT_PHONE · CONTACT_HOURS · AD_REVIEW_NO
  //   확인되지 않은 회사명·자격·경력·심의번호를 코드에 직접 적지 않는다.
  const rows = [
    { label: "운영 주체", value: orSetting(o.operatorName, "운영 주체") },
    { label: "소속 보험대리점", value: `${orSetting(o.agencyName, "소속 GA")} · 등록번호 ${orSetting(o.agencyRegNo, "GA 등록번호")}` },
    { label: "담당 설계사", value: `${orSetting(o.plannerName, "설계사 성명")} · 등록번호 ${orSetting(o.plannerRegNo, "설계사 등록번호")}` },
    { label: "고객 문의", value: `${orSetting(o.contactPhone, "대표 연락처")}${o.contactHours ? ` · ${o.contactHours}` : ""}` },
    { label: "광고 심의", value: orSetting(o.adReviewNo, "광고 심의필 번호") },
  ];
  return (
    <section id="apply" aria-labelledby="apply-title" className="scroll-mt-16 bg-navy-50 py-12 sm:py-20 lg:py-24">
      <div className="container grid gap-7 lg:grid-cols-[0.85fr_1.15fr] lg:gap-x-16 lg:gap-y-8">
        <div className="lg:col-start-1 lg:row-start-1 lg:pt-6">
          <h2 id="apply-title" className="text-balance text-[26px] font-extrabold leading-[1.32] tracking-[-0.03em] text-navy sm:text-[32px] lg:text-[40px]">
            {APPLY.title}
          </h2>
          <p className="mt-2.5 text-[16px] leading-[1.6] text-navy-600 sm:text-[17px]">{APPLY.description}</p>
          <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-navy-100 sm:p-5" data-testid="apply-help">
            <p className="text-[15.5px] font-bold text-navy">{APPLY.helpTitle}</p>
            <ul className="mt-2.5 space-y-2">
              {APPLY.help.map((t) => (
                <li key={t} className="flex items-start gap-2 text-[15px] leading-snug text-ink">
                  <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-mint-50 text-mint-700">
                    <Check className="h-3 w-3" strokeWidth={3.2} aria-hidden="true" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <ApplyForm config={config} />
        </div>

        <div className="lg:col-start-1 lg:row-start-2" data-testid="apply-trust">
          <ul className="space-y-1.5">
            {APPLY.notes.map((n) => (
              <li key={n} className="flex gap-1.5 text-[13.5px] leading-relaxed text-navy-600">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {n}
              </li>
            ))}
          </ul>
          <dl className="mt-4 divide-y divide-navy-100 rounded-2xl bg-white px-4 ring-1 ring-navy-100" data-testid="apply-operator">
            {rows.map((r) => (
              <div key={r.label} className="flex gap-3 py-2.5 text-[13.5px]">
                <dt className="w-[92px] shrink-0 text-navy-600">{r.label}</dt>
                <dd className={cn("min-w-0 font-semibold text-ink [word-break:keep-all]", r.value.includes("[설정 필요") && "font-medium text-caution")}>{r.value}</dd>
              </div>
            ))}
            <div className="flex gap-3 py-2.5 text-[13.5px]">
              <dt className="w-[92px] shrink-0 text-navy-600">개인정보</dt>
              <dd>
                <Link href="/privacy" className="font-semibold text-blue-700 underline underline-offset-2">
                  개인정보 처리방침
                </Link>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
