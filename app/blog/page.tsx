"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BLOG_POSTS,
  BLOG_CATEGORIES,
  CATEGORY_COLOR,
  type BlogCategory,
  type BlogPost,
} from "@/lib/blog-data";

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${y}년 ${parseInt(m)}월 ${parseInt(day)}일`;
}

function PostCard({ post }: { post: BlogPost }) {
  const color = CATEGORY_COLOR[post.category] ?? { bg: "#F2F4F6", text: "#4E5968" };
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-[#E5E8EB] hover:border-[#4338CA]/40 hover:shadow-[0_4px_24px_rgba(67,56,202,0.08)] transition-all duration-200"
    >
      {/* Thumbnail */}
      <div
        className="h-36 lg:h-44 flex items-center justify-center text-5xl"
        style={{ background: color.bg }}
      >
        {post.thumbnail}
      </div>

      <div className="p-5">
        {/* Category + read time */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="inline-flex items-center px-2.5 h-6 rounded-full text-[11px] font-semibold tracking-tight"
            style={{ background: color.bg, color: color.text }}
          >
            {post.category}
          </span>
          <span className="text-[12px] text-[#8B95A1]">{post.readMin}분 읽기</span>
        </div>

        <h2 className="text-[16px] lg:text-[17px] font-bold text-[#191F28] leading-[1.45] mb-2 group-hover:text-[#4338CA] transition-colors duration-200">
          {post.title}
        </h2>
        <p className="text-[13px] text-[#4E5968] leading-[1.6] line-clamp-2 mb-4">
          {post.summary}
        </p>

        <span className="text-[12px] text-[#8B95A1]">{formatDate(post.date)}</span>
      </div>
    </Link>
  );
}

export default function BlogPage() {
  const [active, setActive] = useState<BlogCategory>("전체");

  const filtered =
    active === "전체"
      ? BLOG_POSTS
      : BLOG_POSTS.filter((p) => p.category === active);

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <main className="min-h-screen bg-[#F4F5F7] page-enter">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E8EB] pt-safe-top">
        <div className="max-w-md mx-auto px-6 h-14 flex items-center">
          <h1 className="text-[17px] font-bold text-[#191F28] tracking-tight">법률 블로그</h1>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Heading */}
        <div className="mb-8 lg:mb-10">
          <h1 className="hidden lg:block text-[32px] font-bold text-[#191F28] tracking-tight mb-2">
            법률 블로그
          </h1>
          <p className="text-[14px] lg:text-[15px] text-[#4E5968]">
            일상 속 법률 문제, 쉽고 정확하게 알아보세요
          </p>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-8">
          {BLOG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat as BlogCategory)}
              className={`px-4 h-9 rounded-full text-[13px] font-semibold transition-all duration-200 ${
                active === cat
                  ? "bg-[#4338CA] text-white shadow-[0_2px_8px_rgba(67,56,202,0.25)]"
                  : "bg-white text-[#4E5968] border border-[#E5E8EB] hover:border-[#4338CA]/40 hover:text-[#4338CA]"
              }`}
            >
              {cat}
              {active === cat && cat !== "전체" && (
                <span className="ml-1.5 opacity-80">
                  ({BLOG_POSTS.filter((p) => p.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {sorted.length === 0 ? (
          <p className="text-center py-20 text-[#8B95A1] text-[15px]">
            해당 카테고리의 글이 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {sorted.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
