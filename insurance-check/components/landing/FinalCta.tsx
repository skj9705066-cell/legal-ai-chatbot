import { ApplyCta } from "./ApplyCta";

export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="bg-navy-50 pb-20 sm:pb-24 lg:pb-28">
      <div className="container">
        <div id="final-cta" className="relative overflow-hidden rounded-[32px] bg-deep px-6 py-12 text-center sm:px-12 sm:py-16 lg:py-20">
          <svg aria-hidden="true" className="absolute -left-20 -top-20 h-64 w-64 text-white/[0.06]" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="99" stroke="currentColor" strokeWidth="2" />
            <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="2" />
          </svg>
          <h2 id="final-cta-title" className="relative text-balance text-[28px] font-extrabold leading-[1.32] tracking-[-0.03em] text-white sm:text-[36px] lg:text-[42px]">
            놓친 보험금이 있는지
            <br />
            지금 무료로 점검해 보세요
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-[17px] leading-[1.7] text-navy-300">
            이름과 연락처만 있으면 신청할 수 있어요. 보험 가입 의무는 없습니다.
          </p>
          <div className="relative mt-9 flex flex-col items-center gap-3">
            <ApplyCta source="final" variant="white" size="xl" className="h-[62px] w-full text-[18px] shadow-none sm:w-auto sm:min-w-[340px]">
              무료 점검 상담 신청하기
            </ApplyCta>
            <p className="text-[15px] text-navy-300">무료 점검 안내 · 보험 가입 의무 없음 · 지급·환급은 보험사가 결정</p>
          </div>
        </div>
      </div>
    </section>
  );
}
