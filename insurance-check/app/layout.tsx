import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getPublicConfig } from "@/lib/config";
import { Analytics } from "@/components/site/Analytics";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "내보험 통합 점검 | 미청구·숨은 보험금 확인 방법 안내", template: "%s | 내보험 통합 점검" },
  description:
    "병원비·수술비 미청구 보험금, 숨은 보험금, 과오납 보험료·해지환급금 확인 방법을 안내합니다. 숨은보험금은 공식 조회 서비스에서 직접 조회할 수 있습니다.",
  openGraph: {
    title: "혹시 아직 받지 못한 보험금이 있으신가요?",
    description: "미청구·숨은 보험금, 과오납 보험료·해지환급금 확인 방법 안내",
    type: "website",
    locale: "ko_KR",
  },
  robots: process.env.APP_MODE === "production" ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const config = getPublicConfig();
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only z-[60] rounded-lg bg-navy px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          본문 바로가기
        </a>
        {children}
        <Analytics gaId={config.gaMeasurementId} />
      </body>
    </html>
  );
}
