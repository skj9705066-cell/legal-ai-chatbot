import Link from "next/link";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

// 외부 조회 사이트로 바로 나가는 링크는 두지 않는다. 공식 조회 안내는 FAQ 항목(텍스트 링크 포함)으로 연결.
const NAV = [
  { href: "/#services", label: "서비스 안내" },
  { href: "/#process", label: "점검 절차" },
  { href: "/#faq-official", label: "공식 조회 안내" },
  { href: "/#faq", label: "자주 묻는 질문" },
];

export function SiteHeader({ demo }: { demo: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="container flex h-[60px] items-center justify-between gap-3 lg:h-[72px]">
        <div className="flex items-center gap-2">
          <Logo />
          {demo && (
            <Badge variant="demo" className="hidden sm:inline-flex">
              데모
            </Badge>
          )}
        </div>
        <nav aria-label="주요 메뉴" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-xl px-3.5 py-2 text-[16px] font-medium text-navy-600 transition-colors hover:bg-navy-50 hover:text-navy">
              {n.label}
            </Link>
          ))}
          <Link href="/#services" className={buttonVariants({ size: "sm", className: "ml-3 shadow-none" })}>
            무료 점검 시작
          </Link>
        </nav>
        <div className="flex items-center gap-1.5 lg:hidden">
          <Link href="/#services" className={buttonVariants({ size: "sm", className: "h-9 rounded-xl px-3.5 text-[15px] shadow-none" })}>
            무료 점검
          </Link>
          <MobileMenu items={NAV} />
        </div>
      </div>
    </header>
  );
}
