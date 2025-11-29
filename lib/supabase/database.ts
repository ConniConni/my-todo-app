import { createClient } from './client';

export interface User {
  id: string;
  name: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  user_id: string;
  text: string;
  completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Comment {
  id: number;
  task_id: number;
  user_id: string;
  user_name: string;
  content: string;
  created_at?: string;
}

/**
 * 現在認証されているユーザーのIDを取得
 */
async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ============================================
// ユーザー操作
// ============================================

/**
 * 現在のユーザー情報を取得
 */
export async function getCurrentUserProfile(): Promise<User | null> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

/**
 * 現在のユーザー情報を更新
 */
export async function updateCurrentUserProfile(updates: Partial<User>): Promise<User | null> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error);
    return null;
  }

  return data;
}

// ============================================
// タスク操作
// ============================================

/**
 * 現在のユーザーの全タスクを取得
 */
export async function getCurrentUserTasks(): Promise<Task[]> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return data || [];
}

/**
 * 新しいタスクを作成
 */
export async function createTask(text: string): Promise<Task | null> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return null;
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert([{ user_id: userId, text, completed: false }])
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    return null;
  }

  return data;
}

/**
 * タスクを更新
 */
export async function updateTask(id: number, updates: Partial<Task>): Promise<Task | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    return null;
  }

  return data;
}

/**
 * タスクを削除
 */
export async function deleteTask(id: number): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }

  return true;
}

/**
 * タスクの完了状態を切り替え
 */
export async function toggleTaskCompletion(id: number, currentCompleted: boolean): Promise<Task | null> {
  return updateTask(id, { completed: !currentCompleted });
}

// ============================================
// コメント操作
// ============================================

/**
 * 現在のユーザーの全タスクのコメントを取得
 */
export async function getCurrentUserComments(): Promise<Comment[]> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    return [];
  }

  // まず現在のユーザーのタスクIDを取得
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', userId);

  if (tasksError || !tasks) {
    console.error('Error fetching tasks for comments:', tasksError);
    return [];
  }

  const taskIds = tasks.map(task => task.id);

  if (taskIds.length === 0) {
    return [];
  }

  // タスクIDに基づいてコメントを取得
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .in('task_id', taskIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return data || [];
}

/**
 * 新しいコメントを作成
 */
export async function createComment(
  taskId: number,
  content: string
): Promise<Comment | null> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    console.error('No authenticated user');
    return null;
  }

  // 現在のユーザー情報を取得
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) {
    console.error('User profile not found');
    return null;
  }

  const { data, error } = await supabase
    .from('comments')
    .insert([{
      task_id: taskId,
      user_id: userId,
      user_name: userProfile.name,
      content
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating comment:', error);
    return null;
  }

  return data;
}

/**
 * コメントを削除
 */
export async function deleteComment(id: number): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting comment:', error);
    return false;
  }

  return true;
}
