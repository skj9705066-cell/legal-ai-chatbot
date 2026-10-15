import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="#102B4E" />
      <path d="M16 6.8 9 9.5v5.6c0 4.4 3 8.3 7 9.6 4-1.3 7-5.2 7-9.6V9.5l-7-2.7Z" fill="#1463D9" />
      <path d="m12.6 16 2.4 2.4 4.5-4.6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 rounded-lg", className)} aria-label="내보험 통합 점검 홈">
      <LogoMark />
      <span className="text-[17px] font-extrabold tracking-[-0.02em] text-navy">내보험 통합 점검</span>
    </Link>
  );
}
