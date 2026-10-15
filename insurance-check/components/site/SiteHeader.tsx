import Link from "next/link";
import { Logo } from "./Logo";
import { OfficialLink } from "./OfficialLink";
import { Badge } from "@/components/ui/badge";

export function SiteHeader({ demo }: { demo: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container flex h-16 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Logo />
          {demo && (
            <Badge variant="demo" className="hidden sm:inline-flex">
              데모
            </Badge>
          )}
        </div>
        <nav aria-label="주요 메뉴" className="flex items-center gap-1 text-[15px] font-medium text-navy-600">
          <Link href="/#services" className="hidden rounded-lg px-3 py-2 hover:bg-navy-50 hover:text-navy md:inline-flex">
            서비스 안내
          </Link>
          <OfficialLink className="rounded-lg px-2 py-2 text-[14px] hover:bg-navy-50 hover:text-navy sm:px-3 sm:text-[15px]">
            공식 조회
          </OfficialLink>
          <Link
            href="/#apply"
            className="rounded-lg px-2 py-2 text-[14px] font-semibold text-blue hover:bg-blue-50 sm:px-3 sm:text-[15px]"
          >
            상담 안내
          </Link>
        </nav>
      </div>
    </header>
  );
}
