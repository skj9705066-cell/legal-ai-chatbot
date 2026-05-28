import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 | 법률AI",
  description: "법률AI 서비스 이용약관. AI 서비스 고지, 변호사법 준수, 개인정보 보호 등 서비스 이용 조건을 확인하세요.",
  openGraph: {
    title: "이용약관 | 법률AI",
    description: "법률AI 서비스 이용약관을 확인하세요.",
    url: "https://legal-ai-chatbot-five.vercel.app/terms",
  },
  alternates: {
    canonical: "https://legal-ai-chatbot-five.vercel.app/terms",
  },
};

const SECTIONS = [
  {
    title: "제1조 (목적)",
    body: `이 약관은 (주)법률AI(이하 "회사")가 운영하는 법률AI 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.`,
  },
  {
    title: "제2조 (AI 서비스 고지)",
    body: `① 본 서비스는 인공지능기본법 제31조에 따라 생성형 인공지능(AI)을 기반으로 운영됩니다.\n② AI가 생성한 모든 답변에는 "AI 생성물 | 인공지능에 의해 생성된 콘텐츠입니다" 표시가 포함됩니다.\n③ AI가 제공하는 법률 정보는 참고용이며, 법적 구속력이 없습니다.`,
  },
  {
    title: "제3조 (변호사법 준수 및 면책)",
    body: `① 법률AI는 변호사법 제109조에 따라 법률상담의 수행 주체가 아닙니다.\n② 본 서비스는 일반적인 법령·판례 정보를 안내하며, 구체적인 법률 사무(법률 자문·대리·서면 작성 등)를 취급하지 않습니다.\n③ 이용자는 본 서비스의 정보를 근거로 한 행위의 결과에 대하여 스스로 책임을 집니다.\n④ 구체적인 법적 판단이 필요한 경우 반드시 전문 변호사와 상담하시기 바랍니다.`,
  },
  {
    title: "제4조 (서비스 내용)",
    body: `① 회사는 다음과 같은 서비스를 제공합니다.\n  - AI 기반 법률 정보 상담\n  - 변호사 매칭 및 연결 중개\n  - 사건 요약 및 분석 정보 제공\n② 회사는 서비스 내용을 변경할 수 있으며, 변경 시 사전 공지합니다.`,
  },
  {
    title: "제5조 (이용자 의무)",
    body: `① 이용자는 다음 행위를 하여서는 안 됩니다.\n  - 타인의 정보를 도용하거나 허위 정보를 입력하는 행위\n  - 서비스를 통해 얻은 정보를 회사의 사전 승낙 없이 복제·배포하는 행위\n  - 회사 또는 제3자의 지식재산권을 침해하는 행위\n  - 기타 불법적이거나 부당한 행위`,
  },
  {
    title: "제6조 (개인정보 보호)",
    body: `회사는 이용자의 개인정보를 개인정보처리방침에 따라 처리합니다. 개인정보처리방침은 서비스 하단의 링크를 통해 확인할 수 있습니다.`,
  },
  {
    title: "제7조 (서비스 중단)",
    body: `회사는 시스템 점검, 긴급 보수, 천재지변 등 불가피한 사유 발생 시 서비스를 일시 중단할 수 있습니다. 예정된 중단의 경우 사전 공지합니다.`,
  },
  {
    title: "제8조 (분쟁 해결)",
    body: `본 약관과 관련한 분쟁은 대한민국 법령을 적용하며, 소송은 서울중앙지방법원을 관할 법원으로 합니다.`,
  },
  {
    title: "부칙",
    body: `이 약관은 2025년 1월 1일부터 시행합니다.`,
  },
];

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-12 lg:px-8 lg:py-16">
      <div className="mb-8">
        <Link href="/" className="text-sm text-primary-500 hover:text-primary-800 transition-colors">
          ← 홈으로
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-primary-900">이용약관</h1>
        <p className="mt-2 text-sm text-primary-500">최종 수정일: 2025년 1월 1일</p>
      </div>

      {/* 인공지능기본법 고지 박스 */}
      <div className="mb-8 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 text-sm text-brand-800 leading-relaxed">
        <svg className="shrink-0 mt-0.5 w-4 h-4 text-brand-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
        <span>
          <strong>인공지능기본법 제31조 고지:</strong> 본 서비스는 생성형 인공지능(AI)을 기반으로 운영됩니다.
          AI가 생성한 콘텐츠는 법적 효력이 없으며, 중요한 법률 문제는 반드시 변호사와 직접 상담하시기 바랍니다.
        </span>
      </div>

      <div className="space-y-8 text-[15px] text-primary-800 leading-relaxed">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-bold text-primary-900 mb-2">{s.title}</h2>
            <p className="whitespace-pre-line text-primary-700">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-primary-200 text-sm text-primary-500">
        문의: <a href="mailto:contact@legal-ai.kr" className="underline hover:text-primary-800">contact@legal-ai.kr</a>
        {" · "}
        <Link href="/privacy" className="underline hover:text-primary-800">개인정보처리방침</Link>
      </div>
    </main>
  );
}
