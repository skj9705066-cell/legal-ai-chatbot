import Link from "next/link";
import { Phone } from "lucide-react";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { Badge } from "@/components/ui/badge";
import { TRIAL_LABEL, type TrialMode } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";

// 외부 조회 사이트로 바로 나가는 링크는 두지 않는다. 공식 조회 안내는 FAQ 항목(텍스트 링크 포함)으로 연결.
const NAV = [
  { href: "/#money", label: "확인할 수 있는 돈" },
  { href: "/#process", label: "진행 과정" },
  { href: "/#counselor", label: "상담사 소개" },
  { href: "/#faq", label: "자주 묻는 질문" },
];

export function SiteHeader({ trial, contactPhone = null }: { trial: TrialMode; contactPhone?: string | null }) {
  const tel = contactPhone?.replace(/[^\d+]/g, "");
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100/80 bg-ivory/95 backdrop-blur-md supports-[backdrop-filter]:bg-ivory/85">
      <div className="container flex h-[64px] items-center justify-between gap-3 lg:h-[76px]">
        <div className="flex items-center gap-2">
          <Logo />
          {trial && (
            <Badge variant="demo" className="hidden sm:inline-flex">
              {TRIAL_LABEL[trial]}
            </Badge>
          )}
        </div>
        <nav aria-label="주요 메뉴" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-xl px-3.5 py-2 text-[17px] font-semibold text-navy-700 transition-colors hover:bg-sage hover:text-charcoal">
              {n.label}
            </Link>
          ))}
          {tel && (
            <a href={`tel:${tel}`} className="ml-2 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[17px] font-bold text-forest-700 hover:bg-sage">
              <Phone className="h-5 w-5" aria-hidden="true" />
              {contactPhone}
            </a>
          )}
          <Link href="/#apply" className={buttonVariants({ size: "md", className: "ml-2 text-[17px] shadow-none" })}>
            무료 점검 신청
          </Link>
        </nav>
        <div className="flex items-center gap-1.5 lg:hidden">
          {tel && (
            <a href={`tel:${tel}`} aria-label={`전화 문의 ${contactPhone}`} className="flex h-11 w-11 items-center justify-center rounded-xl text-forest-700 hover:bg-sage">
              <Phone className="h-6 w-6" aria-hidden="true" />
            </a>
          )}
          <Link href="/#apply" className={buttonVariants({ size: "sm", className: "h-11 rounded-xl px-4 text-[17px] shadow-none" })}>
            신청하기
          </Link>
          <MobileMenu items={NAV} />
        </div>
      </div>
    </header>
  );
}
