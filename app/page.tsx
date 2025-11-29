'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { Trash2, LogOut, MessageCircle, Send } from 'lucide-react';
import * as db from '@/lib/supabase/database';
import * as auth from '@/lib/supabase/auth';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Task {
  id: number;
  user_id: string;
  text: string;
  completed: boolean;
}

interface Comment {
  id: number;
  task_id: number;
  user_id: string;
  user_name: string;
  content: string;
  created_at?: string;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<'todo' | 'done' | null>(null);
  const [loading, setLoading] = useState(true);

  // 認証フォーム用の状態
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // 認証状態の監視
  useEffect(() => {
    const subscription = auth.onAuthStateChange(async (user) => {
      if (user) {
        const profile = await db.getCurrentUserProfile();
        if (profile) {
          setCurrentUser(profile);
        }
      } else {
        setCurrentUser(null);
        setTasks([]);
        setComments([]);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // currentUserが変更されたら、そのユーザーのタスクとコメントを読み込む
  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  const loadUserData = async () => {
    setLoading(true);
    const [userTasks, userComments] = await Promise.all([
      db.getCurrentUserTasks(),
      db.getCurrentUserComments()
    ]);
    setTasks(userTasks);
    setComments(userComments);
    setLoading(false);
  };

  // サインアップ処理
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setAuthError('すべての項目を入力してください');
      return;
    }

    const { user, error } = await auth.signUp(email, password, name);

    if (error) {
      setAuthError(error.message || 'サインアップに失敗しました');
    } else if (user) {
      // サインアップ成功
      setName('');
      setEmail('');
      setPassword('');
    }
  };

  // サインイン処理
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!email.trim() || !password.trim()) {
      setAuthError('メールアドレスとパスワードを入力してください');
      return;
    }

    const { user, error } = await auth.signIn(email, password);

    if (error) {
      setAuthError('ログインに失敗しました。メールアドレスとパスワードを確認してください');
    } else if (user) {
      setEmail('');
      setPassword('');
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    await auth.signOut();
    setCurrentUser(null);
  };

  const handleAddTask = async () => {
    if (inputValue.trim() !== '') {
      const newTask = await db.createTask(inputValue.trim());
      if (newTask) {
        setTasks([newTask, ...tasks]);
        setInputValue('');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  const toggleTaskCompletion = useCallback(async (taskId: number, currentCompleted: boolean) => {
    const updatedTask = await db.toggleTaskCompletion(taskId, currentCompleted);
    if (updatedTask) {
      setTasks(prevTasks => prevTasks.map(task =>
        task.id === taskId ? updatedTask : task
      ));
    }
  }, []);

  const handleDeleteTask = useCallback(async (taskId: number) => {
    const success = await db.deleteTask(taskId);
    if (success) {
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      setComments(prevComments => prevComments.filter(comment => comment.task_id !== taskId));
    }
  }, []);

  // コメント追加処理
  const handleAddComment = useCallback(async (taskId: number, commentText: string) => {
    if (commentText.trim()) {
      const newComment = await db.createComment(taskId, commentText.trim());
      if (newComment) {
        setComments(prevComments => [...prevComments, newComment]);
        return true;
      }
    }
    return false;
  }, []);

  // 特定タスクのコメントを取得
  const getTaskComments = useCallback((taskId: number) => {
    return comments.filter(comment => comment.task_id === taskId);
  }, [comments]);

  // ドラッグ＆ドロップ関連の関数
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent, column: 'todo' | 'done') => {
    e.preventDefault();
    setDragOverColumn(column);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetCompleted: boolean) => {
    e.preventDefault();
    if (draggedTask && draggedTask.completed !== targetCompleted) {
      const updatedTask = await db.updateTask(draggedTask.id, { completed: targetCompleted });
      if (updatedTask) {
        setTasks(tasks.map(task =>
          task.id === draggedTask.id ? updatedTask : task
        ));
      }
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const todoTasks = tasks.filter(task => !task.completed);
  const doneTasks = tasks.filter(task => task.completed);

  // タスクカードのコンポーネント
  const TaskCard = memo(({ task }: { task: Task }) => {
    const [commentInput, setCommentInput] = useState('');
    const taskComments = getTaskComments(task.id);

    const onAddComment = async () => {
      if (await handleAddComment(task.id, commentInput)) {
        setCommentInput('');
      }
    };

    const onKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onAddComment();
      }
    };

    return (
      <div
        draggable
        onDragStart={() => handleDragStart(task)}
        className="bg-gradient-to-r from-white to-indigo-50 border-2 border-indigo-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-move group overflow-hidden"
      >
        {/* タスク本体 */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleTaskCompletion(task.id, task.completed)}
              className="w-5 h-5 mt-0.5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            />
            <span className={`flex-1 break-words ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
              {task.text}
            </span>
            <button
              onClick={() => handleDeleteTask(task.id)}
              className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all duration-150 opacity-0 group-hover:opacity-100"
              aria-label="タスクを削除"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* コメントセクション */}
        <div className="bg-gray-50 border-t border-gray-200 p-3">
          {/* コメント一覧 */}
          <div className="mb-3">
            <div className="flex items-center gap-1 text-sm font-semibold text-gray-600 mb-2">
              <MessageCircle size={16} />
              <span>コメント ({taskComments.length})</span>
            </div>
            {taskComments.length === 0 ? (
              <p className="text-xs text-gray-400 italic">コメントはありません</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {taskComments.map((comment) => (
                  <div key={comment.id} className="bg-white rounded p-2 text-sm">
                    <div className="font-semibold text-indigo-600 text-xs mb-1">
                      {comment.user_name}
                    </div>
                    <div className="text-gray-700">{comment.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* コメント入力欄 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyPress={onKeyPress}
              placeholder="コメントを追加..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={onAddComment}
              className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-200 flex items-center gap-1"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  });

  // 完了済みタスクカードのコンポーネント
  const DoneTaskCard = memo(({ task }: { task: Task }) => {
    const [commentInput, setCommentInput] = useState('');
    const taskComments = getTaskComments(task.id);

    const onAddComment = async () => {
      if (await handleAddComment(task.id, commentInput)) {
        setCommentInput('');
      }
    };

    const onKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onAddComment();
      }
    };

    return (
      <div
        draggable
        onDragStart={() => handleDragStart(task)}
        className="bg-gradient-to-r from-white to-green-50 border-2 border-green-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-move group overflow-hidden"
      >
        {/* タスク本体 */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleTaskCompletion(task.id, task.completed)}
              className="w-5 h-5 mt-0.5 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
            />
            <span className="flex-1 text-gray-500 line-through break-words">
              {task.text}
            </span>
            <button
              onClick={() => handleDeleteTask(task.id)}
              className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all duration-150 opacity-0 group-hover:opacity-100"
              aria-label="タスクを削除"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* コメントセクション */}
        <div className="bg-gray-50 border-t border-gray-200 p-3">
          {/* コメント一覧 */}
          <div className="mb-3">
            <div className="flex items-center gap-1 text-sm font-semibold text-gray-600 mb-2">
              <MessageCircle size={16} />
              <span>コメント ({taskComments.length})</span>
            </div>
            {taskComments.length === 0 ? (
              <p className="text-xs text-gray-400 italic">コメントはありません</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {taskComments.map((comment) => (
                  <div key={comment.id} className="bg-white rounded p-2 text-sm">
                    <div className="font-semibold text-green-600 text-xs mb-1">
                      {comment.user_name}
                    </div>
                    <div className="text-gray-700">{comment.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* コメント入力欄 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyPress={onKeyPress}
              placeholder="コメントを追加..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={onAddComment}
              className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center gap-1"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  });

  // ローディング画面
  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </main>
    );
  }

  // ログイン前の画面
  if (!currentUser) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                カンバンボード
              </h1>
              <p className="text-gray-600">タスク管理アプリ</p>
            </div>

            {!isSignUp ? (
              // ログインフォーム
              <form onSubmit={handleSignIn} className="space-y-6">
                {authError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {authError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="例: tanaka@example.com"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    パスワード
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  ログイン
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">または</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setAuthError('');
                  }}
                  className="w-full px-6 py-3 border-2 border-indigo-600 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-all duration-200"
                >
                  新規登録
                </button>
              </form>
            ) : (
              // 新規登録フォーム
              <form onSubmit={handleSignUp} className="space-y-6">
                {authError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {authError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    名前
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例: 田中太郎"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="例: tanaka@example.com"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    パスワード（6文字以上）
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  登録してログイン
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setName('');
                    setEmail('');
                    setPassword('');
                    setAuthError('');
                  }}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  キャンセル
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ログイン後の画面（カンバンボード）
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-6">
          <div className="flex justify-between items-center mb-4">
            <div></div>
            <h1 className="text-4xl font-bold text-gray-800">
              カンバンボード
            </h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <LogOut size={18} />
              ログアウト
            </button>
          </div>
          <p className="text-xl text-gray-700 font-semibold">
            ようこそ、{currentUser.name}さん
          </p>
        </div>

        {/* タスク追加エリア */}
        <div className="mb-8 bg-white rounded-xl shadow-md p-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="新しいタスクを入力..."
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <button
              onClick={handleAddTask}
              className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              追加
            </button>
          </div>
        </div>

        {/* カンバンボード */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 未完了カラム */}
          <div
            className={`bg-white rounded-xl shadow-lg transition-all duration-200 ${
              dragOverColumn === 'todo' ? 'ring-4 ring-indigo-400' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, 'todo')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, false)}
          >
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 py-4 rounded-t-xl">
              <h2 className="text-xl font-bold flex items-center justify-between">
                <span>📋 未完了</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  {todoTasks.length}
                </span>
              </h2>
            </div>
            <div className="p-4 min-h-[400px]">
              {todoTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg">タスクがありません</p>
                  <p className="text-sm mt-2">上のフォームから追加してください</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todoTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 完了済みカラム */}
          <div
            className={`bg-white rounded-xl shadow-lg transition-all duration-200 ${
              dragOverColumn === 'done' ? 'ring-4 ring-green-400' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, 'done')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, true)}
          >
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-t-xl">
              <h2 className="text-xl font-bold flex items-center justify-between">
                <span>✅ 完了済み</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  {doneTasks.length}
                </span>
              </h2>
            </div>
            <div className="p-4 min-h-[400px]">
              {doneTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg">完了したタスクがありません</p>
                  <p className="text-sm mt-2">タスクを完了してみましょう</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {doneTasks.map((task) => (
                    <DoneTaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
