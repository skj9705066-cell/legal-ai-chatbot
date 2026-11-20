import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { PublicConfig } from "@/lib/config";
import { NOTICE } from "@/lib/content";
import { isPlaceholder, nameWithRegNo, orSetting, settingLine } from "@/lib/display";
import { cn } from "@/lib/utils";
import { Section, SectionHeading } from "./Section";

/**
 * 8. 운영자 정보 — 보험설계사 소속과 상담 제공 사실을 신청 직후·직전에 분명히 알린다.
 * 값은 모두 운영 설정(환경변수)에서 읽는다. 비어 있으면 데모·테스트는 '[설정 필요]', 운영 화면은 '준비 중'.
 * 확인되지 않은 회사명·자격·경력·심의번호를 코드에 직접 적지 않는다.
 */
export function OperatorNotice({ config }: { config: PublicConfig }) {
  const o = config.operator;
  const m = config.mode;
  const rows = [
    { label: "운영 주체", value: orSetting(o.operatorName, "운영 주체", m) },
    { label: "소속 보험대리점", value: nameWithRegNo(o.agencyName, o.agencyRegNo, "소속 GA", "GA 등록번호", m) },
    { label: "담당 보험설계사", value: nameWithRegNo(o.plannerName, o.plannerRegNo, "설계사 성명", "설계사 등록번호", m) },
    { label: "고객 문의", value: settingLine(`${orSetting(o.contactPhone, "대표 연락처", m)}${o.contactHours ? ` · ${o.contactHours}` : ""}`, m) },
    { label: "광고 심의", value: orSetting(o.adReviewNo, "광고 심의필 번호", m) },
  ];
  return (
    <Section id="notice" tone="ivory">
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
        <div>
          <SectionHeading id="notice" title={NOTICE.title} />
          <ul className="mt-6 space-y-3" data-testid="operator-notice">
            {NOTICE.items.map((t) => (
              <li key={t} className="flex gap-3 text-[18px] leading-[1.65] text-charcoal">
                <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-forest" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <dl className="divide-y divide-navy-100 self-start rounded-[24px] bg-white px-5 ring-1 ring-navy-100 sm:px-6" data-testid="apply-operator">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-0.5 py-3.5 text-[17px] sm:flex-row sm:gap-4">
              <dt className="shrink-0 text-navy-600 sm:w-[140px]">{r.label}</dt>
              <dd className={cn("min-w-0 font-semibold text-charcoal", isPlaceholder(r.value) && "font-medium text-caution")}>{r.value}</dd>
            </div>
          ))}
          <div className="flex flex-col gap-0.5 py-3.5 text-[17px] sm:flex-row sm:gap-4">
            <dt className="shrink-0 text-navy-600 sm:w-[140px]">개인정보</dt>
            <dd className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/privacy" className="font-semibold text-forest-700 underline underline-offset-4">
                개인정보 처리방침
              </Link>
              <Link href="/privacy/withdraw" className="font-semibold text-forest-700 underline underline-offset-4">
                동의 철회·삭제 요청
              </Link>
            </dd>
          </div>
        </dl>
      </div>
    </Section>
  );
}
