'use client';

import { useState, useEffect } from 'react';
import { Trash2, LogOut, UserPlus } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Task {
  id: number;
  text: string;
  completed: boolean;
  userId: string;
}

// デフォルトユーザー
const DEFAULT_USERS: User[] = [
  { id: '1', name: '田中太郎', email: 'tanaka@example.com' },
  { id: '2', name: '佐藤花子', email: 'sato@example.com' },
  { id: '3', name: '山田次郎', email: 'yamada@example.com' },
];

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [nextId, setNextId] = useState(1);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<'todo' | 'done' | null>(null);

  // 新規登録フォーム用の状態
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  // ローカルストレージからデータを読み込む
  useEffect(() => {
    const savedUsers = localStorage.getItem('users');
    const savedTasks = localStorage.getItem('tasks');
    const savedCurrentUser = localStorage.getItem('currentUser');
    const savedNextId = localStorage.getItem('nextId');

    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    }

    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }

    if (savedCurrentUser) {
      setCurrentUser(JSON.parse(savedCurrentUser));
    }

    if (savedNextId) {
      setNextId(parseInt(savedNextId));
    }
  }, []);

  // データの変更をローカルストレージに保存
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('users', JSON.stringify(users));
    }
  }, [users]);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('nextId', nextId.toString());
  }, [nextId]);

  // ログイン処理
  const handleLogin = () => {
    const user = users.find(u => u.id === selectedUserId);
    if (user) {
      setCurrentUser(user);
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedUserId('');
  };

  // 新規登録処理
  const handleRegister = () => {
    if (registerName.trim() && registerEmail.trim()) {
      const newUser: User = {
        id: Date.now().toString(),
        name: registerName.trim(),
        email: registerEmail.trim(),
      };
      setUsers([...users, newUser]);
      setCurrentUser(newUser);
      setRegisterName('');
      setRegisterEmail('');
      setShowRegisterForm(false);
    }
  };

  const handleAddTask = () => {
    if (inputValue.trim() !== '' && currentUser) {
      setTasks([...tasks, {
        id: nextId,
        text: inputValue.trim(),
        completed: false,
        userId: currentUser.id
      }]);
      setNextId(nextId + 1);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  const toggleTaskCompletion = (taskId: number) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleDeleteTask = (taskId: number) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

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

  const handleDrop = (e: React.DragEvent, targetCompleted: boolean) => {
    e.preventDefault();
    if (draggedTask && draggedTask.completed !== targetCompleted) {
      setTasks(tasks.map(task =>
        task.id === draggedTask.id ? { ...task, completed: targetCompleted } : task
      ));
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  // 現在のユーザーのタスクのみフィルター
  const userTasks = currentUser ? tasks.filter(task => task.userId === currentUser.id) : [];
  const todoTasks = userTasks.filter(task => !task.completed);
  const doneTasks = userTasks.filter(task => task.completed);

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

            {!showRegisterForm ? (
              // ログインフォーム
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ユーザーを選択
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">ユーザーを選択してください</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={!selectedUserId}
                  className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
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
                  onClick={() => setShowRegisterForm(true)}
                  className="w-full px-6 py-3 border-2 border-indigo-600 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <UserPlus size={20} />
                  新規登録
                </button>
              </div>
            ) : (
              // 新規登録フォーム
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    名前
                  </label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
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
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="例: tanaka@example.com"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleRegister}
                  disabled={!registerName.trim() || !registerEmail.trim()}
                  className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  登録してログイン
                </button>

                <button
                  onClick={() => {
                    setShowRegisterForm(false);
                    setRegisterName('');
                    setRegisterEmail('');
                  }}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  キャンセル
                </button>
              </div>
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
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      className="bg-gradient-to-r from-white to-indigo-50 border-2 border-indigo-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-move group"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTaskCompletion(task.id)}
                          className="w-5 h-5 mt-0.5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="flex-1 text-gray-800 break-words">
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
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      className="bg-gradient-to-r from-white to-green-50 border-2 border-green-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-move group"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleTaskCompletion(task.id)}
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
