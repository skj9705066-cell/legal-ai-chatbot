"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex min-h-[100svh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-[24px] font-extrabold text-navy">일시적인 오류가 발생했습니다</h1>
        <p className="mt-2 text-[15px] text-navy-600">잠시 후 다시 시도해 주세요. 입력하신 정보는 전송되지 않았을 수 있습니다.</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset} size="lg">
          다시 시도
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          처음 화면으로
        </Link>
      </div>
    </main>
  );
}
