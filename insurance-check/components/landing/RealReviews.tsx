import { BadgeCheck, Info } from "lucide-react";
import type { OperatingMetrics, PublicReview } from "@/lib/types";
import { REVIEW_KIND_LABEL } from "@/lib/types";
import { REAL_REVIEWS as R, SERVICE_CONTENT } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "./Section";

/**
 * 5. 실제 고객 후기 + 실제 운영 현황.
 * - 후기: 게시 동의 + 관리자 공개 승인된 것만 (lib/reviews.ts toPublicReviews)
 * - 금액: 실제 지급이 확인된 경우에만
 * - 운영 지표: 운영 모드 + 수동 활성화 + 최소 건수 충족 시에만 (getPublicMetrics)
 * 둘 다 없으면 아무것도 렌더링하지 않는다 — 가짜 후기·가짜 건수를 만들지 않는다.
 */
export function RealReviews({ reviews, metrics }: { reviews: PublicReview[]; metrics: Partial<OperatingMetrics> | null }) {
  const metricKeys = metrics ? (Object.keys(R.metricLabel) as (keyof OperatingMetrics)[]).filter((k) => metrics[k]) : [];
  if (!reviews.length && !metricKeys.length) return null;

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="bg-white py-20 sm:py-24 lg:py-32">
      <div className="container">
        <Reveal>
          <SectionHeading id="reviews" eyebrow={R.eyebrow} title={R.title} />
        </Reveal>

        {metricKeys.length > 0 && (
          <Reveal className="mt-10">
            <div className="rounded-[24px] bg-navy-50 p-6 sm:p-8" data-testid="operating-metrics">
              <h3 className="text-[17px] font-bold text-navy">{R.metricsTitle}</h3>
              <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {metricKeys.map((k) => (
                  <div key={k}>
                    <dt className="text-[14px] font-medium text-navy-600">{R.metricLabel[k]}</dt>
                    <dd className="num-display mt-1 text-[28px] font-extrabold text-navy">{metrics![k]!.toLocaleString("ko-KR")}건</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[14px] text-navy-600">{R.metricsNote}</p>
            </div>
          </Reveal>
        )}

        {reviews.length > 0 && (
          <>
            <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {reviews.slice(0, 6).map((r, i) => (
                <Reveal as="li" key={r.id} delay={i * 80} className="h-full">
                  <article className="flex h-full flex-col rounded-[24px] bg-white p-6 shadow-card ring-1 ring-navy-100 sm:p-7" data-testid="real-review">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.isDemo ? (
                        <span className="rounded-full bg-caution-50 px-2.5 py-1 text-[13px] font-bold text-caution">데모 데이터 · 실제 후기 아님</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2.5 py-1 text-[13px] font-bold text-mint-700">
                          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                          {R.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-4 flex-1 text-[16px] leading-[1.7] text-ink">&ldquo;{r.content}&rdquo;</p>
                    {r.verifiedAmount != null && (
                      <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-[15px] font-semibold text-blue-700">
                        확인된 지급액 {r.verifiedAmount.toLocaleString("ko-KR")}원
                        <span className="mt-0.5 block text-[13px] font-medium text-navy-600">개별 사례이며 금액은 사람마다 다릅니다.</span>
                      </p>
                    )}
                    <p className="mt-4 text-[14px] text-navy-600">
                      {r.displayName} · {SERVICE_CONTENT[r.claimType].shortTitle} · {REVIEW_KIND_LABEL[r.kind]} · {r.monthLabel}
                    </p>
                  </article>
                </Reveal>
              ))}
            </ul>
            <p className="mt-6 flex gap-2 text-[15px] leading-relaxed text-navy-600">
              <Info className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              {R.note}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
