import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "로셀 개인정보처리방침. 수집 항목, 이용 목적, 보유 기간, 제3자 제공, 이용자 권리를 확인하세요.",
  openGraph: {
    title: "개인정보처리방침",
    description: "로셀 개인정보 수집·이용·보호 방침을 확인하세요.",
    url: "https://legal-ai-chatbot-five.vercel.app/privacy",
  },
  alternates: {
    canonical: "https://legal-ai-chatbot-five.vercel.app/privacy",
  },
};

const SECTIONS = [
  {
    title: "제1조 (수집하는 개인정보 항목)",
    body: `회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.\n\n【필수 항목】\n- 이메일 주소, 비밀번호 (일반 회원가입 시)\n- 카카오 계정 식별자 (소셜 로그인 시)\n- 서비스 이용 기록 (상담 내역, 매칭 이력)\n\n【자동 수집 항목】\n- 접속 IP, 브라우저 종류, 방문 일시, 서비스 이용 기록\n- 방문 경로(유입 검색엔진·링크), 기기 및 운영체제 정보, 페이지 이용 기록\n\n【분석 도구 이용】\n회사는 서비스 이용 현황 분석을 위해 Google Analytics(Google LLC)와 Vercel Web Analytics(Vercel Inc.)를 이용합니다. 이 과정에서 쿠키 또는 익명화된 식별값이 사용될 수 있으며, 수집된 정보는 통계 분석 목적으로만 이용됩니다. 이용자는 브라우저 설정에서 쿠키 저장을 거부하거나 Google Analytics 차단 부가기능(https://tools.google.com/dlpage/gaoptout)을 통해 수집을 거부할 수 있습니다.`,
  },
  {
    title: "제2조 (개인정보의 수집 및 이용 목적)",
    body: `① 회원 가입 및 본인 확인\n② AI 법률 상담 서비스 제공\n③ 변호사 매칭 서비스 제공\n④ 서비스 개선 및 통계 분석\n⑤ 부정 이용 방지 및 보안\n⑥ 법령상 의무 이행`,
  },
  {
    title: "제3조 (개인정보의 보유 및 이용 기간)",
    body: `① 회원 탈퇴 시 즉시 삭제합니다. 다만, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.\n\n【관계 법령에 따른 보유 기간】\n- 계약 또는 청약 철회 기록: 5년 (전자상거래법)\n- 대금 결제 기록: 5년 (전자상거래법)\n- 소비자 불만·분쟁 처리 기록: 3년 (전자상거래법)\n- 접속 로그: 3개월 (통신비밀보호법)`,
  },
  {
    title: "제4조 (개인정보의 제3자 제공)",
    body: `① 회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.\n② 다만, 다음의 경우에는 예외입니다.\n  - 이용자가 사전에 동의한 경우\n  - 법령의 규정에 의거하거나 수사기관의 요청이 있는 경우\n③ 변호사 매칭 진행 시, 이용자가 제출한 사건 요약 정보는 매칭된 변호사에게 제공될 수 있습니다. 이 경우 이용자의 동의를 받습니다.`,
  },
  {
    title: "제5조 (개인정보 처리 위탁)",
    body: `회사는 서비스 향상을 위해 다음과 같이 개인정보 처리를 위탁합니다.\n\n- 수탁자: Supabase Inc. (데이터베이스 및 인증 서비스)\n- 위탁 내용: 회원 정보 및 상담 데이터 저장·관리\n\n- 수탁자: Anthropic PBC (AI 응답 생성)\n- 위탁 내용: 상담 대화 내용 처리 (응답 생성 후 저장하지 않음)`,
  },
  {
    title: "제6조 (이용자의 권리)",
    body: `이용자는 언제든지 다음의 권리를 행사할 수 있습니다.\n\n① 개인정보 열람 요청\n② 개인정보 정정·삭제 요청\n③ 개인정보 처리 정지 요청\n④ 개인정보 이동 요청\n\n권리 행사는 contact@legal-ai.kr로 요청하시면 지체 없이 조치하겠습니다.`,
  },
  {
    title: "제7조 (개인정보 보호책임자)",
    body: `개인정보 관련 문의는 아래 담당자에게 연락해 주십시오.\n\n- 성명: 김재인\n- 직책: 대표\n- 이메일: privacy@legal-ai.kr\n- 전화: 1588-0000`,
  },
  {
    title: "제8조 (개인정보 처리방침 변경)",
    body: `이 개인정보처리방침은 법령·정책 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지사항을 통해 안내합니다.`,
  },
  {
    title: "부칙",
    body: `이 방침은 2025년 1월 1일부터 시행합니다.`,
  },
];

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-12 lg:px-8 lg:py-16">
      <div className="mb-8">
        <Link href="/" className="text-sm text-primary-500 hover:text-primary-800 transition-colors">
          ← 홈으로
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-primary-900">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-primary-500">최종 수정일: 2025년 1월 1일</p>
      </div>

      <p className="mb-8 text-[15px] text-primary-700 leading-relaxed">
        (주)로셀(이하 "회사")는 개인정보보호법 및 관련 법령을 준수하며,
        이용자의 개인정보를 소중히 여깁니다. 본 방침은 회사가 이용자의 개인정보를
        어떻게 수집·이용·보호하는지 안내합니다.
      </p>

      <div className="space-y-8 text-[15px] text-primary-800 leading-relaxed">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-bold text-primary-900 mb-2">{s.title}</h2>
            <p className="whitespace-pre-line text-primary-700">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-primary-200 text-sm text-primary-500">
        문의: <a href="mailto:privacy@legal-ai.kr" className="underline hover:text-primary-800">privacy@legal-ai.kr</a>
        {" · "}
        <Link href="/terms" className="underline hover:text-primary-800">이용약관</Link>
      </div>
    </main>
  );
}
