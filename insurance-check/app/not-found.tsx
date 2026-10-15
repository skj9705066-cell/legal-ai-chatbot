import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/site/Logo";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-[100svh] flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div>
        <h1 className="text-[24px] font-extrabold text-navy">페이지를 찾을 수 없습니다</h1>
        <p className="mt-2 text-[15px] text-navy-600">주소가 바뀌었거나 삭제된 페이지입니다.</p>
      </div>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        처음 화면으로
      </Link>
    </main>
  );
}
