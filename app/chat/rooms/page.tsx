"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import type { ChatRoomRow, MessageRow } from "@/lib/supabase-types";

interface RoomWithMeta extends ChatRoomRow {
  otherName: string;
  lastMessage: string;
  unreadCount: number;
  lastAt: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60_000);
  if (diffM < 1) return "방금";
  if (diffM < 60) return `${diffM}분 전`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}일 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ChatRoomsPage() {
  const router = useRouter();
  const { account, loading } = useAuth();
  const [rooms, setRooms] = useState<RoomWithMeta[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!account) return;
    setRoomsLoading(true);

    const isLawyer = account.type === "lawyer";
    const filter = isLawyer ? "lawyer_user_id" : "user_id";

    const { data: rawRooms } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq(filter, account.id)
      .order("last_message_at", { ascending: false });

    if (!rawRooms) { setRoomsLoading(false); return; }

    const enriched: RoomWithMeta[] = await Promise.all(
      rawRooms.map(async (room: ChatRoomRow) => {
        const otherUserId = isLawyer ? room.user_id : room.lawyer_user_id;

        // Get other user's profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", otherUserId)
          .maybeSingle();

        // Get last message
        const { data: lastMsgs } = await supabase
          .from("messages")
          .select("content, created_at, is_read, sender_id")
          .eq("room_id", room.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMsg = lastMsgs?.[0] as MessageRow | undefined;

        // Count unread
        const { count: unread } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .eq("is_read", false)
          .neq("sender_id", account.id);

        return {
          ...room,
          otherName: profile?.name ?? (isLawyer ? "의뢰인" : "변호사"),
          lastMessage: lastMsg?.content ?? "아직 메시지가 없습니다",
          unreadCount: unread ?? 0,
          lastAt: lastMsg?.created_at ?? room.created_at,
        };
      }),
    );

    setRooms(enriched);
    setRoomsLoading(false);
  }, [account]);

  useEffect(() => {
    if (loading) return;
    if (!account) { router.replace("/login?next=/chat/rooms"); return; }
    void load();
  }, [account, loading, load, router]);

  if (loading || !account) return <div className="min-h-screen bg-[#F4F5F7]" />;

  return (
    <main className="min-h-screen bg-[#F4F5F7] pb-24 page-enter">
      <header className="bg-white border-b border-[#E5E8EB] sticky top-0 z-20 pt-safe-top">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-[18px] font-bold text-[#191F28] tracking-tight">채팅</h1>
          <button onClick={load} className="w-9 h-9 rounded-lg hover:bg-[#F4F5F7] flex items-center justify-center text-[#8B95A1] transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        {roomsLoading ? (
          <div className="space-y-0">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-white border-b border-[#F2F4F6] px-4 py-4 flex gap-3 items-center animate-pulse">
                <div className="w-12 h-12 rounded-full bg-[#F4F5F7] shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#F4F5F7] rounded w-32" />
                  <div className="h-3 bg-[#F4F5F7] rounded w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-24 text-center px-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#EEF2FF] flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#4338CA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-[16px] font-bold text-[#191F28]">아직 채팅방이 없습니다</p>
            <p className="text-[13px] text-[#8B95A1] font-medium mt-1.5 leading-relaxed">
              {account.type === "user"
                ? "AI 상담 후 변호사 매칭을 완료하면 채팅방이 개설됩니다."
                : "의뢰인이 변호사를 선택하면 자동으로 채팅방이 개설됩니다."}
            </p>
            {account.type === "user" && (
              <Link href="/" className="mt-4 inline-block h-10 px-5 rounded-xl bg-[#4338CA] text-white text-[14px] font-semibold leading-10">
                AI 상담 시작하기
              </Link>
            )}
          </div>
        ) : (
          <div>
            {rooms.map((room) => (
              <Link
                key={room.id}
                href={`/chat/rooms/${room.id}`}
                className="bg-white border-b border-[#F2F4F6] px-4 py-4 flex gap-3 items-center hover:bg-[#F8F9FA] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4338CA] to-[#6366F1] flex items-center justify-center text-white text-[16px] font-bold shrink-0">
                  {room.otherName.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-bold text-[#191F28] truncate">
                      {room.otherName}
                      {account.type === "user" && " 변호사"}
                    </span>
                    <span className="text-[11px] text-[#8B95A1] font-medium shrink-0">{formatTime(room.lastAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[13px] text-[#8B95A1] truncate">{room.lastMessage}</p>
                    {room.unreadCount > 0 && (
                      <span className="shrink-0 w-5 h-5 rounded-full bg-[#4338CA] text-white text-[10px] font-bold flex items-center justify-center">
                        {room.unreadCount > 9 ? "9+" : room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
