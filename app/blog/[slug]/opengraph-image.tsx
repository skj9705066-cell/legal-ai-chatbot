import { ImageResponse } from "next/og";
import { BLOG_POSTS, CATEGORY_COLOR } from "@/lib/blog-data";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

export default async function OGImage({ params }: Props) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  const title = post?.title ?? "법률 가이드";
  const category = post?.category ?? "법률";
  const thumbnail = post?.thumbnail ?? "⚖️";
  const color = CATEGORY_COLOR[category] ?? { bg: "#EEF2FF", text: "#4338CA" };

  /* Google Fonts — Noto Sans KR Bold (Korean support) */
  let fontData: ArrayBuffer | null = null;
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&display=swap",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    ).then((r) => r.text());
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/);
    if (match) {
      fontData = await fetch(match[1]).then((r) => r.arrayBuffer());
    }
  } catch {
    /* fall back to system fonts */
  }

  const fonts = fontData
    ? [{ name: "Noto", data: fontData, weight: 700 as const, style: "normal" as const }]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #4338CA 68%, #6366F1 100%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: fonts.length ? "Noto" : "system-ui, sans-serif",
        }}
      >
        {/* Grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Decorative circle */}
        <div
          style={{
            position: "absolute",
            width: 480,
            height: 480,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.08)",
            top: -180,
            right: -100,
          }}
        />

        {/* Category color strip (left) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 8,
            background: color.text,
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 72px 56px 80px",
            height: "100%",
          }}
        >
          {/* Top: brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 999,
                padding: "6px 16px",
                fontSize: 16,
                fontWeight: 700,
                color: "rgba(255,255,255,0.8)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#F59E0B",
                }}
              />
              로셀 법률 가이드
            </div>
          </div>

          {/* Middle: category + title */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Category badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 44 }}>{thumbnail}</span>
              <div
                style={{
                  background: color.bg,
                  color: color.text,
                  borderRadius: 8,
                  padding: "4px 14px",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {category}
              </div>
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: title.length > 18 ? 46 : 54,
                fontWeight: 900,
                color: "white",
                letterSpacing: "-1px",
                lineHeight: 1.3,
                maxWidth: 900,
              }}
            >
              {title}
            </div>
          </div>

          {/* Bottom: lawsel.kr */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontSize: 20,
                color: "rgba(255,255,255,0.5)",
                fontWeight: 400,
              }}
            >
              lawsel.kr/blog
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "white",
                letterSpacing: -1,
              }}
            >
              로<span style={{ color: "#F59E0B" }}>셀</span>
            </div>
          </div>
        </div>

        {/* Bottom gold bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #F59E0B 0%, #FBBF24 40%, transparent 100%)",
          }}
        />
      </div>
    ),
    { ...size, fonts }
  );
}
