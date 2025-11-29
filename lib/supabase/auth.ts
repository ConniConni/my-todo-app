import { createClient } from './client';

/**
 * サインアップ（新規登録）
 */
export async function signUp(email: string, password: string, name: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name, // メタデータとして名前を保存
      },
    },
  });

  if (error) {
    console.error('Error signing up:', error);
    return { user: null, error };
  }

  return { user: data.user, error: null };
}

/**
 * サインイン（ログイン）
 */
export async function signIn(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Error signing in:', error);
    return { user: null, error };
  }

  return { user: data.user, error: null };
}

/**
 * サインアウト（ログアウト）
 */
export async function signOut() {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    return { error };
  }

  return { error: null };
}

/**
 * 現在のユーザーを取得
 */
export async function getCurrentUser() {
  const supabase = createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }

  return user;
}

/**
 * 認証状態の変更を監視
 */
export function onAuthStateChange(callback: (user: any) => void) {
  const supabase = createClient();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return subscription;
}
