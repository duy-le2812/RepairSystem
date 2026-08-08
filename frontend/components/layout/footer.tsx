'use client';

import React from 'react';
import Link from 'next/link';
import { Wrench, MapPin, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs mt-auto border-t border-slate-800 no-print">
      {/* Top Footer Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        
        {/* Info Column */}
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="text-base font-black text-white tracking-tight">
              Fix<span className="text-primary">Care</span>
            </span>
          </Link>
          <p className="text-slate-400 leading-relaxed">
            Hệ thống sửa chữa thiết bị công nghệ hàng đầu tại Việt Nam. Chúng tôi cam kết mang lại trải nghiệm sửa chữa trung thực, lấy ngay, bảo hành chu đáo nhất.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <a href="#" className="w-8 h-8 rounded-full bg-slate-800 hover:bg-primary hover:text-white flex items-center justify-center text-slate-400 transition" aria-label="Facebook">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M9 8H7v3h2v9h4v-9h3.6l.4-3H13V6c0-.5.5-1 1-1h3V2h-4c-2.5 0-5 1.5-5 5v1z" />
              </svg>
            </a>
            <a href="#" className="w-8 h-8 rounded-full bg-slate-800 hover:bg-primary hover:text-white flex items-center justify-center text-slate-400 transition" aria-label="Youtube">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.5 12 3.5 12 3.5s-7.518 0-9.388.553a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.553 9.388.553 9.388.553s7.518 0 9.388-.553a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
            {/* Zalo text icon representation */}
            <a href="#" className="w-8 h-8 rounded-full bg-slate-800 hover:bg-primary hover:text-white flex items-center justify-center font-bold text-[10px] text-slate-400 transition" aria-label="Zalo">
              ZA
            </a>
            {/* TikTok text icon representation */}
            <a href="#" className="w-8 h-8 rounded-full bg-slate-800 hover:bg-primary hover:text-white flex items-center justify-center font-bold text-[10px] text-slate-400 transition" aria-label="TikTok">
              TT
            </a>
          </div>
        </div>

        {/* Quick Sitemap Links */}
        <div>
          <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4 border-l-2 border-primary pl-2.5">
            Dịch Vụ Nổi Bật
          </h3>
          <ul className="space-y-2.5">
            <li>
              <Link href="/price-list?category=phone" className="hover:text-primary transition flex items-center gap-1.5">
                Sửa Chữa iPhone & Android
              </Link>
            </li>
            <li>
              <Link href="/price-list?category=laptop" className="hover:text-primary transition flex items-center gap-1.5">
                Sửa Chữa MacBook & Laptop
              </Link>
            </li>
            <li>
              <Link href="/price-list?category=tablet" className="hover:text-primary transition flex items-center gap-1.5">
                Sửa Chữa iPad & Máy Tính Bảng
              </Link>
            </li>
            <li>
              <Link href="/price-list?category=watch" className="hover:text-primary transition flex items-center gap-1.5">
                Sửa Chữa Apple Watch & Smartwatch
              </Link>
            </li>
            <li>
              <Link href="/booking" className="hover:text-primary transition flex items-center gap-1.5 font-semibold text-accent">
                Đặt Lịch Hẹn Trực Tuyến (Giảm 10%)
              </Link>
            </li>
          </ul>
        </div>

        {/* Branch listing column */}
        <div className="lg:col-span-2">
          <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4 border-l-2 border-primary pl-2.5">
            Hệ Thống Chi Nhánh
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-white font-bold text-xs flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Chi Nhánh Hà Nội:</span>
              </p>
              <p className="text-slate-400 leading-normal pl-4.5">
                302 Cầu Giấy, Dịch Vọng, Cầu Giấy, Hà Nội
              </p>
              <p className="pl-4.5 font-semibold text-slate-300">Hotline: 1800 2058</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-white font-bold text-xs flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Chi Nhánh Đà Nẵng:</span>
              </p>
              <p className="text-slate-400 leading-normal pl-4.5">
                97 Hàm Nghi, Vĩnh Trung, Hải Châu, Đà Nẵng
              </p>
              <p className="pl-4.5 font-semibold text-slate-300">Hotline: 1800 2059</p>
            </div>

            <div className="space-y-2">
              <p className="text-white font-bold text-xs flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Chi Nhánh HCM Q10:</span>
              </p>
              <p className="text-slate-400 leading-normal pl-4.5">
                147 Ba Tháng Hai, Phường 11, Quận 10, TP.HCM
              </p>
              <p className="pl-4.5 font-semibold text-slate-300">Hotline: 1800 2056</p>
            </div>

            <div className="space-y-2">
              <p className="text-white font-bold text-xs flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Chi Nhánh HCM Q1:</span>
              </p>
              <p className="text-slate-400 leading-normal pl-4.5">
                26 Trần Quang Khải, Tân Định, Quận 1, TP.HCM
              </p>
              <p className="pl-4.5 font-semibold text-slate-300">Hotline: 1800 2057</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="bg-slate-950 border-t border-slate-900 py-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1.5">
            <p className="text-slate-500 text-[10px] leading-relaxed">
              &copy; {currentYear} FixCare. Bản quyền thuộc về Công ty TNHH Sửa Chữa Công Nghệ FixCare Việt Nam.
            </p>
            <p className="text-slate-500 text-[10px]">
              Giấy chứng nhận đăng ký kinh doanh số 010839958 do Sở KH&ĐT Hà Nội cấp ngày 15/07/2018.
            </p>
          </div>
          
          <div className="flex items-center gap-4 shrink-0">
            {/* Ministry of Industry and Trade seal mockup */}
            <div className="border border-slate-800 rounded px-2 py-1 flex items-center gap-1 bg-slate-900 text-slate-500 text-[9px] font-bold select-none">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>ĐÃ ĐĂNG KÝ BỘ CÔNG THƯƠNG</span>
            </div>
            
            <p className="text-slate-650 text-[10px] flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> by FixCare Team
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
