'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Home, BookOpen, MessageSquare } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center space-y-6 min-h-[60vh] flex flex-col justify-center items-center">
      <div className="w-16 h-16 bg-accent-light/50 dark:bg-accent-light/10 text-accent rounded-full flex items-center justify-center border-2 border-accent/20 animate-bounce">
        <ShieldAlert className="w-10 h-10 stroke-[2.5]" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-black text-foreground">404 - Trang Không Tìm Thấy</h1>
        <p className="text-muted text-xs leading-relaxed max-w-sm mx-auto">
          Xin lỗi, trang bạn đang cố gắng truy cập không tồn tại hoặc đã bị thay đổi địa chỉ. Vui lòng sử dụng các đường dẫn nhanh bên dưới để tiếp tục.
        </p>
      </div>

      {/* Action buttons row */}
      <div className="flex flex-col gap-2.5 w-full max-w-xs pt-4 border-t border-slate-100 dark:border-slate-800">
        <Link
          href="/"
          className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          <Home className="w-4 h-4" />
          <span>Về trang chủ</span>
        </Link>
        <Link
          href="/price-list"
          className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-primary" />
          <span>Xem bảng giá sửa chữa</span>
        </Link>
      </div>

      <div className="pt-2 text-[10px] text-muted flex items-center justify-center gap-1.5 select-none">
        <MessageSquare className="w-3.5 h-3.5 text-accent" />
        <span>Cần hỗ trợ? Chat trực tiếp với AI Trợ lý ở góc dưới màn hình.</span>
      </div>
    </div>
  );
}
