"use client";

import { useEffect } from "react";
import AuthForm from "./AuthForm";
import type { Account } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (account: Account) => void;
  title?: string;
  description?: string;
}

export default function AuthModal({
  open,
  onClose,
  onSuccess,
  title = "간편 가입",
  description = "변호사 매칭을 위해 잠깐만 가입해주세요",
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/50 backdrop-blur-md animate-fade-in">
      <div
        className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-elevated max-h-[92vh] overflow-y-auto banner-slide-up sm:animate-fade-up"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full hover:bg-surface-subtle text-text-muted hover:text-navy-900 flex items-center justify-center text-2xl leading-none transition-colors duration-500 ease-luxe z-10"
          aria-label="닫기"
        >
          ×
        </button>
        <div className="p-7 sm:p-9 pt-10">
          <div className="text-center mb-7">
            <p className="text-caption text-gold mb-3">SIGN UP</p>
            <h2 className="text-h2">{title}</h2>
            <p className="text-body-muted mt-2.5">{description}</p>
          </div>
          <AuthForm
            mode="signup"
            hideHeading
            onSuccess={(acc) => onSuccess(acc)}
          />
        </div>
      </div>
    </div>
  );
}
