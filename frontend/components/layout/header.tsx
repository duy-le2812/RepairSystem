'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Phone, Clock, MapPin, ChevronDown, Wrench, User, LogOut } from 'lucide-react';
import AiSearchBar from './ai-search-bar';
import ApiClient from '../../lib/api/client';
import { useAuth } from '@/providers/auth-provider';
import { Branch } from '../../types';

export default function Header() {
  const pathname = usePathname();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const router = useRouter();
  const { user, isAuthenticated: isAuth, logout: contextLogout } = useAuth();

  const handleLogout = () => {
    contextLogout();
    setIsUserDropdownOpen(false);
  };

  // Load branches
  useEffect(() => {
    ApiClient.getBranches().then((data) => {
      setBranches(data);
      if (data.length > 0) {
        setSelectedBranch(data[0]); // default to first branch
      }
    });
  }, []);

  // Window scroll handler for blur effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigation Links
  const navLinks = [
    { label: 'Trang Chủ', href: '/' },
    { label: 'Danh Mục Dịch Vụ', href: '/services' },
    { label: 'Bảng Giá Dịch Vụ', href: '/price-list' },
    { label: 'Đặt Lịch Sửa Chữa', href: '/booking' },
    { label: 'Tra Cứu Tiến Độ', href: '/tracking' },
  ];

  return (
    <header className="w-full flex flex-col z-40 relative">
      {/* Top Utility Bar (Desktop only) */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 md:px-8 flex items-center justify-between border-b border-slate-800 no-print">
        <div className="flex items-center gap-6">
          {/* Branch selector */}
          <div className="relative">
            <button
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="flex items-center gap-1.5 hover:text-white transition cursor-pointer font-medium"
            >
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>{selectedBranch ? selectedBranch.name : 'Đang tải chi nhánh...'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isBranchDropdownOpen && branches.length > 0 && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsBranchDropdownOpen(false)}
                />
                <ul className="absolute top-full left-0 mt-1.5 bg-slate-850 border border-slate-850 rounded-lg shadow-xl py-1.5 w-64 z-50 animate-fade-in text-slate-300">
                  {branches.map((b) => (
                    <li key={b.id}>
                      <button
                        onClick={() => {
                          setSelectedBranch(b);
                          setIsBranchDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-slate-800 hover:text-white transition text-xs flex flex-col gap-0.5 ${
                          selectedBranch?.id === b.id ? 'text-primary font-semibold' : ''
                        }`}
                      >
                        <span>{b.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal truncate">{b.address}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Giờ làm việc: {selectedBranch ? selectedBranch.workingHours : '8:00 - 21:00'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href={`tel:${selectedBranch ? selectedBranch.hotline.replace(/\s/g, '') : '18002056'}`}
            className="flex items-center gap-1.5 font-bold text-accent hover:text-accent-hover transition"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Hotline miễn cước: {selectedBranch ? selectedBranch.hotline : '1800 2056'}</span>
          </a>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div
        className={`w-full sticky top-0 transition-all duration-300 py-3 px-4 md:px-8 border-b z-30 ${
          isScrolled
            ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200 dark:border-slate-800/80 shadow-sm'
            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-950'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo Brand */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 bg-primary hover:bg-primary-hover transition duration-300 rounded-xl flex items-center justify-center text-white shadow-md shadow-primary/20">
              <Wrench className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-foreground leading-none">
                Fix<span className="text-primary">Care</span>
              </span>
              <span className="text-[9px] font-medium uppercase tracking-widest text-muted mt-0.5 leading-none">
                Smart Repair
              </span>
            </div>
          </Link>

          {/* AI Search input (hidden on mobile, shown center on desktop) */}
          <div className="hidden md:flex flex-1 justify-center max-w-md">
            <AiSearchBar />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-bold uppercase tracking-wider transition ${
                    isActive
                      ? 'text-primary border-b-2 border-primary pb-1'
                      : 'text-foreground/80 hover:text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <Link
              href="/tracking"
              className="px-4 py-2 text-xs font-semibold text-primary hover:bg-primary-light/40 dark:hover:bg-primary-light/5 border border-primary/30 rounded-lg transition"
            >
              Tra Cứu Tiến Độ
            </Link>
            <Link
              href="/booking"
              className="px-4 py-2 text-xs font-bold text-white bg-accent hover:bg-accent-hover rounded-lg transition shadow-md shadow-accent/15"
            >
              Đặt Lịch Ngay
            </Link>
            
            {isAuth ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  <div className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xs">
                    {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden sm:inline max-w-[120px] truncate">
                    👤 {user?.full_name || user?.username}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                {isUserDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl py-2 w-52 z-50">
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          👤 {user?.full_name || user?.username}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase mt-0.5">{user?.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</p>
                      </div>
                      {(user?.role === 'admin' || user?.role === 'staff' || user?.role === 'receptionist') && (
                        <Link
                          href="/staff/handover"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="block px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          Bàn Giao & Thanh Toán
                        </Link>
                      )}
                      {(user?.role === 'admin' || user?.role === 'technician') && (
                        <Link
                          href="/technician/workboard"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="block px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          Technician Workboard
                        </Link>
                      )}
                      {user?.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="block px-4 py-2 text-xs font-bold text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          Quản trị hệ thống
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="block px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition font-medium"
                      >
                        Hồ sơ cá nhân
                      </Link>
                      <Link
                        href="/profile/history"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="block px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition font-medium"
                      >
                        Lịch sử sửa chữa
                      </Link>
                      <Link
                        href="/profile/change-password"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="block px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition font-medium"
                      >
                        Đổi mật khẩu
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition border-t border-slate-100 dark:border-slate-800 mt-1 pt-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Đăng xuất
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (

              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition shadow-md shadow-primary/20"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Actions: Burger Menu & Search Icon */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-foreground hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Search box */}
        <div className="md:hidden mt-3 px-1">
          <AiSearchBar />
        </div>
      </div>

      {/* Mobile Drawer Slide-in Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay background */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Menu Drawer */}
          <div className="fixed top-0 bottom-0 left-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl z-50 p-6 flex flex-col justify-between lg:hidden animate-slide-in-right [animation-direction:reverse]">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                    <Wrench className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-base font-bold text-foreground">
                    Fix<span className="text-primary">Care</span>
                  </span>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-muted hover:text-foreground rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Navigation Links */}
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`text-sm font-bold uppercase tracking-wider py-1.5 border-b border-transparent transition ${
                        isActive
                          ? 'text-primary border-primary'
                          : 'text-foreground/80 hover:text-primary'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <Link
                  href="/booking"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-center w-full py-2.5 text-xs font-bold text-white bg-accent hover:bg-accent-hover rounded-lg transition"
                >
                  Đặt Lịch Ngay
                </Link>
                <Link
                  href="/tracking"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-center w-full py-2.5 text-xs font-semibold text-primary hover:bg-primary-light/40 dark:hover:bg-primary-light/5 border border-primary/30 rounded-lg transition"
                >
                  Tra Cứu Tiến Độ
                </Link>
                {isAuth ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 px-2 py-1 mb-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{user?.full_name || user?.username}</p>
                        <p className="text-xs text-muted mt-0.5">{user?.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</p>
                      </div>
                    </div>
                    {user?.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-2 text-sm font-semibold text-primary hover:underline transition"
                      >
                        Quản trị hệ thống
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-2 text-sm text-slate-700 dark:text-slate-300 hover:text-primary transition"
                    >
                      Hồ sơ cá nhân
                    </Link>
                    <Link
                      href="/history"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-2 text-sm text-slate-700 dark:text-slate-300 hover:text-primary transition"
                    >
                      Lịch sử sửa chữa
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="mt-2 block text-center w-full py-2.5 text-xs font-bold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 rounded-lg transition"
                    >
                      Đăng xuất
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block text-center w-full py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block text-center w-full py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition shadow-md shadow-primary/20"
                    >
                      Đăng ký
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Footer Drawer details */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-6 text-xs text-muted space-y-3">
              {selectedBranch && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{selectedBranch.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>Giờ mở cửa: {selectedBranch ? selectedBranch.workingHours.split(' ')[0] : '8:00'} - {selectedBranch ? selectedBranch.workingHours.split(' ')[2] : '21:00'}</span>
              </div>
              <a
                href={`tel:${selectedBranch ? selectedBranch.hotline.replace(/\s/g, '') : '18002056'}`}
                className="flex items-center gap-2 text-accent font-bold mt-2 hover:underline"
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span>Gọi ngay: {selectedBranch ? selectedBranch.hotline : '1800 2056'}</span>
              </a>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
