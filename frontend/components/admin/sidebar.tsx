'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket, Wrench, MapPin, Users, Settings, WrenchIcon } from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/tickets', label: 'Phiếu sửa chữa', icon: Ticket },
  { href: '/admin/services', label: 'Dịch vụ', icon: Wrench },
  { href: '/admin/branches', label: 'Chi nhánh', icon: MapPin },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col shrink-0 sticky top-0 hidden lg:flex">
      <div className="p-6 flex items-center gap-3 bg-slate-950 border-b border-slate-800">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
          <WrenchIcon className="w-4 h-4" />
        </div>
        <span className="text-lg font-bold text-white tracking-wide">FixCare Admin</span>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Quản lý</p>
        
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/admin');
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition group ${
                isActive 
                  ? 'bg-primary text-white font-medium shadow-md shadow-primary/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 transition ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Link 
          href="/"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          &larr; Về trang khách
        </Link>
      </div>
    </aside>
  );
}
