import { BadgeCheck, FileLock2, HandHeart, Scale, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import type { OperatorInfo } from "@/lib/config";
import { orSetting, isPlaceholder } from "@/lib/display";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";
import { Section, SectionHeading } from "./Section";

const ITEMS = [
  { icon: BadgeCheck, title: "점검 안내는 무료", body: "점검과 청구 방법 안내에 비용을 받지 않습니다." },
  { icon: HandHeart, title: "보험 가입 의무 없음", body: "가입 여부와 관계없이 안내받을 수 있습니다." },
  { icon: FileLock2, title: "필요한 정보만", body: "이름·연락처·희망 시간만 받고, 주민번호·병력은 묻지 않습니다." },
  { icon: Scale, title: "지급은 보험사가 결정", body: "지급을 보장하지 않으며, 보험사 약관과 심사에 따릅니다." },
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-[15px] text-navy-500 sm:w-36">{label}</dt>
      <dd className={cn("text-[16px] font-semibold text-ink", isPlaceholder(value) && "font-medium text-caution")}>{value}</dd>
    </div>
  );
}

export function Trust({ operator }: { operator: OperatorInfo }) {
  const o = operator;
  return (
    <Section id="trust">
      <Reveal>
        <SectionHeading id="trust" eyebrow="안심하고 이용하세요" title="투명하게 운영해요" />
      </Reveal>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-x-8 sm:gap-y-8 lg:mt-10 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delay={(i % 4) * 70} className="flex flex-col gap-2.5 rounded-2xl bg-navy-50 p-4 sm:flex-row sm:gap-4 sm:bg-transparent sm:p-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue sm:h-12 sm:w-12 sm:rounded-2xl">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-[16px] font-bold tracking-[-0.015em] text-navy sm:text-[18px]">{title}</h3>
              <p className="mt-1.5 hidden text-[15.5px] leading-[1.6] text-navy-600 sm:block">{body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:gap-5 lg:mt-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-navy-100 p-5 sm:p-8">
          <p className="flex items-center gap-2 text-[18px] font-bold text-navy">
            <UserRoundCheck className="h-5 w-5 text-blue" aria-hidden="true" />
            운영 주체 · 담당 설계사
          </p>
          <dl className="mt-3 divide-y divide-navy-100">
            <InfoRow label="운영 주체" value={orSetting(o.operatorName, "운영 주체")} />
            <InfoRow label="소속 보험대리점" value={`${orSetting(o.agencyName, "소속 GA")} (${orSetting(o.agencyRegNo, "GA 등록번호")})`} />
            <InfoRow label="담당 설계사" value={`${orSetting(o.plannerName, "설계사 성명")} (${orSetting(o.plannerRegNo, "설계사 등록번호")})`} />
            <InfoRow label="상담 연락처" value={`${orSetting(o.contactPhone, "대표 연락처")}${o.contactHours ? ` · ${o.contactHours}` : ""}`} />
          </dl>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-3xl bg-navy-50 p-5 sm:gap-6 sm:p-8">
          <div>
            <p className="text-[18px] font-bold text-navy">개인정보는 이렇게 다뤄요</p>
            <p className="mt-2.5 text-[16px] leading-[1.65] text-navy-600">
              점검 신청과 보장 분석 상담은 각각 따로 동의받아 처리합니다. 동의 철회·삭제는 언제든 가능해요.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-[16px] font-semibold">
            <Link href="/privacy" className="text-blue-700 underline-offset-4 hover:underline">
              개인정보 처리방침 보기
            </Link>
            <Link href="/privacy/withdraw" className="text-blue-700 underline-offset-4 hover:underline">
              동의 철회 · 삭제 요청
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
