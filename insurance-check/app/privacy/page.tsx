import type { Metadata } from "next";
import Link from "next/link";
import { getPublicConfig } from "@/lib/config";
import { claimConsentRows, coverageConsentRows, marketingConsentRows } from "@/lib/consent-text";
import { isPlaceholder, orSetting, thirdPartyText } from "@/lib/display";
import { cn } from "@/lib/utils";
import { ApplyShell } from "@/components/apply/ApplyShell";

export const metadata: Metadata = { title: "개인정보 처리방침" };

function Table({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="mt-3 divide-y divide-navy-100 rounded-xl border border-navy-200 text-[14px]">
      {rows.map((r) => (
        <div key={r.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[120px_1fr] sm:gap-4">
          <dt className="font-semibold text-navy">{r.label}</dt>
          <dd className={cn("leading-relaxed text-navy-600", isPlaceholder(r.value) && "font-medium text-caution")}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function PrivacyPage() {
  const config = getPublicConfig();
  const o = config.operator;
  return (
    <ApplyShell config={config} wide>
      <article className="rounded-3xl border border-navy-200/80 bg-white p-6 shadow-card sm:p-10">
        <h1 className="text-[26px] font-extrabold text-navy">개인정보 처리방침</h1>
        <p className="mt-2 text-[14px] text-navy-500">
          시행일: <span className={cn(!o.privacyPolicyEffectiveDate && "font-medium text-caution")}>{orSetting(o.privacyPolicyEffectiveDate, "시행일")}</span>
        </p>
        {config.mode === "demo" && (
          <p className="mt-4 rounded-xl bg-caution-50 p-4 text-[13.5px] leading-relaxed text-caution">
            데모용 초안입니다. 실제 운영 전 소속 보험대리점(GA)의 개인정보 처리 승인과 법률 검토를 거쳐 확정해야 합니다.
          </p>
        )}

        <div className="mt-8 space-y-10 text-[15px] leading-[1.8] text-navy-700">
          <section>
            <h2 className="text-[18px] font-bold text-navy">1. 처리 주체</h2>
            <p className="mt-2">
              보험금 점검 신청 정보는 <strong>{orSetting(o.privacyController, "개인정보 처리 주체")}</strong>가, 별도 동의한 보장 분석 상담 정보는{" "}
              <strong>{orSetting(o.coverageProcessor, "보장 분석 처리 주체")}</strong>가 처리합니다.
            </p>
          </section>
          <section>
            <h2 className="text-[18px] font-bold text-navy">2. 보험금 점검 신청 (필수 동의)</h2>
            <Table rows={claimConsentRows(o)} />
          </section>
          <section>
            <h2 className="text-[18px] font-bold text-navy">3. 보장 분석 상담 (신청 완료 후 별도 선택 동의)</h2>
            <Table rows={coverageConsentRows(o)} />
          </section>
          <section>
            <h2 className="text-[18px] font-bold text-navy">4. 광고성 정보 수신 (선택 동의)</h2>
            <Table rows={marketingConsentRows(o)} />
          </section>
          <section>
            <h2 className="text-[18px] font-bold text-navy">5. 제3자 제공</h2>
            <p className="mt-2">{thirdPartyText(o.thirdPartyProvision)}</p>
          </section>
          <section>
            <h2 className="text-[18px] font-bold text-navy">6. 수집하지 않는 정보</h2>
            <p className="mt-2">주민등록번호, 상세 병력 등 건강정보, 보험증권 원본은 신청 단계에서 수집하지 않습니다.</p>
          </section>
          <section>
            <h2 className="text-[18px] font-bold text-navy">7. 안전성 확보 조치</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>전송 구간 암호화(HTTPS), 연락처 별도 암호화 저장</li>
              <li>관리자 인증·권한별 접근 통제, 연락처 원문 열람·내보내기 등 접근 이력 기록</li>
              <li>보유 기간 경과 또는 삭제 요청 시 지체 없이 파기</li>
            </ul>
          </section>
          <section>
            <h2 className="text-[18px] font-bold text-navy">8. 방문 기록과 광고 성과 측정</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>서비스 개선을 위해 화면 방문·버튼 클릭 같은 이용 기록을 무작위 세션 번호, 광고 유입 정보(UTM), 선택한 점검 유형과 함께 저장합니다. 이름·연락처는 포함하지 않습니다.</li>
              <li>
                Google Analytics, Meta 픽셀 등 외부 분석·광고 측정 도구는 운영 중 설정된 경우에만, 방문자가 화면 하단 안내에서 &lsquo;동의&rsquo;를 선택한 뒤에만
                사용합니다. 이 도구들에는 이름·연락처·건강정보를 보내지 않으며, 신청 완료 여부만 전달합니다.
              </li>
              <li>동의하지 않아도 서비스 이용과 신청에는 제한이 없습니다.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-[18px] font-bold text-navy">9. 정보주체의 권리와 동의 철회</h2>
            <p className="mt-2">
              언제든지 열람·정정·삭제·처리정지 및 동의 철회를 요청할 수 있습니다.{" "}
              <Link href="/privacy/withdraw" className="font-semibold text-blue underline underline-offset-2">
                동의 철회·삭제 요청
              </Link>{" "}
              페이지 또는 아래 연락처로 요청해 주세요. 보장 분석·광고성 정보 수신 동의 철회는 접수 즉시 연락 대상에서 제외됩니다.
            </p>
          </section>
          <section>
            <h2 className="text-[18px] font-bold text-navy">10. 개인정보 보호책임자</h2>
            <p className={cn("mt-2", !o.privacyOfficer && "font-medium text-caution")}>{orSetting(o.privacyOfficer, "개인정보 보호책임자")}</p>
            <p className="mt-1">
              문의: {orSetting(o.contactPhone, "대표 연락처")} · {orSetting(o.contactEmail, "문의 이메일")}
            </p>
          </section>
        </div>
      </article>
    </ApplyShell>
  );
}
