import type { Metadata, Viewport } from "next";
import AppShell from "@/components/AppShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import SplashScreen from "@/components/SplashScreen";
import "./globals.css";

const SITE_URL = "https://lawsel.kr";
const SITE_NAME = "로셀";
const DEFAULT_TITLE = "로셀 — AI 법률 상담 플랫폼";
const DEFAULT_DESC =
  "로셀 — 딱 맞는 변호사를 골라드립니다. AI가 한국 법령·판례를 분석하고, 전문 변호사를 매칭합니다.";
const OG_IMAGE = `${SITE_URL}/og-image.png?v=2`;
const OG_DESC = "딱 맞는 변호사를 골라드립니다. 24시간 무료 AI 법률 상담.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESC,
  keywords: [
    "로셀",
    "Lawsel",
    "AI 법률상담",
    "무료 법률상담",
    "변호사 매칭",
    "법률 정보",
    "한국 법령",
    "판례 검색",
    "온라인 법률상담",
    "법률 플랫폼",
    "형사 상담",
    "이혼 상담",
    "부동산 법률",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: "(주)로셀",

  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: OG_DESC,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - AI 법률 상담 플랫폼`,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: OG_DESC,
    images: [OG_IMAGE],
    site: "@legalai_kr",
    creator: "@legalai_kr",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },

  alternates: {
    canonical: SITE_URL,
    languages: { "ko-KR": SITE_URL },
  },

  // 구글/네이버 인증 — 환경변수가 설정된 경우에만 출력
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? undefined,
    other: {
      ...(process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION
        ? {
            "naver-site-verification": [
              process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION,
            ],
          }
        : {}),
    },
  },

  manifest: "/manifest.json",
  applicationName: SITE_NAME,
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon-32.png"],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

// ── JSON-LD 구조화 데이터 ────────────────────────────────────────────────────

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: OG_IMAGE,
    width: 512,
    height: 512,
  },
  description: DEFAULT_DESC,
  foundingDate: "2025",
  areaServed: "KR",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "contact@legal-ai.kr",
    availableLanguage: "Korean",
  },
  sameAs: [],
};

const webAppSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: DEFAULT_TITLE,
  url: SITE_URL,
  applicationCategory: "LegalService",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  inLanguage: "ko-KR",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KRW",
    description: "AI 법률 상담 무료 제공",
  },
};

const legalServiceSchema = {
  "@context": "https://schema.org",
  "@type": "LegalService",
  name: `${SITE_NAME} - AI 법률 상담 서비스`,
  description:
    "AI가 한국 법령·판례를 분석하고, 형사·민사·이혼·부동산·노동 등 전 분야 법률 정보를 안내합니다.",
  url: SITE_URL,
  areaServed: {
    "@type": "Country",
    name: "South Korea",
  },
  availableLanguage: "Korean",
  priceRange: "무료 AI 상담 / 변호사 상담비 별도",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "로셀 AI 상담은 무료인가요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AI 법률 상담은 완전 무료입니다. 변호사 매칭 후 실제 상담 비용은 변호사별로 다를 수 있습니다.",
      },
    },
    {
      "@type": "Question",
      name: "AI가 법적 조언을 제공하나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "로셀은 일반적인 법령·판례 정보를 안내합니다. 변호사법 제109조에 따라 구체적인 법률 사무는 변호사만이 수행할 수 있으며, 중요한 법적 사안은 반드시 변호사와 상담하시기 바랍니다.",
      },
    },
    {
      "@type": "Question",
      name: "어떤 법률 분야를 상담할 수 있나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "형사, 민사, 이혼·가족, 부동산, 상속, 노동, 교통사고, 의료, 기업법무, 지식재산권 등 다양한 분야의 법률 정보를 안내합니다.",
      },
    },
    {
      "@type": "Question",
      name: "변호사 매칭은 어떻게 진행되나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AI 상담 완료 후 사건을 자동 요약하여 관련 분야 전문 변호사에게 전달합니다. 변호사가 직접 상담 의견과 비용을 제안하며, 이용자가 원하는 변호사를 선택합니다.",
      },
    },
    {
      "@type": "Question",
      name: "24시간 상담이 가능한가요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "AI 법률 상담은 24시간 365일 이용 가능합니다. 변호사 직접 상담은 변호사의 업무 시간에 따릅니다.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* JSON-LD 구조화 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(legalServiceSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </head>
      <body>
        <SplashScreen />
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
