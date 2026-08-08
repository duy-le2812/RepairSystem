'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Phone, CalendarRange, MessageSquareCode } from 'lucide-react';

export default function MobileBottomBar() {
  const router = useRouter();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800/80 p-2 z-40 flex items-center justify-around gap-2 lg:hidden no-print shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      
      {/* Action 1: Call Hotline */}
      <a
        href="tel:18002056"
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl text-slate-700 dark:text-slate-200 active:bg-slate-100 dark:active:bg-slate-800 transition text-[10px] font-bold"
      >
        <div className="p-1.5 bg-primary-light dark:bg-primary-light/10 text-primary rounded-lg">
          <Phone className="w-4 h-4 stroke-[2.5]" />
        </div>
        <span>Gọi Hotline</span>
      </a>

      {/* Action 2: Chat Zalo */}
      <a
        href="https://zalo.me"
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl text-slate-700 dark:text-slate-200 active:bg-slate-100 dark:active:bg-slate-800 transition text-[10px] font-bold"
      >
        <div className="p-1.5 bg-success/10 text-success rounded-lg">
          <MessageSquareCode className="w-4 h-4 stroke-[2.5]" />
        </div>
        <span>Chat Zalo OA</span>
      </a>

      {/* Action 3: Book Appointment (Accent Highlight) */}
      <button
        onClick={() => router.push('/booking')}
        className="flex-[1.5] flex items-center justify-center gap-2 py-2 px-4 bg-accent hover:bg-accent-hover active:scale-[0.98] transition rounded-xl text-white text-xs font-black shadow-lg shadow-accent/20"
      >
        <CalendarRange className="w-4 h-4 stroke-[2.5]" />
        <span>Đặt Lịch Ngay</span>
      </button>

    </div>
  );
}
