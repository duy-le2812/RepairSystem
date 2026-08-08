'use client';

import React, { useState } from 'react';
import ProtectedRoute from '@/components/auth/protected-route';
import { useAuth } from '@/providers/auth-provider';
import { changePassword } from '@/lib/api/auth';

import { User, History, Key, Lock, CheckCircle, AlertCircle, Save } from 'lucide-react';
import Link from 'next/link';

function ChangePasswordContent() {
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự!' });
      return;
    }

    if (newPassword === currentPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu mới không được trùng với mật khẩu hiện tại!' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu mới và Nhập lại mật khẩu không khớp!' });
      return;
    }

    setLoading(true);

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công! Hệ thống sẽ đăng xuất và chuyển về trang đăng nhập...' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 min-h-screen">
      {/* Title */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-foreground">
          Đổi Mật Khẩu
        </h1>
        <p className="text-xs md:text-sm text-muted mt-1">
          Cập nhật mật khẩu để bảo vệ an toàn cho tài khoản cá nhân.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground rounded-2xl text-xs font-bold transition"
          >
            <User className="w-4 h-4 text-primary" />
            <span>Thông tin cá nhân</span>
          </Link>
          <Link
            href="/profile/history"
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground rounded-2xl text-xs font-bold transition"
          >
            <History className="w-4 h-4 text-primary" />
            <span>Lịch sử sửa chữa</span>
          </Link>
          <Link
            href="/profile/change-password"
            className="flex items-center gap-3 px-4 py-3 bg-primary text-white rounded-2xl text-xs font-bold shadow-md shadow-primary/20"
          >
            <Key className="w-4 h-4" />
            <span>Đổi mật khẩu</span>
          </Link>
        </div>

        {/* Change Password Card */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
          <h2 className="text-base font-black text-foreground border-b border-slate-100 dark:border-slate-850 pb-4">
            Thiết Lập Mật Khẩu Mới
          </h2>

          {message && (
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Mật khẩu hiện tại</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-foreground font-medium focus:ring-2 focus:ring-primary outline-none"
                />
                <Lock className="w-4 h-4 text-muted absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Mật khẩu mới (Tối thiểu 6 ký tự)</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-foreground font-medium focus:ring-2 focus:ring-primary outline-none"
                />
                <Key className="w-4 h-4 text-muted absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Nhập lại mật khẩu mới</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-foreground font-medium focus:ring-2 focus:ring-primary outline-none"
                />
                <Key className="w-4 h-4 text-muted absolute left-3 top-3" />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-hover active:scale-95 text-white font-bold text-xs rounded-xl transition shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <ProtectedRoute>
      <ChangePasswordContent />
    </ProtectedRoute>
  );
}
