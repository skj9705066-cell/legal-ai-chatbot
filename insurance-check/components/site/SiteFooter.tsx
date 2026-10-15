import Link from "next/link";
import type { OperatorInfo } from "@/lib/config";
import { SERVICE_DISCLAIMER, STATS_SOURCE } from "@/lib/content";
import { orSetting, isPlaceholder } from "@/lib/display";
import { cn } from "@/lib/utils";
import { OfficialLink } from "./OfficialLink";
import { LogoMark } from "./Logo";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-navy-600 sm:w-36">{label}</dt>
      <dd className={cn("min-w-0 text-ink", isPlaceholder(value) && "font-medium text-caution")}>{value}</dd>
    </div>
  );
}

export function SiteFooter({ operator, demo }: { operator: OperatorInfo; demo: boolean }) {
  const o = operator;
  return (
    <footer className="border-t border-navy-100 bg-navy-50">
      <div className="container py-14 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <LogoMark className="h-8 w-8" />
              <p className="text-[17px] font-extrabold tracking-[-0.02em] text-navy">내보험 통합 점검</p>
              {demo && <span className="rounded-full bg-caution-50 px-2 py-0.5 text-[13px] font-bold text-caution">데모</span>}
            </div>
            <h2 className="sr-only">운영 주체 정보</h2>
            <dl className="mt-6 text-[15px] leading-relaxed">
              <Row label="운영 주체" value={orSetting(o.operatorName, "운영 주체")} />
              <Row label="소속 보험대리점" value={`${orSetting(o.agencyName, "소속 GA")} · 등록번호 ${orSetting(o.agencyRegNo, "GA 등록번호")}`} />
              <Row label="보험설계사" value={`${orSetting(o.plannerName, "설계사 성명")} · 등록번호 ${orSetting(o.plannerRegNo, "설계사 등록번호")}`} />
              {o.operatorBizNo && <Row label="사업자등록번호" value={o.operatorBizNo} />}
              <Row label="주소" value={orSetting(o.businessAddress, "사업장 주소")} />
              <Row
                label="연락처"
                value={`${orSetting(o.contactPhone, "대표 연락처")} · ${orSetting(o.contactEmail, "문의 이메일")}${o.contactHours ? ` (${o.contactHours})` : ""}`}
              />
              <Row label="개인정보 보호책임자" value={orSetting(o.privacyOfficer, "개인정보 보호책임자")} />
              <Row label="광고 심의" value={orSetting(o.adReviewNo, "광고 심의필 번호")} />
            </dl>
          </div>
          <nav aria-label="안내 링크">
            <h2 className="text-[16px] font-bold text-navy">안내</h2>
            <ul className="mt-4 space-y-3 text-[16px]">
              <li>
                <Link href="/privacy" className="font-bold text-navy underline-offset-4 hover:underline">
                  개인정보 처리방침
                </Link>
              </li>
              <li>
                <Link href="/privacy/withdraw" className="text-navy-600 underline-offset-4 hover:text-navy hover:underline">
                  동의 철회 · 개인정보 삭제 요청
                </Link>
              </li>
              <li>
                <OfficialLink className="text-navy-600 underline-offset-4 hover:text-navy hover:underline" />
              </li>
              <li>
                <a href={STATS_SOURCE.url} target="_blank" rel="noopener noreferrer" className="text-navy-600 underline-offset-4 hover:text-navy hover:underline">
                  통계 출처: {STATS_SOURCE.label}
                  <span className="sr-only">(새 창에서 열림)</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-12 space-y-2.5 border-t border-navy-200 pt-8 text-[14px] leading-relaxed text-navy-600">
          <p>{SERVICE_DISCLAIMER}</p>
          <p>
            보험금 지급 여부와 금액은 각 보험회사의 약관 및 심사에 따라 결정됩니다. 본 서비스는 보험금 청구 방법을 안내하며, 보험금 지급 판단이나
            손해사정 업무를 수행하지 않습니다.
          </p>
          <p>
            보험계약자가 기존 보험계약을 해지하고 새로운 보험계약을 체결하는 과정에서 질병 이력, 연령 증가 등으로 보험 인수가 거절되거나 보험료가
            인상되거나 보장 내용이 달라질 수 있습니다.
          </p>
          <p>© 내보험 통합 점검 (서비스 가칭)</p>
        </div>
      </div>
    </footer>
  );
}
