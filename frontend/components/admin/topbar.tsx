'use client';

import { useAuth } from '@/providers/auth-provider';
import { User, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

export default function Topbar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 text-slate-500 hover:text-primary transition">
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-slate-800 dark:text-white hidden sm:block">Control Panel</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-1.5 pr-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white">
              <User className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {user?.username || 'Admin'}
            </span>
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 py-2">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 mb-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{user?.full_name}</p>
                  <p className="text-xs text-primary mt-0.5">Administrator</p>
                </div>
                <button
                  onClick={logout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
