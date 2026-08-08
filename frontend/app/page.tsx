'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Smartphone, Laptop, Tablet, Monitor, Wrench, ChevronRight, CheckCircle2, 
  ShieldCheck, Zap, Award, Search, Clock, MapPin, Calendar, ArrowRight, Star
} from 'lucide-react';
import ApiClient from '../lib/api/client';
import { ServiceItem } from '../types';
import { formatPrice } from '../lib/format';

export default function HomePage() {
  const router = useRouter();
  const [popularServices, setPopularServices] = useState<ServiceItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [trackingCode, setTrackingCode] = useState<string>('');

  useEffect(() => {
    ApiClient.getServices().then((data) => {
      setPopularServices(data.filter(s => s.popular));
    }).catch(err => console.error(err));
  }, []);

  const handleTrackingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingCode.trim()) {
      router.push(`/tracking?code=${encodeURIComponent(trackingCode.trim())}`);
    }
  };

  const deviceCategories = [
    { id: 'phone', label: 'Điện Thoại', icon: Smartphone, desc: 'iPhone, Samsung, OPPO, Xiaomi...' },
    { id: 'laptop', label: 'MacBook & Laptop', icon: Laptop, desc: 'MacBook, Dell, HP, Asus, ThinkPad...' },
    { id: 'tablet', label: 'iPad & Tablet', icon: Tablet, desc: 'iPad, Samsung Galaxy Tab...' },
    { id: 'pc', label: 'PC & Màn Hình', icon: Monitor, desc: 'Máy tính để bàn, Màn hình đồ họa...' },
  ];

  const repairSteps = [
    { step: '01', title: 'Đặt Lịch Hẹn', desc: 'Chọn thiết bị, dịch vụ & khung giờ hẹn online' },
    { step: '02', title: 'Kiểm Tra Máy', desc: 'Kỹ thuật viên tiếp nhận & kiểm tra miễn phí' },
    { step: '03', title: 'Báo Giá Minh Bạch', desc: 'Lập báo giá linh kiện & công sửa công khai' },
    { step: '04', title: 'Khách Duyệt Báo Giá', desc: 'Chỉ tiến hành khi khách hàng đồng ý phương án' },
    { step: '05', title: 'Tiến Hành Sửa Chữa', desc: 'Sửa xem trực tiếp, thay linh kiện chính hãng' },
    { step: '06', title: 'Kiểm Tra QC', desc: 'Chuyên viên kiểm định 100% chức năng sau sửa' },
    { step: '07', title: 'Thanh Toán & Bàn Giao', desc: 'Xuất hóa đơn, tem bảo hành & giao máy tận tay' },
  ];

  const trustUSPs = [
    { icon: ShieldCheck, title: 'Báo Giá Minh Bạch', desc: 'Giá công khai đã bao gồm công thợ & linh kiện, không chi phí ẩn' },
    { icon: Zap, title: 'Theo Dõi Online 24/7', desc: 'Tra cứu tiến độ sửa chữa bằng mã phiếu mọi lúc mọi nơi' },
    { icon: CheckCircle2, title: 'Linh Kiện Chuẩn ZIN', desc: 'Cam kết linh kiện chính hãng rõ nguồn gốc, bảo hành đến 12 tháng' },
    { icon: Award, title: 'Kỹ Thuật Viên Chuyên Môn', desc: 'Đội ngũ hơn 8 năm kinh nghiệm sửa chữa phần cứng phức tạp' },
    { icon: Clock, title: 'Sửa Lấy Ngay', desc: 'Thời gian thay màn hình, thay pin chỉ từ 30 - 60 phút' },
    { icon: Wrench, title: 'Ký Tên Linh Kiện', desc: 'Khách hàng ký tên trực tiếp lên main, pin, màn hình trước khi sửa' },
  ];

  const filteredServices = activeCategory === 'all' 
    ? popularServices 
    : popularServices.filter(s => s.category === activeCategory);

  return (
    <div className="w-full flex flex-col min-h-screen">
      
      {/* 1. HERO SECTION (FASTCARE-Style Commercial Hero) */}
      <section className="relative bg-slate-900 text-white overflow-hidden py-14 lg:py-20">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-extrabold text-emerald-400 select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Hệ Thống Sửa Chữa Chuyên Nghiệp Hàng Đầu</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Sửa Chữa Thiết Bị Điện Tử <br className="hidden sm:block"/>
              <span className="text-primary">Nhanh Chóng — Minh Bạch — Uy Tín</span>
            </h1>
            
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
              Chuyên thay màn hình, ép kính, thay pin điện thoại, laptop & tablet. Kiểm tra máy miễn phí, báo giá minh bạch trước khi sửa, bảo hành điện tử chính hãng lên đến 12 tháng.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <Link
                href="/booking"
                className="w-full sm:w-auto px-7 py-3.5 bg-primary hover:bg-primary-hover text-white text-sm font-extrabold rounded-2xl transition duration-300 shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Đặt Lịch Ngay (Giảm 10%)</span>
              </Link>
              <Link
                href="/tracking"
                className="w-full sm:w-auto px-7 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-bold rounded-2xl transition duration-300 flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4 text-cyan-400" />
                <span>Tra Cứu Tiến Độ Sửa Chữa</span>
              </Link>
            </div>

            {/* Quick Guarantees */}
            <div className="pt-6 border-t border-slate-800 flex flex-wrap justify-center lg:justify-start gap-5 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-medium"><CheckCircle2 className="w-4 h-4 text-primary" /> Ký tên linh kiện</span>
              <span className="flex items-center gap-1.5 font-medium"><CheckCircle2 className="w-4 h-4 text-primary" /> Xem trực tiếp lấy ngay</span>
              <span className="flex items-center gap-1.5 font-medium"><CheckCircle2 className="w-4 h-4 text-primary" /> Kiểm tra máy miễn phí</span>
            </div>
          </div>

          {/* Direct Embedded Tracking Quick Card (Hero Right Panel) */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-slate-850 border border-slate-750 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-750 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Tra Cứu Nhanh Tiến Độ</h3>
                    <p className="text-[11px] text-slate-400">Nhập mã phiếu sửa chữa để tra cứu 24/7</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/30">
                  LIVE
                </span>
              </div>

              <form onSubmit={handleTrackingSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-300 font-bold mb-1.5">Mã phiếu (ví dụ: FIX-00001)</label>
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="Nhập mã phiếu FIX-XXXXX..."
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-bold focus:border-cyan-400 outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs rounded-xl transition duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>KÍCH HOẠT TRA CỨU</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Hotline hỗ trợ khách hàng:</span>
                <span className="font-extrabold text-amber-400">1800 2058 (Miễn phí)</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. DEVICE CATEGORIES GRID (E2) */}
      <section className="py-12 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-extrabold uppercase text-primary tracking-wider">Danh Mục Thiết Bị</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Bạn Cần Sửa Chữa Thiết Bị Nào?</h2>
            <p className="text-xs text-slate-500">Chọn loại thiết bị để xem danh sách dịch vụ và bảng giá chi tiết</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {deviceCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.id}
                  href={`/services?category=${cat.id}`}
                  className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:border-primary transition duration-300 text-center flex flex-col items-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition duration-300">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-white group-hover:text-primary transition">{cat.label}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{cat.desc}</p>
                  </div>
                  <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition">
                    <span>Khám phá</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. POPULAR SERVICES GRID (E3) */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <span className="text-xs font-extrabold uppercase text-primary tracking-wider">Dịch Vụ Phổ Biến</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">Dịch Vụ Sửa Chữa Nổi Bật</h2>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {['all', 'phone', 'laptop', 'tablet'].map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition capitalize whitespace-nowrap cursor-pointer ${
                    activeCategory === c 
                      ? 'bg-primary text-white shadow-md' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {c === 'all' ? 'Tất cả dịch vụ' : c === 'phone' ? 'Điện thoại' : c === 'laptop' ? 'MacBook / Laptop' : 'Tablet'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.slice(0, 6).map((service) => (
              <div 
                key={service.id}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-lg transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg uppercase">
                      {service.category}
                    </span>
                    <span className="text-slate-400 font-medium">Bảo hành: {service.warranty}</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">{service.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{service.description || 'Dịch vụ sửa chữa thay thế linh kiện chính hãng, bảo hành chu đáo.'}</p>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-850 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Giá từ</span>
                    <span className="text-base font-black text-primary">{formatPrice(service.price)}</span>
                  </div>
                  <Link
                    href={`/booking?service_id=${service.id}`}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1"
                  >
                    <span>Đặt Lịch</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <Link 
              href="/services" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white text-xs font-extrabold rounded-xl hover:bg-slate-800 transition"
            >
              <span>Xem Tất Cả Danh Mục Dịch Vụ</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. REPAIR PROCESS SECTION (E4 - 7-Step Process Presentation) */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-extrabold uppercase text-cyan-400 tracking-wider">Quy Trình Chuẩn Quốc Tế</span>
            <h2 className="text-2xl sm:text-3xl font-black">7 Bước Sửa Chữa Minh Bạch Tận Tâm</h2>
            <p className="text-xs text-slate-400">Khách hàng được trực tiếp theo dõi & giám sát từng bước xử lý thiết bị</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
            {repairSteps.map((s, idx) => (
              <div key={idx} className="relative bg-slate-850 border border-slate-750 p-4 rounded-2xl flex flex-col justify-between space-y-3 text-center">
                <span className="text-2xl font-black text-cyan-400">{s.step}</span>
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">{s.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-tight">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. WHY CHOOSE US (E5 - Trust & USPs) */}
      <section className="py-16 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-extrabold uppercase text-primary tracking-wider">Cam Kết Chất Lượng</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Tại Sao Chọn RepairSystem?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trustUSPs.map((usp, idx) => {
              const Icon = usp.icon;
              return (
                <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">{usp.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{usp.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. BRANCH SECTION (E7) */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-extrabold uppercase text-primary tracking-wider">Hệ Thống Phủ Sóng</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Chi Nhánh Phục Vụ Khách Hàng</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <MapPin className="w-5 h-5" />
                <span>Chi Nhánh Hà Nội</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">302 Cầu Giấy, Dịch Vọng, Cầu Giấy, Hà Nội</p>
              <p className="text-xs font-extrabold text-amber-500">Hotline: 1800 2058 (8:00 - 21:00)</p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <MapPin className="w-5 h-5" />
                <span>Chi Nhánh Đà Nẵng</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">97 Hàm Nghi, Vĩnh Trung, Hải Châu, Đà Nẵng</p>
              <p className="text-xs font-extrabold text-amber-500">Hotline: 1800 2059 (8:00 - 21:00)</p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <MapPin className="w-5 h-5" />
                <span>Chi Nhánh TP. Hồ Chí Minh</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">147 Ba Tháng Hai, Phường 11, Quận 10, TP.HCM</p>
              <p className="text-xs font-extrabold text-amber-500">Hotline: 1800 2056 (8:00 - 21:00)</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
