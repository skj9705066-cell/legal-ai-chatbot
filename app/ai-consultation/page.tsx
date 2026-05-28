"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateId } from "@/lib/storage";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#4338CA] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Redirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const seed = params.get("seed");
    const id = generateId();
    router.replace(
      seed ? `/chat/${id}?seed=${encodeURIComponent(seed)}` : `/chat/${id}`
    );
  }, [router, params]);

  return <Spinner />;
}

export default function AIConsultationPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Redirect />
    </Suspense>
  );
}
