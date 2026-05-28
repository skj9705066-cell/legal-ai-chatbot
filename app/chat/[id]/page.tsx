"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildTitle,
  generateId,
  getConsultation,
  upsertConsultation,
} from "@/lib/storage";
import { getQuickConsultation } from "@/lib/quick-consultations";
import { renderMarkdown, extractCitations } from "@/lib/markdown";
import type { Citation } from "@/lib/markdown";
import { hasCompletedAnalysis } from "@/lib/analysis-detection";
import RobotMascot from "@/components/RobotMascot";
import type {
  Attachment,
  AttachmentMediaType,
  ChatMessage,
  Consultation,
} from "@/lib/types";

const MAX_ATTACHMENTS = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED: Record<string, AttachmentMediaType> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "application/pdf": "application/pdf",
};

const AI_GREETING =
  "안녕하세요, 로셀 AI 상담사입니다. 어떤 법률 문제로 고민이신지 간단히 말씀해 주시겠어요? 상황을 파악한 뒤 관련 법령과 판례를 찾아 분석해 드리겠습니다.";

const SEARCH_START_MARKER = "WS_START";
const SEARCH_END_MARKER = "WS_END";

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let pos = -1;
  while ((pos = haystack.indexOf(needle, pos + 1)) !== -1) count++;
  return count;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function extractCitationsFromMessages(messages: ChatMessage[]): Citation[] {
  const texts = messages
    .filter((m) => m.role === "assistant")
    .map((m) => m.content);
  return extractCitations(texts);
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("파일을 읽을 수 없습니다."));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const quickSlug = searchParams.get("quick");
  const seedText = searchParams.get("seed");

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [searching, setSearching] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSentRef = useRef(false);

  const bannerStorageKey = `legaladvisor.banner-dismissed.${id}`;

  useEffect(() => {
    const existing = getConsultation(id);
    setConsultation(existing);
    if (typeof window !== "undefined") {
      setBannerDismissed(
        window.localStorage.getItem(bannerStorageKey) === "1",
      );
    }
    setMounted(true);
  }, [id, bannerStorageKey]);

  function dismissBanner() {
    setBannerDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(bannerStorageKey, "1");
    }
  }

  // Auto-send seeded prompt (from home search) or quick category on fresh load
  useEffect(() => {
    if (!mounted || autoSentRef.current) return;
    if (consultation && consultation.messages.length > 0) return;

    if (quickSlug) {
      const quick = getQuickConsultation(quickSlug);
      if (quick) {
        autoSentRef.current = true;
        void sendMessage(quick.prompt, [], quick.title);
        return;
      }
    }

    if (seedText) {
      const trimmed = seedText.trim();
      if (trimmed) {
        autoSentRef.current = true;
        void sendMessage(trimmed, []);
      }
    }
  }, [mounted, consultation, quickSlug, seedText]);

  // Scroll on message update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consultation?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140,
      )}px`;
    }
  }, [input]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAttachmentError(null);
    const errors: string[] = [];
    const accepted: Attachment[] = [];
    const remaining = MAX_ATTACHMENTS - attachments.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (accepted.length >= remaining) {
        errors.push(`최대 ${MAX_ATTACHMENTS}개까지 첨부 가능합니다.`);
        break;
      }
      const media = ACCEPTED[file.type];
      if (!media) {
        errors.push(`${file.name}: 지원하지 않는 형식입니다 (JPG, PNG, PDF만 가능).`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        errors.push(`${file.name}: 10MB를 초과합니다 (${formatBytes(file.size)}).`);
        continue;
      }
      try {
        const data = await readAsBase64(file);
        accepted.push({
          id: generateId(),
          name: file.name,
          type: media,
          size: file.size,
          data,
        });
      } catch {
        errors.push(`${file.name}: 파일을 읽지 못했습니다.`);
      }
    }

    if (accepted.length > 0) {
      setAttachments((prev) => [...prev, ...accepted]);
    }
    if (errors.length > 0) {
      setAttachmentError(errors.join(" "));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeAttachment(attachmentId: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    setAttachmentError(null);
  }

  async function sendMessage(
    content: string,
    files: Attachment[],
    presetCategory?: string,
  ) {
    const trimmed = content.trim();
    if (isStreaming) return;
    if (!trimmed && files.length === 0) return;

    const now = Date.now();
    const userMsg: ChatMessage = {
      role: "user",
      content: trimmed,
      ...(files.length > 0 ? { attachments: files } : {}),
    };

    const titleSource = trimmed || `첨부 파일 ${files.length}개 분석 요청`;

    const current: Consultation =
      consultation ??
      {
        id,
        title: buildTitle(titleSource),
        category: presetCategory ?? null,
        messages: [],
        status: "in_progress",
        starred: false,
        createdAt: now,
        updatedAt: now,
      };

    const nextMessages = [...current.messages, userMsg];
    const baseTitle =
      current.messages.length === 0 ? buildTitle(titleSource) : current.title;

    const optimistic: Consultation = {
      ...current,
      title: baseTitle,
      category: current.category ?? presetCategory ?? null,
      messages: [...nextMessages, { role: "assistant", content: "" }],
      updatedAt: now,
    };
    setConsultation(optimistic);
    upsertConsultation(optimistic);
    setInput("");
    setAttachments([]);
    setAttachmentError(null);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`서버 응답 오류 (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rawText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawText += decoder.decode(value, { stream: true });

        const starts = countOccurrences(rawText, SEARCH_START_MARKER);
        const ends = countOccurrences(rawText, SEARCH_END_MARKER);
        const cleanText = rawText
          .replaceAll(SEARCH_START_MARKER, "")
          .replaceAll(SEARCH_END_MARKER, "");
        setSearching(starts > ends);

        setConsultation((prev) => {
          if (!prev) return prev;
          const copy = [...prev.messages];
          copy[copy.length - 1] = {
            role: "assistant",
            content: cleanText,
          };
          const updated: Consultation = {
            ...prev,
            messages: copy,
            updatedAt: Date.now(),
          };
          return updated;
        });
      }
      setSearching(false);

      setConsultation((prev) => {
        if (!prev) return prev;
        upsertConsultation(prev);
        return prev;
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "요청 처리 중 오류가 발생했습니다.";
      setConsultation((prev) => {
        if (!prev) return prev;
        const copy = [...prev.messages];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `[오류] ${msg}\n\n잠시 후 다시 시도해주세요.`,
        };
        const updated: Consultation = {
          ...prev,
          messages: copy,
          updatedAt: Date.now(),
        };
        upsertConsultation(updated);
        return updated;
      });
    } finally {
      setIsStreaming(false);
      setSearching(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input, attachments);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input, attachments);
    }
  }

  const messages = consultation?.messages ?? [];
  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isStreaming;
  const canAttachMore = attachments.length < MAX_ATTACHMENTS;
  const aiResponseCount = messages.filter(
    (m) => m.role === "assistant" && m.content.trim().length > 0,
  ).length;
  const analysisComplete = !isStreaming && hasCompletedAnalysis(messages);
  const hasAssistantReply = !isStreaming && aiResponseCount >= 1;
  const showBanner = analysisComplete && !bannerDismissed;

  const extractedLaws = extractCitationsFromMessages(messages);
  const firstUserMessage =
    messages.find((m) => m.role === "user")?.content ?? "";

  return (
    <main className="flex flex-col h-screen lg:h-[calc(100vh-4rem)] bg-ink-0 page-enter">
      {/* Header */}
      <header className="bg-ink-2 border-b border-ink-3 z-20 pt-safe-top">
        <div className="max-w-md mx-auto px-3 h-14 flex items-center gap-2 lg:max-w-screen-xl lg:px-6">
          <button
            onClick={() => router.push("/")}
            className="lg:hidden w-9 h-9 rounded-lg hover:bg-ink-3 flex items-center justify-center text-primary-700 transition shrink-0"
            aria-label="뒤로가기"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M15 18l-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient text-white flex items-center justify-center text-sm shrink-0">
              ⚖
            </div>
            <div className="min-w-0">
              <h1 className="font-serif font-bold text-primary-900 text-base leading-tight">
                AI 법률상담
              </h1>
              <p className="text-[11px] text-primary-500 leading-tight mt-0.5">
                {consultation?.category
                  ? `${consultation.category} 상담`
                  : "법률 전문 AI 상담사"}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/matching/${id}`)}
            disabled={!hasAssistantReply}
            style={
              hasAssistantReply
                ? { backgroundColor: "#16a34a", color: "#ffffff" }
                : undefined
            }
            className={`text-xs font-semibold pl-2.5 pr-3 py-2 rounded-full transition flex items-center gap-1 shrink-0 border ${
              hasAssistantReply
                ? "border-transparent shadow-sm cta-pulse hover:brightness-110"
                : "bg-ink-2 border-ink-3 text-primary-400 cursor-not-allowed"
            }`}
            title={
              hasAssistantReply
                ? "변호사 매칭을 시작합니다"
                : "AI 답변을 받은 후 이용 가능합니다"
            }
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path
                d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="7" r="4" />
              <path
                d="M22 11l-3-3m0 0l-3 3m3-3v8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            변호사 연결
          </button>
        </div>
      </header>

      {/* Body: chat column + (desktop) sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat scroll area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-md mx-auto px-5 py-8 space-y-6 lg:max-w-2xl lg:px-8 lg:py-12 lg:space-y-7">
              {/* 인공지능기본법 제31조 — AI 서비스 사전 고지 */}
              <div className="flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-[12px] text-brand-800 leading-[1.6]">
                <svg className="shrink-0 mt-0.5 w-3.5 h-3.5 text-brand-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <span>
                  <strong className="font-semibold">본 서비스는 생성형 AI를 기반으로 운영됩니다.</strong>{" "}
                  로셀은 일반적인 법령·판례 정보를 안내하며, 변호사법 제109조에 따라 구체적인 법률 사무를 수행하지 않습니다.
                  AI가 제공하는 정보는 법적 조언이 아니므로 중요한 사안은 반드시 변호사와 상담하시기 바랍니다.
                </span>
              </div>

              {/* Static AI greeting */}
              <AssistantBubble content={AI_GREETING} streaming={false} />

              {messages.map((msg, idx) => {
                const isLast = idx === messages.length - 1;
                const isStreamingThis =
                  isStreaming && isLast && msg.role === "assistant";

                if (msg.role === "user") {
                  return (
                    <UserBubble
                      key={idx}
                      content={msg.content}
                      attachments={msg.attachments}
                    />
                  );
                }
                return (
                  <AssistantBubble
                    key={idx}
                    content={msg.content}
                    streaming={isStreamingThis}
                    searching={isStreamingThis && searching}
                  />
                );
              })}
            </div>
          </div>

          {/* Floating banner */}
          {showBanner && (
            <FloatingBanner
              onStart={() => router.push(`/matching/${id}`)}
              onDismiss={dismissBanner}
            />
          )}

          {/* Input area */}
          <div className="bg-ink-2 border-t border-ink-3">
            <div className="max-w-md mx-auto px-5 py-4 lg:max-w-2xl lg:px-8 lg:py-5">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((a) => (
                <AttachmentThumbnail
                  key={a.id}
                  attachment={a}
                  onRemove={() => removeAttachment(a.id)}
                />
              ))}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2"
          >
            <div className="flex-1 bg-surface-subtle rounded-2xl focus-within:bg-white focus-within:shadow-card transition-all duration-500 ease-luxe flex items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming || !canAttachMore}
                className="w-11 h-12 rounded-lg hover:bg-ink-3 flex items-center justify-center text-primary-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-500 ease-out shrink-0 m-1"
                aria-label="파일 첨부"
                title={
                  canAttachMore
                    ? "JPG, PNG, PDF · 최대 5개 · 각 10MB"
                    : `최대 ${MAX_ATTACHMENTS}개까지 첨부 가능`
                }
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="법률 상황을 자세히 설명해주세요"
                rows={1}
                disabled={isStreaming}
                className="flex-1 bg-transparent pr-4 py-3.5 outline-none resize-none text-primary-900 placeholder:text-primary-300 text-base leading-relaxed disabled:cursor-not-allowed"
                style={{ maxHeight: "160px" }}
              />
            </div>
            <button
              type="submit"
              disabled={!canSend}
              className="bg-gold hover:bg-gold-light disabled:bg-ink-3 text-white rounded-lg w-12 h-12 flex items-center justify-center transition-all duration-500 ease-out shrink-0"
              aria-label="전송"
            >
              {isStreaming ? (
                <svg
                  className="w-5 h-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeOpacity="0.3"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M22 2L11 13" strokeLinecap="round" />
                  <path
                    d="M22 2L15 22L11 13L2 9L22 2Z"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </form>
              {attachmentError && (
                <p className="text-[11px] text-red-600 mt-2">{attachmentError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:w-[40%] lg:max-w-[480px] lg:flex-col lg:border-l lg:border-ink-3 lg:bg-ink-2 overflow-y-auto">
          <ChatSidebar
            category={consultation?.category ?? null}
            messageCount={messages.length}
            aiResponseCount={aiResponseCount}
            firstUserMessage={firstUserMessage}
            extractedLaws={extractedLaws}
            analysisComplete={analysisComplete}
            onGoMatching={() => router.push(`/matching/${id}`)}
          />
        </aside>
      </div>
    </main>
  );
}

/* ---------- Desktop sidebar ---------- */

function ChatSidebar({
  category,
  messageCount,
  aiResponseCount,
  firstUserMessage,
  extractedLaws,
  analysisComplete,
  onGoMatching,
}: {
  category: string | null;
  messageCount: number;
  aiResponseCount: number;
  firstUserMessage: string;
  extractedLaws: Citation[];
  analysisComplete: boolean;
  onGoMatching: () => void;
}) {
  const hasContent = messageCount > 0;
  return (
    <div className="p-8 space-y-7 w-full">
      <div>
        <div className="text-[11px] font-bold text-brand-700 tracking-widest mb-1.5">
          상담 진행 현황
        </div>
        <h2 className="font-serif font-bold text-primary-900 text-xl">
          사건 분석 요약
        </h2>
      </div>

      {/* Summary card */}
      <section className="bg-ink-0 border border-ink-3 rounded-2xl p-6 space-y-3.5">
        <div className="flex items-center gap-2">
          {category ? (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              {category}
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-ink-3 text-primary-700">
              법률상담
            </span>
          )}
          <span className="text-[11px] text-primary-400">
            메시지 {messageCount}개 · AI 응답 {aiResponseCount}개
          </span>
        </div>
        {hasContent ? (
          <p className="text-sm text-primary-800 leading-relaxed line-clamp-4">
            {firstUserMessage || "이미지/PDF만 첨부된 상담입니다."}
          </p>
        ) : (
          <p className="text-sm text-primary-400 leading-relaxed">
            아직 대화가 시작되지 않았습니다. 왼쪽에서 법률 상황을 입력해주세요.
          </p>
        )}
      </section>

      {/* Related laws */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-h3">인용된 법령·판례</h3>
          {extractedLaws.length > 0 && (
            <span className="text-[12px] font-semibold text-text-muted">
              {extractedLaws.length}건
            </span>
          )}
        </div>
        {extractedLaws.length === 0 ? (
          <div className="bg-surface-subtle border border-dashed border-surface-line rounded-xl p-5 text-center text-[13px] text-text-muted font-medium">
            AI 답변에서 인용된 법령·판례가 여기에 표시됩니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {extractedLaws.map((c, idx) => (
              <a
                key={`${c.label}-${idx}`}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white shadow-sm hover:shadow-card border border-surface-line hover:border-gold transition-all duration-500 ease-luxe"
              >
                <span
                  className={`shrink-0 text-[10px] font-bold tracking-eyebrow px-1.5 h-5 leading-5 rounded ${
                    c.kind === "case"
                      ? "bg-navy-900 text-gold"
                      : "bg-gold-50 text-gold-700"
                  }`}
                >
                  {c.kind === "case" ? "판례" : "법령"}
                </span>
                <span className="text-[13px] text-navy-900 font-medium truncate group-hover:text-gold-700">
                  {c.label}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Lawyer CTA */}
      <section className="rounded-2xl p-7 bg-white shadow-card border border-surface-line">
        <div className="text-caption text-gold mb-2">NEXT STEP</div>
        <div className="text-h3">
          {analysisComplete
            ? "변호사 상담 연결하기"
            : "AI 분석을 먼저 완료해 주세요"}
        </div>
        <p className="text-[13px] text-text-muted mt-2.5 leading-[1.7] font-medium">
          {analysisComplete
            ? "분석 결과를 바탕으로 해당 분야 변호사가 직접 상담비와 의견을 제안합니다."
            : "AI가 사건을 충분히 파악하고 종합 분석을 마치면 변호사 연결이 활성화됩니다."}
        </p>
        <button
          onClick={onGoMatching}
          disabled={!analysisComplete}
          className={`mt-6 w-full font-semibold rounded-xl h-12 text-[15px] tracking-luxe transition-all duration-500 ease-luxe ${
            analysisComplete
              ? "btn-primary"
              : "bg-surface-subtle text-text-subtle cursor-not-allowed"
          }`}
        >
          {analysisComplete
            ? "변호사 상담 연결하기"
            : "AI 분석 진행 중..."}
        </button>
        <p className="text-[12px] text-text-muted leading-[1.7] mt-4 font-medium">
          로셀은 법률상담의 수행 주체가 아닙니다. 본 서비스는 생성형 AI 기반으로 일반적인 법령·판례 정보를 제공하며, 변호사법 제109조에 따라 구체적인 법률 사무를 수행하지 않습니다.
        </p>
      </section>
    </div>
  );
}

/* ---------- Bubbles ---------- */

function AssistantBubble({
  content,
  streaming,
  searching = false,
}: {
  content: string;
  streaming: boolean;
  searching?: boolean;
}) {
  const isThinking = streaming && !content;
  return (
    <div className="flex justify-start animate-fade-up">
      <div className="flex items-start gap-3 max-w-[88%]">
        <RobotMascot
          size="sm"
          expression={isThinking ? "thinking" : "smile"}
          className="w-9 h-auto shrink-0 -mt-1"
        />
        <div
          className="rounded-2xl rounded-tl-md px-5 py-4 shadow-card"
          style={{
            backgroundImage:
              "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          }}
        >
          {content ? (
            <>
              <div
                className={`assistant-content text-primary-900 ${
                  streaming && !searching ? "typing-cursor" : ""
                }`}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
              {!streaming && (
                <p className="mt-3 pt-2.5 border-t border-ink-3 text-[11px] text-primary-400 font-medium">
                  AI 생성물 | 인공지능에 의해 생성된 콘텐츠입니다
                </p>
              )}
            </>
          ) : (
            !searching && (
              <div className="flex items-center gap-1.5 py-1 px-1">
                <span className="inline-block w-1.5 h-1.5 bg-bone-300 rounded-full animate-bounce" />
                <span
                  className="inline-block w-1.5 h-1.5 bg-bone-300 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="inline-block w-1.5 h-1.5 bg-bone-300 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            )
          )}
          {searching && (
            <div
              className={`flex items-center gap-2 text-[14px] text-gold font-medium ${content ? "mt-4 pt-4 border-t border-ink-3" : ""}`}
            >
              <span className="relative flex items-center justify-center w-4 h-4 shrink-0">
                <span className="absolute inset-0 rounded-full bg-brand-500/30 animate-ping" />
                <span className="relative w-2 h-2 rounded-full bg-brand-600" />
              </span>
              <span>최신 판례·법령을 검색하고 있습니다...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserBubble({
  content,
  attachments,
}: {
  content: string;
  attachments?: Attachment[];
}) {
  const hasAttachments = !!attachments && attachments.length > 0;
  return (
    <div className="flex justify-end w-full animate-fade-up">
      <div
        style={{ backgroundColor: "#0f172a", color: "#ffffff" }}
        className="max-w-[85%] min-h-[2.5rem] rounded-2xl rounded-br-md px-5 py-3 shadow-card"
      >
        {hasAttachments && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments!.map((a) => (
              <MessageAttachment key={a.id} attachment={a} />
            ))}
          </div>
        )}
        {(content || !hasAttachments) && (
          <div
            className="whitespace-pre-wrap leading-[1.7] text-[16px] font-normal"
            style={{ color: "#ffffff" }}
          >
            {content || " "}
          </div>
        )}
      </div>
    </div>
  );
}

function FloatingBanner({
  onStart,
  onDismiss,
}: {
  onStart: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="bg-white border-t border-surface-line px-5 py-3 banner-slide-up">
      <div className="max-w-md mx-auto lg:max-w-2xl rounded-2xl bg-surface-subtle border border-surface-line px-5 py-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-navy-900 leading-[1.7] font-medium">
            본 서비스는 일반적인 법률 정보를 제공하며, 구체적인 사건의 법률 자문은 변호사 상담을 통해 받으실 수 있습니다.
          </p>
          <button
            onClick={onStart}
            className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-cta-600 hover:text-cta-700 transition-colors duration-500 ease-luxe"
          >
            변호사 상담 연결하기
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path
                d="M5 12h14M13 5l7 7-7 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 w-7 h-7 rounded-full text-text-muted hover:text-navy-900 hover:bg-white flex items-center justify-center text-lg transition-all duration-500 ease-luxe"
          aria-label="배너 닫기"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/* ---------- Attachments ---------- */

function AttachmentThumbnail({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const isImage = attachment.type.startsWith("image/");
  const previewUrl =
    isImage && attachment.data
      ? `data:${attachment.type};base64,${attachment.data}`
      : null;

  return (
    <div className="relative group w-16 h-16 rounded-lg border border-ink-3 bg-ink-2 overflow-hidden shadow-sm">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={attachment.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center px-1 text-center bg-red-50">
          <svg
            className="w-5 h-5 text-red-600 mb-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[9px] font-semibold text-red-700">PDF</span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center text-[10px] leading-none"
        aria-label={`${attachment.name} 제거`}
      >
        ×
      </button>
    </div>
  );
}

function MessageAttachment({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.type.startsWith("image/");
  const previewUrl =
    isImage && attachment.data
      ? `data:${attachment.type};base64,${attachment.data}`
      : null;

  if (previewUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt={attachment.name}
        className="w-20 h-20 object-cover rounded-lg border border-white/30"
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-ink-2/15 rounded-lg px-2 py-1 text-[11px] border border-white/25">
      <svg
        className="w-3.5 h-3.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="truncate max-w-[140px]">{attachment.name}</span>
    </div>
  );
}
