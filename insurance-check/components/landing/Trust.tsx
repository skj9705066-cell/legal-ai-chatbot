import { BadgeCheck, FileLock2, Landmark, Scale } from "lucide-react";
import { OFFICIAL_LOOKUP } from "@/lib/content";
import { OfficialLink } from "@/components/site/OfficialLink";
import { Reveal } from "@/components/motion/Reveal";

const ITEMS = [
  { icon: BadgeCheck, title: "무료 점검 상담" },
  { icon: Scale, title: "지급은 보험사가 결정" },
  { icon: FileLock2, title: "동의한 상담만" },
  { icon: Landmark, title: "공식 조회도 가능" },
];

/**
 * 신뢰 요소 — 아이콘 + 짧은 제목 4개와 공식 조회 안내 한 줄.
 * 운영 주체·등록번호·개인정보 처리방침·철회 링크는 푸터에 항상 표시된다.
 */
export function Trust() {
  return (
    <section id="trust" aria-labelledby="trust-title" className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="container">
        <Reveal>
          <h2 id="trust-title" className="text-[24px] font-extrabold leading-[1.3] tracking-[-0.03em] text-navy sm:text-[30px]">
            안심하고 신청하세요
          </h2>
        </Reveal>
        <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          {ITEMS.map(({ icon: Icon, title }) => (
            <li key={title} className="flex items-center gap-3 rounded-2xl bg-navy-50 px-3.5 py-3.5 sm:px-5 sm:py-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue shadow-card">
                <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <h3 className="text-[15px] font-bold leading-snug tracking-[-0.02em] text-navy [word-break:keep-all] sm:text-[17px]">{title}</h3>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[14px] leading-relaxed text-navy-600" data-testid="official-lookup-note">
          숨은보험금은{" "}
          <OfficialLink className="font-semibold text-blue-700 underline underline-offset-2">{OFFICIAL_LOOKUP.name}(cont.insure.or.kr)</OfficialLink>
          에서 직접 무료 조회할 수 있어요. 이 사이트에 개인정보를 제출할 필요가 없습니다.
        </p>
      </div>
    </section>
  );
}
