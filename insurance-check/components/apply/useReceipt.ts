"use client";

import { useEffect, useState } from "react";
import { loadReceipt, type StoredReceipt } from "@/lib/analytics";

/** undefined = 확인 중, null = 영수증 없음(직접 접근·세션 만료) */
export function useReceipt(): [StoredReceipt | null | undefined, (r: StoredReceipt) => void] {
  const [receipt, setReceipt] = useState<StoredReceipt | null | undefined>(undefined);
  useEffect(() => {
    setReceipt(loadReceipt());
  }, []);
  return [receipt, setReceipt];
}
