"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import type {
  LawyerRow,
  ProfileRow,
} from "@/lib/supabase-types";
import type {
  Account,
  ConsultationMethod,
  LawyerAccount,
  LawyerExperienceBucket,
  LawyerSpecialty,
  UserAccount,
} from "@/lib/types";

export interface EmailSignUpInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface EmailSignInInput {
  email: string;
  password: string;
}

export interface LawyerRegistrationInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  barNumber: string;
  firm: string;
  specialties: LawyerSpecialty[];
  experienceBucket: LawyerExperienceBucket;
  avatar?: string;
  oneLiner: string;
  bio: string;
  consultationMethods: ConsultationMethod[];
  baseFeeManwon: number;
}

interface AuthContextValue {
  account: Account | null;
  loading: boolean;
  signUpEmail: (input: EmailSignUpInput) => Promise<UserAccount>;
  signInEmail: (input: EmailSignInInput) => Promise<UserAccount | LawyerAccount>;
  signInWithKakao: (next?: string) => Promise<void>;
  signInWithGoogle: (next?: string) => Promise<void>;
  registerLawyer: (input: LawyerRegistrationInput) => Promise<LawyerAccount>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}

function bucketFromYears(years: number): LawyerExperienceBucket {
  if (years < 5) return "5년 미만";
  if (years < 10) return "5~10년";
  if (years < 20) return "10~20년";
  return "20년 이상";
}

function yearsFromBucket(bucket: LawyerExperienceBucket): number {
  switch (bucket) {
    case "5년 미만":
      return 3;
    case "5~10년":
      return 7;
    case "10~20년":
      return 15;
    case "20년 이상":
      return 22;
    default:
      return 5;
  }
}

function mapUserAccount(profile: ProfileRow): UserAccount {
  return {
    id: profile.id,
    type: "user",
    name: profile.name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? undefined,
    provider: "email",
    createdAt: new Date(profile.created_at).getTime(),
  };
}

function mapLawyerAccount(
  profile: ProfileRow,
  lawyer: LawyerRow | null,
): LawyerAccount {
  return {
    id: profile.id,
    type: "lawyer",
    name: profile.name ?? lawyer?.name ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    provider: "email",
    barNumber: lawyer?.bar_number ?? "",
    firm: lawyer?.firm ?? "",
    specialties: (lawyer?.specialty ?? []) as LawyerSpecialty[],
    experienceBucket: bucketFromYears(lawyer?.experience_years ?? 0),
    oneLiner: "",
    bio: lawyer?.bio ?? "",
    consultationMethods: [],
    baseFeeManwon: 0,
    approvalStatus:
      lawyer?.status === "approved"
        ? "approved"
        : lawyer?.status === "rejected"
          ? "rejected"
          : "pending",
    createdAt: new Date(profile.created_at).getTime(),
  };
}

async function loadAccount(userId: string): Promise<Account | null> {
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr) {
    console.warn("[auth] profile fetch error", profileErr.message);
    return null;
  }
  if (!profile) return null;

  if (profile.role === "lawyer") {
    const { data: lawyer } = await supabase
      .from("lawyers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return mapLawyerAccount(profile, lawyer);
  }
  return mapUserAccount(profile);
}

function getOAuthRedirectTo(next?: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "");
  // OAuth는 외부 공급자를 왕복하므로 돌아올 위치를 콜백 URL에 실어 보내야 한다.
  // (app/auth/callback/route.ts가 이 next를 읽어 최종 이동지로 쓴다)
  const suffix = next ? `?next=${encodeURIComponent(next)}` : "";
  return `${base}/auth/callback${suffix}`;
}

function describeAuthError(message: string): string {
  if (/Invalid login credentials/i.test(message))
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (/User already registered/i.test(message))
    return "이미 가입된 이메일입니다.";
  if (/Password should be at least/i.test(message))
    return "비밀번호는 최소 6자 이상이어야 합니다.";
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const acc = await loadAccount(data.session.user.id);
      setAccount(acc);
    } else {
      setAccount(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    refresh().finally(() => {
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: { user?: { id: string } } | null) => {
      if (session?.user) {
        loadAccount(session.user.id).then((a) => {
          if (mounted) setAccount(a);
        });
      } else {
        if (mounted) setAccount(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refresh]);

  const signUpEmail = useCallback(
    async (input: EmailSignUpInput): Promise<UserAccount> => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: { name: input.name.trim() },
        },
      });
      if (error) throw new Error(describeAuthError(error.message));
      const user = data.user;
      if (!user) throw new Error("회원가입에 실패했습니다.");

      const { error: profileErr } = await supabase.from("profiles").insert({
        id: user.id,
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || null,
        role: "user",
      });
      if (profileErr && !/duplicate key/i.test(profileErr.message)) {
        console.warn("[auth] profile insert error", profileErr.message);
      }

      const acc = await loadAccount(user.id);
      if (!acc || acc.type !== "user") {
        throw new Error("프로필 조회에 실패했습니다.");
      }
      setAccount(acc);
      return acc;
    },
    [],
  );

  const signInEmail = useCallback(
    async (input: EmailSignInInput): Promise<UserAccount | LawyerAccount> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email.trim(),
        password: input.password,
      });
      if (error) throw new Error(describeAuthError(error.message));
      if (!data.user) throw new Error("로그인에 실패했습니다.");

      const acc = await loadAccount(data.user.id);
      if (!acc) {
        throw new Error(
          "프로필을 찾을 수 없습니다. 회원가입을 먼저 진행해주세요.",
        );
      }
      setAccount(acc);
      return acc;
    },
    [],
  );

  const signInWithKakao = useCallback(async (next?: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: getOAuthRedirectTo(next) },
    });
    if (error) throw new Error(error.message);
  }, []);

  const signInWithGoogle = useCallback(async (next?: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getOAuthRedirectTo(next) },
    });
    if (error) throw new Error(error.message);
  }, []);

  const registerLawyer = useCallback(
    async (input: LawyerRegistrationInput): Promise<LawyerAccount> => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          data: { name: input.name.trim(), role: "lawyer" },
        },
      });
      if (error) throw new Error(describeAuthError(error.message));
      const user = data.user;
      if (!user) throw new Error("회원가입에 실패했습니다.");

      const { error: profileErr } = await supabase.from("profiles").insert({
        id: user.id,
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone.trim(),
        role: "lawyer",
      });
      if (profileErr && !/duplicate key/i.test(profileErr.message)) {
        console.warn("[auth] profile insert error", profileErr.message);
      }

      const { error: lawyerErr } = await supabase.from("lawyers").insert({
        user_id: user.id,
        name: input.name.trim(),
        firm: input.firm.trim() || null,
        specialty: input.specialties,
        experience_years: yearsFromBucket(input.experienceBucket),
        bar_number: input.barNumber.trim() || null,
        bio: input.bio.trim() || input.oneLiner.trim() || null,
        status: "pending",
      });
      if (lawyerErr) {
        console.warn("[auth] lawyer insert error", lawyerErr.message);
      }

      const acc = await loadAccount(user.id);
      if (!acc || acc.type !== "lawyer") {
        throw new Error("변호사 프로필 조회에 실패했습니다.");
      }
      setAccount(acc);
      return acc;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAccount(null);
  }, []);

  const value: AuthContextValue = {
    account,
    loading,
    signUpEmail,
    signInEmail,
    signInWithKakao,
    signInWithGoogle,
    registerLawyer,
    signOut,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
