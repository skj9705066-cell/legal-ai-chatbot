import Image from "next/image";
import { BadgeCheck, ExternalLink } from "lucide-react";
import type { OperatorInfo } from "@/lib/config";
import { COUNSELOR, PLANNER_LOOKUP } from "@/lib/content";
import { CounselorMark } from "@/components/illustrations/WarmArt";
import { Reveal } from "@/components/motion/Reveal";
import { CallButton } from "./ApplyCta";
import { Section, SectionHeading } from "./Section";

/**
 * 4. 실제 상담사 소개 — 운영 설정(PLANNER_NAME·AGENCY_NAME·PLANNER_REG_NO)의 실제 값만 보여 준다.
 * 사진·인사말은 상담사 본인이 확인한 것만(COUNSELOR_PHOTO·COUNSELOR_INTRO). 없으면 이니셜 아이콘과 사실 안내만.
 * 경력 연수·자격·수상·상담 건수처럼 확인되지 않은 내용은 넣지 않는다. 설계사 이름이 없으면 섹션 자체를 숨긴다.
 */
export function Counselor({ operator }: { operator: OperatorInfo }) {
  const name = operator.plannerName;
  if (!name) return null;
  return (
    <Section id="counselor" tone="white">
      <Reveal>
        <SectionHeading id="counselor" title={COUNSELOR.title} />
      </Reveal>
      <div className="mt-8 grid gap-7 rounded-[28px] bg-ivory p-6 ring-1 ring-navy-100 sm:p-9 lg:grid-cols-[auto_1fr] lg:items-start lg:gap-10">
        <div className="flex items-center gap-5 lg:flex-col lg:items-start">
          {operator.counselorPhoto ? (
            <Image
              src={operator.counselorPhoto}
              alt={`${name} 상담사 사진`}
              width={160}
              height={160}
              className="h-[120px] w-[120px] rounded-full object-cover ring-4 ring-sage lg:h-[160px] lg:w-[160px]"
            />
          ) : (
            <CounselorMark initial={name.slice(0, 1)} className="h-[120px] w-[120px] lg:h-[160px] lg:w-[160px]" />
          )}
          <div>
            <p className="text-[28px] font-extrabold tracking-[-0.02em] text-charcoal" data-testid="counselor-name">
              {name} <span className="text-[19px] font-semibold text-navy-600">{COUNSELOR.role}</span>
            </p>
            {operator.agencyName && (
              <p className="mt-1 text-[18px] font-semibold text-forest-700" data-testid="counselor-agency">
                {operator.agencyName} 소속
              </p>
            )}
            {operator.plannerRegNo && <p className="mt-1 text-[16px] text-navy-600">설계사 등록번호 {operator.plannerRegNo}</p>}
          </div>
        </div>
        <div>
          {operator.counselorIntro && (
            <blockquote className="mb-5 rounded-2xl bg-white p-5 text-[19px] leading-[1.75] text-charcoal shadow-card">“{operator.counselorIntro}”</blockquote>
          )}
          <ul className="space-y-3">
            {COUNSELOR.points.map((p) => (
              <li key={p} className="flex gap-3 text-[18px] leading-[1.65] text-charcoal">
                <BadgeCheck className="mt-0.5 h-6 w-6 shrink-0 text-forest" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[16px] leading-relaxed text-navy-600">
            {COUNSELOR.verifyLabel}{" "}
            <a href={PLANNER_LOOKUP.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-forest-700 underline underline-offset-4">
              {PLANNER_LOOKUP.name}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">(새 창에서 열림)</span>
            </a>
          </p>
          {operator.contactPhone && (
            <div className="mt-6">
              <CallButton phone={operator.contactPhone} label={`${name} 상담사에게 전화`} className="h-[60px] w-full text-[18px] sm:w-auto" />
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
