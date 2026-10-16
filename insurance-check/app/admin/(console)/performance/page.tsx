import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/server/auth";
import { computeFunnel, type FunnelRow } from "@/lib/server/funnel";
import { recordStaffAudit } from "@/lib/server/service";
import { cn, percent } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";

const PERIODS = [7, 30, 90] as const;

const STAGES: { key: keyof FunnelRow; label: string; note: string }[] = [
  { key: "visits", label: "방문", note: "고유 세션" },
  { key: "typeSelect", label: "유형 선택", note: "고유 세션" },
  { key: "formView", label: "신청 폼 진입", note: "폼이 화면에 보인 세션" },
  { key: "formStart", label: "신청 시작", note: "폼 첫 입력" },
  { key: "validSubmit", label: "유효 제출", note: "저장된 신청, 30일 중복 제외 · 광고 전환 기준" },
  { key: "coverageOptIn", label: "별도 상담 동의", note: "보장 분석 별도 동의" },
  { key: "consulted", label: "상담 완료", note: "관리자 입력 상태" },
  { key: "contracted", label: "계약", note: "관리자 입력만 (외부 연동 없음)" },
];

export default async function PerformancePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  const { days: d } = await searchParams;
  const days = PERIODS.includes(Number(d) as (typeof PERIODS)[number]) ? Number(d) : 30;
  const { rows, total } = await computeFunnel(days);
  await recordStaffAudit(session, "report.performance", `광고 성과 조회 (최근 ${days}일)`);
  const max = Math.max(total.visits, 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-navy">광고 성과</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-navy-600">
            방문~신청 시작은 익명 1st-party 이벤트, 유효 제출 이후는 실제 신청 기록 기준입니다. 클릭은 전환으로 세지 않습니다.
          </p>
        </div>
        <nav aria-label="기간" className="flex gap-1 rounded-lg border border-navy-200 bg-white p-1">
          {PERIODS.map((p) => (
            <Link prefetch={false}
              key={p}
              href={`/admin/performance?days=${p}`}
              aria-current={p === days ? "page" : undefined}
              className={cn("rounded-md px-3 py-1.5 text-[13px] font-semibold", p === days ? "bg-navy text-white" : "text-navy-600 hover:bg-navy-50")}
            >
              최근 {p}일
            </Link>
          ))}
        </nav>
      </div>

      <section aria-labelledby="funnel-title" className="rounded-2xl bg-white shadow-card ring-1 ring-navy-100 p-5">
        <h2 id="funnel-title" className="text-[17px] font-bold text-navy">
          전체 퍼널 <span className="font-medium text-navy-500">(방문 대비 비율)</span>
        </h2>
        <ol className="mt-4 space-y-3">
          {STAGES.map((s, i) => {
            const v = total[s.key] as number;
            const prev = i > 0 ? (total[STAGES[i - 1].key] as number) : null;
            return (
              <li key={s.key} className="grid grid-cols-[96px_1fr_auto] items-center gap-3 sm:grid-cols-[120px_1fr_200px]">
                <span className="text-[13px] font-semibold text-navy">{s.label}</span>
                <div className="h-6 rounded bg-navy-50" title={`${s.label}: ${v.toLocaleString()} (${s.note})`}>
                  <div className="h-full rounded-r bg-blue" style={{ width: `${Math.max((v / max) * 100, v ? 0.8 : 0)}%` }} />
                </div>
                <span className="text-right text-[13px] tabular-nums text-navy-600">
                  <strong className="text-navy">{v.toLocaleString()}</strong>
                  <span className="ml-1.5">{percent(v, total.visits)}</span>
                  {prev !== null && <span className="ml-1.5 hidden text-navy-500 sm:inline">(전 단계 {percent(v, prev)})</span>}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-[13px] text-navy-600">공식 조회 링크 클릭(참고 지표, 전환 아님): {total.officialLookup.toLocaleString()} 세션</p>
      </section>

      <section aria-labelledby="utm-title">
        <h2 id="utm-title" className="mb-3 text-[17px] font-bold text-navy">
          UTM별 전환
        </h2>
        <div className="overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-navy-100">
          <table className="w-full min-w-[1100px] text-left text-[14px]">
            <thead className="border-b border-navy-100 bg-navy-50/70 text-[13px] font-semibold text-navy-600">
              <tr>
                <th scope="col" className="px-4 py-3">source / medium / campaign</th>
                {STAGES.map((s) => (
                  <th key={s.key} scope="col" className="px-4 py-3 text-right">
                    {s.label}
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 text-right">제출 전환율</th>
                <th scope="col" className="px-4 py-3 text-right">동의율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100 tabular-nums">
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row" className="px-4 py-3 font-semibold text-navy">
                    {r.utmSource ?? "(direct)"} <span className="font-normal text-navy-500">/ {r.utmMedium ?? "-"} / {r.utmCampaign ?? "-"}</span>
                  </th>
                  {STAGES.map((s) => (
                    <td key={s.key} className="px-4 py-3 text-right text-navy-700">
                      {(r[s.key] as number).toLocaleString()}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-semibold text-navy">{percent(r.validSubmit, r.visits)}</td>
                  <td className="px-4 py-3 text-right text-navy-700">{percent(r.coverageOptIn, r.validSubmit)}</td>
                </tr>
              ))}
              <tr className="bg-navy-50 font-bold">
                <th scope="row" className="px-4 py-3 text-navy">합계</th>
                {STAGES.map((s) => (
                  <td key={s.key} className="px-4 py-3 text-right text-navy">
                    {(total[s.key] as number).toLocaleString()}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-navy">{percent(total.validSubmit, total.visits)}</td>
                <td className="px-4 py-3 text-right text-navy">{percent(total.coverageOptIn, total.validSubmit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <Alert tone="info" title="집계 원칙">
        광고 플랫폼 전환은 <code>lead_submit_success</code>(유효 제출)만 사용합니다. 계약 단계는 관리자가 상세 화면에서 입력한 값만 반영하며, 보험사·GA
        시스템 연동 자료는 승인된 경우에만 별도로 추가해야 합니다. 이벤트에는 이름·연락처·메모·건강정보가 포함되지 않습니다.
      </Alert>
    </div>
  );
}
