import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  BLOG_POSTS,
  CATEGORY_COLOR,
  getRelatedPosts,
} from "@/lib/blog-data";
import BlogCTA from "@/components/BlogCTA";

const SITE_URL = "https://lawsel.kr";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return {};

  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.summary,
      publishedTime: post.date,
      locale: "ko_KR",
      siteName: "로셀",
    },
    twitter: {
      card: "summary",
      title: post.title,
      description: post.summary,
    },
  };
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${y}년 ${parseInt(m)}월 ${parseInt(day)}일`;
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const related = getRelatedPosts(post, 3);
  const color = CATEGORY_COLOR[post.category] ?? { bg: "#F2F4F6", text: "#4E5968" };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    author: { "@type": "Organization", name: "로셀" },
    publisher: {
      "@type": "Organization",
      name: "로셀",
      url: SITE_URL,
    },
    url: `${SITE_URL}/blog/${post.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <main className="min-h-screen bg-[#F4F5F7] page-enter pb-24 lg:pb-16">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E8EB] pt-safe-top">
          <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
            <Link
              href="/blog"
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#F4F5F7] transition-colors"
              aria-label="목록으로"
            >
              <svg className="w-5 h-5 text-[#191F28]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <span className="text-[15px] font-semibold text-[#191F28] truncate">{post.title}</span>
          </div>
        </header>

        <div className="max-w-[800px] mx-auto px-6 lg:px-8 py-8 lg:py-12">
          {/* Back link (desktop) */}
          <Link
            href="/blog"
            className="hidden lg:inline-flex items-center gap-1.5 text-[14px] font-medium text-[#4E5968] hover:text-[#4338CA] transition-colors mb-8"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            블로그 목록
          </Link>

          {/* Article header */}
          <article>
            <header className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="inline-flex items-center px-3 h-7 rounded-full text-[12px] font-semibold"
                  style={{ background: color.bg, color: color.text }}
                >
                  {post.category}
                </span>
                <span className="text-[13px] text-[#8B95A1]">{post.readMin}분 읽기</span>
              </div>

              <h1 className="text-[24px] lg:text-[32px] font-bold text-[#191F28] leading-[1.35] tracking-tight mb-4">
                {post.title}
              </h1>
              <p className="text-[15px] lg:text-[16px] text-[#4E5968] leading-[1.7] mb-4">
                {post.summary}
              </p>
              <time className="text-[13px] text-[#8B95A1]">{formatDate(post.date)}</time>
            </header>

            {/* Content */}
            <div className="space-y-8">
              {post.sections.map((section, si) => (
                <section key={si}>
                  {section.h && (
                    <h2 className="text-[18px] lg:text-[20px] font-bold text-[#191F28] tracking-tight mb-3 pb-2 border-b border-[#E5E8EB]">
                      {section.h}
                    </h2>
                  )}
                  <div className="space-y-3">
                    {section.p.map((para, pi) => (
                      <p key={pi} className="text-[15px] lg:text-[16px] text-[#333D4B] leading-[1.85]">
                        {para}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* Disclaimer */}
            <div className="mt-10 pt-6 border-t border-[#E5E8EB] space-y-2">
              <p className="text-[12px] text-[#8B95A1] leading-[1.6]">
                ⚠️ 본 내용은 일반적인 법률 정보이며, 구체적인 사안은 반드시 변호사와 상담하시기 바랍니다. 개별 사건에 따라 법적 판단이 달라질 수 있습니다.
              </p>
              <p className="text-[11px] text-[#B0B8C1]">
                🤖 AI 생성물 | 인공지능에 의해 생성된 콘텐츠입니다
              </p>
            </div>
          </article>

          {/* CTA */}
          <div className="mt-10">
            <BlogCTA />
          </div>

          {/* Related posts */}
          {related.length > 0 && (
            <section className="mt-12">
              <h2 className="text-[18px] font-bold text-[#191F28] tracking-tight mb-5">
                관련 글
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {related.map((rp) => {
                  const rc = CATEGORY_COLOR[rp.category] ?? { bg: "#F2F4F6", text: "#4E5968" };
                  return (
                    <Link
                      key={rp.slug}
                      href={`/blog/${rp.slug}`}
                      className="group bg-white rounded-xl border border-[#E5E8EB] hover:border-[#4338CA]/40 hover:shadow-md transition-all duration-200 overflow-hidden"
                    >
                      <div
                        className="h-20 flex items-center justify-center text-3xl"
                        style={{ background: rc.bg }}
                      >
                        {rp.thumbnail}
                      </div>
                      <div className="p-4">
                        <span
                          className="inline-flex items-center px-2 h-5 rounded-full text-[10px] font-semibold mb-2"
                          style={{ background: rc.bg, color: rc.text }}
                        >
                          {rp.category}
                        </span>
                        <p className="text-[13px] font-semibold text-[#191F28] leading-[1.4] group-hover:text-[#4338CA] transition-colors line-clamp-2">
                          {rp.title}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Back button (mobile) */}
          <div className="mt-10 lg:hidden">
            <Link
              href="/blog"
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border border-[#E5E8EB] bg-white text-[14px] font-semibold text-[#4E5968] hover:text-[#4338CA] hover:border-[#4338CA]/40 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
