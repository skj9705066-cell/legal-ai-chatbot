import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/server/auth";
import { repo } from "@/lib/server/repo";
import { recordStaffAudit } from "@/lib/server/service";
import { getOperatingMetrics, metricsGate } from "@/lib/server/reviews";
import { canTransition, isPublishable, publicMetrics } from "@/lib/reviews";
import { can } from "@/lib/session";
import { REVIEW_KIND_LABEL, REVIEW_STATUS_LABEL, type ReviewStatus } from "@/lib/types";
import { SERVICE_CONTENT } from "@/lib/content";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { PageHeader, Panel, tableCell, tableHead } from "@/components/admin/ui";
import { ReviewForm } from "@/components/admin/ReviewForm";
import { ReviewActions } from "@/components/admin/ReviewActions";

const STATUS_BADGE: Record<ReviewStatus, "default" | "blue" | "mint" | "caution"> = {
  pending: "caution",
  approved: "mint",
  rejected: "default",
  hidden: "default",
};

const METRIC_LABEL = {
  applications: "누적 점검 상담 신청",
  completedConsultations: "상담 완료",
  approvedReviews: "동의받은 공개 후기",
  verifiedPayoutCases: "검증된 지급 사례",
} as const;

export default async function ReviewsPage() {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  const reviews = await repo().listReviews();
  const metrics = await getOperatingMetrics();
  const gate = metricsGate();
  const shown = publicMetrics(metrics, gate);
  await recordStaffAudit(session, "review.list", `후기 목록 조회 ${reviews.length}건`);
  const canEdit = can(session.role, "editReviews");
  const canApprove = can(session.role, "approveReviews");

  return (
    <div className="space-y-6">
      <PageHeader
        title="후기 · 지급 사례"
        description="고객 동의를 받은 후기와 실제 지급이 확인된 사례만 등록하세요. 등록은 항상 승인 대기이며, 관리자가 공개 승인해야 랜딩에 표시됩니다. 지급 금액은 지급이 확인된 경우에만 노출됩니다."
      />

      <Panel className="p-5 sm:p-6" aria-labelledby="metrics-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="metrics-title" className="text-[18px] font-bold text-navy">
            실제 운영 지표
          </h2>
          <Badge variant={shown ? "mint" : "default"} data-testid="metrics-public-state">
            {shown ? "랜딩 공개 중" : "랜딩 비공개"}
          </Badge>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(METRIC_LABEL) as (keyof typeof METRIC_LABEL)[]).map((k) => (
            <li key={k} className="rounded-xl bg-navy-50 px-4 py-3.5">
              <p className="text-[14px] font-medium text-navy-600">{METRIC_LABEL[k]}</p>
              <p className="num-display mt-1 text-[24px] font-extrabold text-navy" data-testid={`metric-${k}`}>
                {metrics[k].toLocaleString("ko-KR")}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[14px] leading-relaxed text-navy-600">
          데모·테스트·중복 신청은 집계에서 제외됩니다. 상담 완료 = 보험금 점검 상태가 &lsquo;청구 방법 안내 완료&rsquo; 이후(서류 준비 중·종결 포함)인
          신청입니다. 랜딩 공개 조건: 운영 모드 + <code>PUBLIC_METRICS_ENABLED=1</code>(광고 심의 승인 후) + 누적 신청{" "}
          {gate.minApplications.toLocaleString("ko-KR")}건 이상. 0인 항목은 표시하지 않습니다.
        </p>
        {gate.mode === "demo" && (
          <Alert tone="caution" className="mt-3">
            데모 모드에서는 모든 데이터가 가짜이므로 지표가 항상 0이며 랜딩에 공개되지 않습니다.
          </Alert>
        )}
      </Panel>

      {canEdit && (
        <Panel className="p-5 sm:p-6">
          <h2 className="text-[18px] font-bold text-navy">후기 등록</h2>
          <p className="mt-1 text-[14px] text-navy-600">고객 실명·연락처·사진은 입력하지 마세요. 표시명은 익명 처리된 값만 허용됩니다.</p>
          <div className="mt-4">
            <ReviewForm />
          </div>
        </Panel>
      )}

      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[1040px]" aria-label="후기 목록">
          <thead className="border-b border-navy-100 bg-navy-50/70">
            <tr>
              <th scope="col" className={tableHead}>등록일</th>
              <th scope="col" className={tableHead}>유형</th>
              <th scope="col" className={tableHead}>표시명 · 보험금 유형</th>
              <th scope="col" className={tableHead}>내용</th>
              <th scope="col" className={tableHead}>지급 확인 · 금액</th>
              <th scope="col" className={tableHead}>게시 동의</th>
              <th scope="col" className={tableHead}>상태</th>
              <th scope="col" className={tableHead}>처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {reviews.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[15px] text-navy-500">
                  등록된 후기가 없습니다. 후기가 없으면 랜딩의 실제 후기 영역은 표시되지 않습니다.
                </td>
              </tr>
            )}
            {reviews.map((r) => (
              <tr key={r.id} className="align-top" data-testid="review-row" data-review-id={r.id}>
                <td className={`${tableCell} whitespace-nowrap text-navy-600`}>
                  {formatDateTime(r.createdAt)}
                  <div className="text-[13px] text-navy-500">{r.createdBy}</div>
                </td>
                <td className={tableCell}>
                  {REVIEW_KIND_LABEL[r.kind]}
                  {r.isDemo && (
                    <Badge variant="demo" className="ml-1.5">
                      데모
                    </Badge>
                  )}
                </td>
                <td className={tableCell}>
                  <span className="font-semibold text-navy">{r.displayName}</span>
                  <div className="text-[13px] text-navy-600">{SERVICE_CONTENT[r.claimType].shortTitle}</div>
                </td>
                <td className={`${tableCell} max-w-[360px] text-navy-700`}>{r.content}</td>
                <td className={`${tableCell} whitespace-nowrap`}>
                  {r.paymentConfirmed ? <Badge variant="mint">지급 확인</Badge> : <Badge>미확인</Badge>}
                  {r.verifiedAmount != null && <div className="num-display mt-1 text-navy">{r.verifiedAmount.toLocaleString("ko-KR")}원</div>}
                </td>
                <td className={tableCell}>{r.useConsent ? <Badge variant="blue">동의</Badge> : <Badge variant="caution">미동의</Badge>}</td>
                <td className={`${tableCell} whitespace-nowrap`}>
                  <Badge variant={STATUS_BADGE[r.status]}>{REVIEW_STATUS_LABEL[r.status]}</Badge>
                  {isPublishable(r) && <div className="mt-1 text-[13px] font-semibold text-mint-700">랜딩 표시 중</div>}
                </td>
                <td className={tableCell}>
                  {canApprove ? (
                    <ReviewActions id={r.id} status={r.status} blockedReason={canTransition(r, "approved")} />
                  ) : (
                    <span className="text-[13px] text-navy-500">승인은 관리자 전용</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
