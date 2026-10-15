import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#102B4E" />
      <path d="M16 6.5 8.5 9.4v5.9c0 4.7 3.2 8.9 7.5 10.2 4.3-1.3 7.5-5.5 7.5-10.2V9.4L16 6.5Z" fill="#1463D9" />
      <path d="m12.3 16 2.6 2.6 5-5.1" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg" aria-label="내보험 통합 점검 홈">
      <LogoMark />
      <span className="text-[17px] font-extrabold tracking-tight text-navy">내보험 통합 점검</span>
    </Link>
  );
}
