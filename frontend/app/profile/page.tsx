'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/protected-route';
import { useAuth } from '@/providers/auth-provider';
import { updateUserProfile, fetchCurrentUser } from '@/lib/api/auth';
import { User, Mail, Phone, Shield, Save, CheckCircle, AlertCircle, Key, History } from 'lucide-react';
import Link from 'next/link';

function ProfileContent() {
  const { user, refreshUser, updateUser } = useAuth();
  const [userId, setUserId] = useState<number | string>('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchCurrentUser().then(userData => {
      if (userData) {
        setUserId(userData.user_id || (userData as any).id || '');
        setUsername(userData.username || '');
        setRole(userData.role || 'customer');
        setFullName(userData.full_name || '');
        setPhone(userData.phone || '');
        setEmail(userData.email || '');
        if (userData.created_at) {
          setCreatedAt(new Date(userData.created_at).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }));
        } else {
          setCreatedAt('Chưa cập nhật');
        }
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // 1. Validate full_name
    const nameTrimmed = fullName.trim();
    if (!nameTrimmed) {
      setMessage({ type: 'error', text: 'Họ và tên không được để trống!' });
      return;
    }
    if (nameTrimmed.length > 100) {
      setMessage({ type: 'error', text: 'Họ và tên không được vượt quá 100 ký tự!' });
      return;
    }

    // 2. Validate email
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setMessage({ type: 'error', text: 'Địa chỉ Email không đúng định dạng!' });
        return;
      }
    }

    // 3. Validate phone
    if (phone && phone.trim()) {
      const cleanPhone = phone.trim().replace(/[\s-]/g, '');
      const phoneRegex = /^\d{10,11}$/;
      if (!phoneRegex.test(cleanPhone)) {
        setMessage({ type: 'error', text: 'Số điện thoại phải chỉ chứa chữ số và gồm 10 - 11 chữ số!' });
        return;
      }
    }

    setLoading(true);

    try {
      const updated = await updateUserProfile({
        full_name: nameTrimmed,
        email: email ? email.trim() : undefined,
        phone: phone ? phone.trim() : undefined,
      });
      
      // Update Context state immediately so Navbar updates immediately
      updateUser({
        full_name: updated.full_name,
        email: updated.email,
        phone: updated.phone,
      });

      setMessage({ type: 'success', text: 'Cập nhật thông tin hồ sơ thành công! Tên hiển thị trên Thanh điều hướng đã được cập nhật.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Cập nhật thất bại. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 min-h-screen">
      {/* Title */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-foreground">
          Hồ Sơ Cá Nhân
        </h1>
        <p className="text-xs md:text-sm text-muted mt-1">
          Xem và cập nhật thông tin tài khoản cá nhân của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-4 py-3 bg-primary text-white rounded-2xl text-xs font-bold shadow-md shadow-primary/20"
          >
            <User className="w-4 h-4" />
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
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground rounded-2xl text-xs font-bold transition"
          >
            <Key className="w-4 h-4 text-primary" />
            <span>Đổi mật khẩu</span>
          </Link>
        </div>

        {/* Profile Card */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-850 pb-5">
            <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-primary/20 shrink-0">
              {fullName?.charAt(0) || user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-black text-foreground">
                {user?.full_name || fullName || user?.username}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase">
                  {role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
                </span>
                <span className="text-[10px] text-muted font-medium">
                  ID: #{userId}
                </span>
              </div>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Readonly Info Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase mb-1">Mã ID tài khoản</label>
                <input
                  type="text"
                  disabled
                  value={`#${userId}`}
                  className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted uppercase mb-1">Tên đăng nhập (Username)</label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={username || user?.username || ''}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed"
                  />
                  <Shield className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase mb-1">Vai trò hệ thống</label>
                <input
                  type="text"
                  disabled
                  value={role === 'admin' ? 'Quản trị viên (Admin)' : 'Khách hàng (Customer)'}
                  className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted uppercase mb-1">Ngày tạo tài khoản</label>
                <input
                  type="text"
                  disabled
                  value={createdAt || 'Đang cập nhật'}
                  className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-850 my-2" />

            {/* Editable Fields */}
            <div>
              <label className="block text-xs font-bold text-foreground uppercase mb-1">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên (Tối đa 100 ký tự)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-foreground font-medium focus:ring-2 focus:ring-primary outline-none"
                />
                <User className="w-4 h-4 text-muted absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground uppercase mb-1">
                Địa chỉ Email <span className="text-muted font-normal">(Ví dụ: user@gmail.com)</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-foreground font-medium focus:ring-2 focus:ring-primary outline-none"
                />
                <Mail className="w-4 h-4 text-muted absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground uppercase mb-1">
                Số điện thoại <span className="text-muted font-normal">(Chỉ gồm 10 - 11 chữ số)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-foreground font-medium focus:ring-2 focus:ring-primary outline-none"
                />
                <Phone className="w-4 h-4 text-muted absolute left-3 top-3" />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-hover active:scale-95 text-white font-bold text-xs rounded-xl transition shadow-md shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Đang lưu...' : 'Lưu Thay Đổi Thông Tin'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

