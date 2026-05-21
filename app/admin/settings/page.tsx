"use client";

import { useState } from "react";
import { DEFAULT_SETTINGS } from "@/lib/admin-data";
import type { AdminSettings } from "@/lib/admin-data";
import Toast from "@/components/admin/Toast";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [draft, setDraft] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const dirty =
    settings.siteName !== draft.siteName ||
    settings.systemPrompt !== draft.systemPrompt ||
    settings.matchingFeeRate !== draft.matchingFeeRate ||
    settings.emailNotifications !== draft.emailNotifications;

  function save() {
    if (draft.matchingFeeRate < 0 || draft.matchingFeeRate > 100) {
      setToast({ message: "매칭 수수료율은 0~100 사이여야 합니다", type: "error" });
      return;
    }
    setSettings(draft);
    setToast({ message: "설정이 저장되었습니다", type: "success" });
  }

  function reset() {
    setDraft(settings);
  }

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] lg:text-[26px] font-bold text-[#191F28] tracking-tight">
            설정
          </h1>
          <p className="mt-1.5 text-[14px] text-[#8B95A1] font-medium">
            서비스 기본값을 관리하세요
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={reset}
            disabled={!dirty}
            className="h-10 px-4 rounded-lg bg-white border border-[#E5E8EB] hover:bg-[#F4F5F7] text-[#4E5968] text-[13px] font-semibold transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            className="h-10 px-4 rounded-lg bg-[#4338CA] hover:bg-[#6366F1] text-white text-[13px] font-semibold transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            저장
          </button>
        </div>
      </header>

      <div className="space-y-4 lg:space-y-5">
        <Card title="기본 정보" desc="사용자에게 보여지는 사이트 정보">
          <Label text="사이트 이름">
            <input
              type="text"
              value={draft.siteName}
              onChange={(e) => setDraft({ ...draft, siteName: e.target.value })}
              className="w-full h-11 px-3.5 rounded-lg border border-[#E5E8EB] focus:border-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4338CA]/14 text-[14px] font-medium text-[#191F28] transition-all duration-200"
            />
          </Label>
        </Card>

        <Card
          title="AI 시스템 프롬프트"
          desc="모든 AI 상담의 기본 행동을 정의합니다"
        >
          <textarea
            value={draft.systemPrompt}
            onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
            rows={6}
            className="w-full px-3.5 py-3 rounded-lg border border-[#E5E8EB] focus:border-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4338CA]/14 text-[13px] font-medium text-[#191F28] leading-[1.7] transition-all duration-200 resize-none"
          />
          <p className="mt-1.5 text-[11px] text-[#8B95A1] font-medium">
            {draft.systemPrompt.length}자
          </p>
        </Card>

        <Card title="매칭 수수료율" desc="변호사 매칭 시 부과되는 수수료 비율">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={draft.matchingFeeRate}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  matchingFeeRate: Number(e.target.value),
                })
              }
              className="w-24 h-11 px-3.5 rounded-lg border border-[#E5E8EB] focus:border-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4338CA]/14 text-[14px] font-medium text-[#191F28] text-right transition-all duration-200"
            />
            <span className="text-[14px] font-semibold text-[#4E5968]">%</span>
          </div>
        </Card>

        <Card title="알림 설정" desc="관리자에게 발송되는 알림">
          <ToggleRow
            label="이메일 알림"
            desc="신규 변호사 신청·매칭 진행 시 이메일 발송"
            value={draft.emailNotifications}
            onChange={(v) => setDraft({ ...draft, emailNotifications: v })}
          />
        </Card>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

function Card({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl p-5 lg:p-6 shadow-[0_1px_2px_rgba(25,31,40,0.04)]">
      <div className="mb-4">
        <h2 className="text-[15px] lg:text-[16px] font-bold text-[#191F28]">
          {title}
        </h2>
        <p className="mt-0.5 text-[12px] lg:text-[13px] text-[#8B95A1] font-medium">
          {desc}
        </p>
      </div>
      {children}
    </section>
  );
}

function Label({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-[#8B95A1] mb-1.5">
        {text}
      </span>
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#191F28]">{label}</p>
        <p className="mt-0.5 text-[12px] text-[#8B95A1] font-medium">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`shrink-0 w-11 h-6 rounded-full relative transition-colors duration-200 ${
          value ? "bg-[#4338CA]" : "bg-[#E5E8EB]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
