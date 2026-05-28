"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import type { ChatRoomRow, MessageRow } from "@/lib/supabase-types";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "오늘";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "어제";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function fileIcon(type: string | null | undefined): string {
  if (!type) return "📎";
  if (type.startsWith("image/")) return "🖼️";
  if (type === "application/pdf") return "📄";
  return "📎";
}

export default function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const router = useRouter();
  const { account, loading: authLoading } = useAuth();

  const [room, setRoom] = useState<ChatRoomRow | null>(null);
  const [otherName, setOtherName] = useState("");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Load room + messages
  const load = useCallback(async () => {
    if (!account) return;

    const { data: roomData } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("id", roomId)
      .maybeSingle();

    if (!roomData) { setNotFound(true); setPageLoading(false); return; }

    // Verify access
    const isLawyer = account.type === "lawyer";
    const hasAccess = isLawyer
      ? roomData.lawyer_user_id === account.id
      : roomData.user_id === account.id;

    if (!hasAccess) { router.replace("/chat/rooms"); return; }

    setRoom(roomData);

    // Get other user's name
    const otherUserId = isLawyer ? roomData.user_id : roomData.lawyer_user_id;
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", otherUserId).maybeSingle();
    setOtherName(profile?.name ?? (isLawyer ? "의뢰인" : "변호사"));

    // Get messages
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    setMessages((msgs as MessageRow[]) ?? []);

    // Mark unread as read
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("room_id", roomId)
      .eq("is_read", false)
      .neq("sender_id", account.id);

    setPageLoading(false);
    setTimeout(() => scrollToBottom(), 100);
  }, [account, roomId, router, scrollToBottom]);

  useEffect(() => {
    if (authLoading) return;
    if (!account) { router.replace("/login?next=/chat/rooms"); return; }
    void load();
  }, [authLoading, account, load, router]);

  // Realtime subscription
  useEffect(() => {
    if (!account || !room) return;

    const ch = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        async (payload: { new: Record<string, unknown> }) => {
          const msg = payload.new as unknown as MessageRow;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Mark as read if from other
          if (msg.sender_id !== account.id) {
            await supabase.from("messages").update({ is_read: true }).eq("id", msg.id);
          }
          setTimeout(() => scrollToBottom(true), 50);
        },
      )
      .subscribe();

    realtimeRef.current = ch;
    return () => { void supabase.removeChannel(ch); };
  }, [account, room, roomId, scrollToBottom]);

  async function sendMessage(content: string, file?: { name: string; data: string; type: string; size: number }) {
    if (!account || !room) return;
    if (!content.trim() && !file) return;
    setSending(true);

    const payload = {
      room_id: roomId,
      sender_id: account.id,
      content: content.trim(),
      file_name: file?.name ?? null,
      file_data: file?.data ?? null,
      file_type: file?.type ?? null,
      file_size: file?.size ?? null,
      is_read: false,
    };

    await supabase.from("messages").insert(payload);
    await supabase.from("chat_rooms").update({ last_message_at: new Date().toISOString() }).eq("id", roomId);

    setInput("");
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert("파일 크기는 3MB 이하만 가능합니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      await sendMessage("", { name: file.name, data: base64, type: file.type, size: file.size });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#4338CA] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex flex-col items-center justify-center gap-4 px-5">
        <p className="text-[16px] font-bold text-[#191F28]">채팅방을 찾을 수 없습니다</p>
        <button onClick={() => router.back()} className="text-[14px] font-semibold text-[#4338CA]">돌아가기</button>
      </div>
    );
  }

  // Group messages by date
  const grouped: { date: string; msgs: MessageRow[] }[] = [];
  for (const msg of messages) {
    const date = formatDate(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (!last || last.date !== date) grouped.push({ date, msgs: [msg] });
    else last.msgs.push(msg);
  }

  const isLawyer = account?.type === "lawyer";

  return (
    <main className="flex flex-col h-[100dvh] bg-[#F4F5F7]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E8EB] pt-safe-top shrink-0">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.push("/chat/rooms")} className="w-9 h-9 rounded-lg hover:bg-[#F4F5F7] flex items-center justify-center text-[#4E5968] transition-colors shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#191F28] truncate">
              {otherName}{!isLawyer && " 변호사"}
            </p>
            <p className="text-[11px] text-[#8B95A1] font-medium">법률 상담 채팅</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        <div className="max-w-2xl mx-auto space-y-1">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[14px] font-bold text-[#4E5968]">채팅을 시작해보세요</p>
              <p className="text-[12px] text-[#8B95A1] font-medium mt-1">
                {isLawyer ? "의뢰인에게 먼저 인사를 건네보세요." : "변호사에게 사건 내용을 설명해주세요."}
              </p>
            </div>
          )}

          {grouped.map(({ date, msgs }) => (
            <div key={date}>
              <div className="text-center py-3">
                <span className="text-[11px] font-semibold text-[#8B95A1] bg-white rounded-full px-3 py-1 shadow-sm">{date}</span>
              </div>
              {msgs.map((msg) => {
                const isMine = msg.sender_id === account?.id;
                return (
                  <div key={msg.id} className={`flex mb-2 ${isMine ? "justify-end" : "justify-start"}`}>
                    {!isMine && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4338CA] to-[#6366F1] flex items-center justify-center text-white text-[11px] font-bold shrink-0 mr-2 mt-0.5">
                        {otherName.slice(0, 2)}
                      </div>
                    )}
                    <div className={`max-w-[70%] ${isMine ? "" : ""}`}>
                      {msg.file_name ? (
                        <div className={`rounded-2xl px-4 py-3 shadow-sm ${isMine ? "bg-[#4338CA] text-white rounded-br-sm" : "bg-white text-[#191F28] rounded-bl-sm"}`}>
                          {msg.file_data && msg.file_type?.startsWith("image/") ? (
                            <img
                              src={`data:${msg.file_type};base64,${msg.file_data}`}
                              alt={msg.file_name}
                              className="max-w-[200px] rounded-lg"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{fileIcon(msg.file_type)}</span>
                              <div>
                                <p className={`text-[13px] font-semibold truncate max-w-[140px] ${isMine ? "text-white" : "text-[#191F28]"}`}>{msg.file_name}</p>
                                {msg.file_size && <p className={`text-[11px] ${isMine ? "text-white/70" : "text-[#8B95A1]"}`}>{Math.ceil(msg.file_size / 1024)}KB</p>}
                              </div>
                            </div>
                          )}
                          {msg.content && <p className={`text-[13px] mt-1.5 ${isMine ? "text-white" : "text-[#191F28]"}`}>{msg.content}</p>}
                        </div>
                      ) : (
                        <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${isMine ? "bg-[#4338CA] text-white rounded-br-sm" : "bg-white text-[#191F28] rounded-bl-sm"}`}>
                          <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                      )}
                      <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                        <span className="text-[10px] text-[#8B95A1]">{formatTime(msg.created_at)}</span>
                        {isMine && (
                          <span className="text-[10px] text-[#8B95A1]">{msg.is_read ? "읽음" : "안읽음"}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-[#E5E8EB] px-4 py-3 shrink-0">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/gif,application/pdf"
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8B95A1] hover:bg-[#F4F5F7] hover:text-[#4338CA] transition-colors shrink-0"
            aria-label="파일 첨부"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
            rows={1}
            className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-[#E5E8EB] focus:border-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4338CA]/10 text-[14px] text-[#191F28] placeholder:text-[#8B95A1] transition-all duration-200 max-h-32 overflow-y-auto"
            style={{ height: "auto", minHeight: "40px" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 128) + "px";
            }}
          />

          <button
            type="button"
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-[#4338CA] disabled:bg-[#E5E8EB] flex items-center justify-center text-white transition-colors shrink-0"
            aria-label="전송"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="h-safe-bottom" />
      </div>
    </main>
  );
}
