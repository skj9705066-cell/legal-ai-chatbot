"use client";

import Link from "next/link";

const LINKS = [
  { label: "이용약관", href: "#terms" },
  { label: "개인정보처리방침", href: "#privacy", strong: true },
  { label: "운영정책", href: "#policy" },
  { label: "면책조항", href: "#disclaimer" },
  { label: "고객센터", href: "#support" },
];

const COMPANY = {
  name: "(주)법률AI",
  ceo: "대표 김재인",
  bizNo: "사업자등록번호 123-45-67890",
  reportNo: "통신판매업신고 제2025-서울강남-1234호",
  address: "서울특별시 강남구 테헤란로 123, 14층",
  email: "contact@legal-ai.kr",
  phone: "1588-0000 (평일 10:00–18:00)",
};

export default function Footer() {
  return (
    <footer className="bg-[#191F28]">
      <div className="max-w-[1080px] mx-auto px-5 lg:px-10 py-14 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16">
          <div>
            <Link href="/" className="text-[22px] font-bold tracking-tight text-white">
              법률<span className="text-[#6366F1]">AI</span>
            </Link>
            <p className="text-[14px] text-[#8B95A1] leading-[1.7] mt-4 mb-6">
              AI 법률 상담부터 변호사 매칭까지.
              <br />
              누구나 받을 수 있는 법률 서비스.
            </p>
            <Link
              href="/lawyer/register"
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#6366F1] hover:text-[#A5B4FC] transition-colors duration-200"
            >
              변호사이신가요?
              <span>→</span>
            </Link>
          </div>

          <div className="space-y-8">
            <nav>
              <ul className="flex flex-wrap gap-x-6 gap-y-2.5 text-[14px]">
                {LINKS.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className={`transition-colors duration-200 hover:text-white ${
                        l.strong ? "text-white font-semibold" : "text-[#8B95A1] font-medium"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <p className="text-[13px] leading-[1.7] text-[#8B95A1]">
              본 서비스는 일반적인 법률 정보를 제공합니다. 구체적인 사건의 법률 자문은
              변호사와의 상담을 권해드립니다.
            </p>

            <div className="text-[12px] font-medium text-[#6B7684] space-y-1 leading-[1.7]">
              <p className="text-[#8B95A1] text-[13px] font-semibold">{COMPANY.name}</p>
              <p>
                {COMPANY.ceo} · {COMPANY.bizNo}
              </p>
              <p>{COMPANY.reportNo}</p>
              <p>{COMPANY.address}</p>
              <p>
                고객센터 {COMPANY.phone} ·{" "}
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="hover:text-white transition-colors duration-200"
                >
                  {COMPANY.email}
                </a>
              </p>
            </div>

            <p className="text-[12px] text-[#6B7684] pt-6 border-t border-[#2A323C]">
              © {new Date().getFullYear()} 법률AI Inc. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
