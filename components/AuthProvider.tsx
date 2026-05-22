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
  signInWithKakao: () => Promise<UserAccount>;
  signInWithGoogle: () => Promise<UserAccount>;
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

  const signInWithKakao = useCallback(async (): Promise<UserAccount> => {
    const Kakao = (window as Window & { Kakao?: KakaoSDK }).Kakao;
    if (!Kakao) {
      throw new Error("카카오 SDK가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
    }
    if (!Kakao.isInitialized()) {
      Kakao.init(process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID!);
    }
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    Kakao.Auth.authorize({
      redirectUri: `${base}/auth/kakao/callback`,
      scope: "profile_nickname,account_email",
    });
    return new Promise<UserAccount>(() => {}); // 페이지 이동 후 절대 resolve되지 않음
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<UserAccount> => {
    throw new Error("Google 로그인은 준비 중입니다. 이메일로 로그인해주세요.");
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
