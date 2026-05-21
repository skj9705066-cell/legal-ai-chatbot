import { supabase } from "./supabase";

export interface AdminSession {
  userId: string;
  email: string;
  name: string;
}

/** Returns the current admin session, or null if no admin is signed in. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, email, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") return null;

  return {
    userId: user.id,
    email: profile.email ?? user.email ?? "",
    name: profile.name ?? "",
  };
}

/** Email + password sign-in, then verify the profile has role='admin'. */
export async function signInAdmin(
  email: string,
  password: string,
): Promise<AdminSession> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    if (/Invalid login credentials/i.test(error.message)) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    throw new Error(error.message);
  }
  const session = await getAdminSession();
  if (!session) {
    // Signed in but profile is not admin — back out.
    await supabase.auth.signOut();
    throw new Error("관리자 권한이 없는 계정입니다.");
  }
  return session;
}

export async function signOutAdmin(): Promise<void> {
  await supabase.auth.signOut();
}
