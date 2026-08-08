'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Smartphone, Laptop, Tablet, Watch, ChevronRight, CheckCircle2, 
  Star, Quote, Users, ShieldCheck, Zap, Award, Sparkles 
} from 'lucide-react';
import ApiClient from '../lib/api/client';
import { ServiceItem } from '../types';

export default function HomePage() {
  const [popularServices, setPopularServices] = useState<ServiceItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'phone' | 'laptop' | 'tablet' | 'watch'>('all');
  const [activeReview, setActiveReview] = useState(0);

  useEffect(() => {
    // Load services list, filter only popular ones
    ApiClient.getServices().then((data) => {
      setPopularServices(data.filter(s => s.popular));
    });
  }, []);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const deviceCategories = [
    { id: 'phone', label: 'Điện Thoại', icon: Smartphone, desc: 'iPhone, Samsung, Oppo...' },
    { id: 'laptop', label: 'MacBook & Laptop', icon: Laptop, desc: 'MacBook, Dell, HP, Asus...' },
    { id: 'tablet', label: 'iPad & Tablet', icon: Tablet, desc: 'iPad, Samsung Tab...' },
    { id: 'watch', label: 'Smartwatch', icon: Watch, desc: 'Apple Watch, Galaxy Watch...' },
  ];

  const brandLogos = [
    { name: 'Apple Authorized Parts Partner', label: 'Apple' },
    { name: 'Samsung Genuine Service', label: 'Samsung' },
    { name: 'Dell Network Retailer', label: 'Dell' },
    { name: 'HP Authorized Partner', label: 'HP' },
    { name: 'Asus Service Partner', label: 'Asus' },
    { name: 'Pisen Official Distributor', label: 'Pisen' }
  ];

  const trustStats = [
    { value: '8+', label: 'Năm kinh nghiệm hoạt động' },
    { value: '120.000+', label: 'Thiết bị đã phục hồi sửa chữa' },
    { value: '99.4%', label: 'Tỷ lệ khách hàng hài lòng (Đánh giá 5★)' },
    { value: '24h', label: 'Thời gian bảo hành xử lý lỗi tối đa' }
  ];

  const testimonials = [
    {
      name: 'Anh Nguyễn Minh Tuấn',
      role: 'Lập trình viên (TP.HCM)',
      content: 'MacBook Pro M1 của mình bị chai pin nặng, mang qua đây thay lấy ngay sau 45 phút. Kỹ thuật tháo máy rất chuyên nghiệp, còn vệ sinh bụi quạt sạch sẽ và bôi keo tản nhiệt miễn phí. Cực kỳ hài lòng!',
      rating: 5,
      avatar: 'T'
    },
    {
      name: 'Chị Lê Thị Hương',
      role: 'Nhân viên văn phòng (Hà Nội)',
      content: 'Bị rơi vỡ màn hình iPhone 13 Pro Max lo nhất là bị tráo linh kiện. May mắn tìm được FixCare, ngồi xem trực tiếp thợ sửa luôn. Màn hình thay mới sắc nét như zin, cảm ứng mượt mà, bảo hành 12 tháng rất yên tâm.',
      rating: 5,
      avatar: 'H'
    },
    {
      name: 'Anh Phạm Quốc Bảo',
      role: 'Kinh doanh tự do (Đà Nẵng)',
      content: 'Đặt lịch trước trên web được giảm ngay 10% hóa đơn. Giá cả công khai, nhân viên tư vấn nhiệt tình báo đúng lỗi đúng giá, không chèo kéo làm thêm dịch vụ. Chắc chắn sẽ quay lại ủng hộ.',
      rating: 5,
      avatar: 'B'
    }
  ];

  const filteredServices = activeCategory === 'all' 
    ? popularServices 
    : popularServices.filter(s => s.category === activeCategory);

  return (
    <div className="w-full flex flex-col min-h-screen">
      
      {/* 1. Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white overflow-hidden py-16 lg:py-24">
        {/* Glow effect vectors */}
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs font-bold text-primary select-none justify-center">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sử dụng AI báo giá và chẩn đoán nhanh tức thì</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Sửa Chữa Thiết Bị Điện Tử <br className="hidden md:block"/>
              <span className="text-primary">Nhanh Chóng - Tin Cậy - Giá Rõ Ràng</span>
            </h1>
            
            <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-lg mx-auto lg:mx-0">
              Hệ thống chuyên thay màn hình, ép kính, thay pin điện thoại & máy tính xách tay. Xem trực tiếp quá trình sửa chữa, bảo hành điện tử chính hãng lên đến 12 tháng.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                href="/booking"
                className="w-full sm:w-auto px-8 py-3 bg-accent hover:bg-accent-hover text-white text-sm font-extrabold rounded-xl transition duration-300 transform hover:scale-[1.02] shadow-lg shadow-accent/25 text-center"
              >
                Đặt Lịch Hẹn (Giảm 10%)
              </Link>
              <Link
                href="/price-list"
                className="w-full sm:w-auto px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-650 text-white text-sm font-semibold rounded-xl transition duration-300 text-center"
              >
                Xem Bảng Giá Chi Tiết
              </Link>
            </div>

            {/* Micro assurances */}
            <div className="pt-6 border-t border-slate-800/80 flex flex-wrap justify-center lg:justify-start gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Ký tên lên linh kiện</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Xem trực tiếp lấy ngay</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Hoàn tiền nếu không hài lòng</span>
            </div>
          </div>

          {/* Banner visual representation (avoiding stock placeholders, designing a custom CSS UI dashboard card) */}
          <div className="relative mx-auto lg:ml-auto w-full max-w-md aspect-square bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 shadow-2xl flex flex-col justify-between overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-[60px] pointer-events-none"></div>
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">FixCare Dashboard</span>
              <span className="px-2 py-0.5 bg-success/15 border border-success/30 rounded-full text-[9px] text-success font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-success rounded-full animate-ping"></span>
                Chi nhánh trực tuyến
              </span>
            </div>

            {/* CSS graphics simulating a diagnostic screen */}
            <div className="space-y-4 my-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Thiết bị chẩn đoán</span>
                  <span className="font-semibold text-white">iPhone 13 Pro</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Linh kiện đề xuất</span>
                  <span className="font-semibold text-primary">Pin Orizin Dung lượng cao</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                  <div className="bg-primary w-4/5 h-full rounded-full"></div>
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                  <span>Tiếp nhận (09:35)</span>
                  <span>Đang sửa (10:00)</span>
                  <span>Sẵn sàng (10:30)</span>
                </div>
              </div>

              {/* Booking notification alert simulation */}
              <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 flex items-center gap-3">
                <div className="p-2 bg-accent/20 text-accent rounded-lg">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white">Ưu Đãi Đặt Lịch Hẹn Trực Tuyến</p>
                  <p className="text-[10px] text-slate-300">Giảm ngay 10% công sửa + Tặng gói vệ sinh máy 150k</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800 pt-4">
              <span>Hệ thống bảo hành điện tử 24/7</span>
              <span className="text-slate-400 font-medium">Lấy máy sau 30 phút</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Device Category Selector Grid */}
      <section className="py-16 max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Danh Mục Thiết Bị Sửa Chữa
          </h2>
          <p className="text-muted text-xs md:text-sm max-w-md mx-auto">
            Lựa chọn loại thiết bị của bạn để xem bảng giá và tìm kiếm dịch vụ thay thế linh kiện tương ứng.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {deviceCategories.map((cat) => {
            const IconComp = cat.icon;
            return (
              <Link
                key={cat.id}
                href={`/price-list?category=${cat.id}`}
                className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-xl dark:hover:shadow-primary/5 transition-all duration-300 text-center flex flex-col items-center gap-3 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-primary-light dark:group-hover:bg-primary-light/10 text-slate-700 dark:text-slate-350 group-hover:text-primary flex items-center justify-center transition-all duration-300 shadow-inner">
                  <IconComp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition">
                    {cat.label}
                  </h3>
                  <p className="text-[11px] text-muted mt-0.5">{cat.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Trust statistics Section */}
      <section className="bg-slate-100 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800/80 py-12 no-print">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {trustStats.map((stat, index) => (
            <div key={index} className="text-center space-y-1.5">
              <span className="block text-3xl md:text-4xl font-extrabold text-primary tracking-tight">
                {stat.value}
              </span>
              <p className="text-xs font-semibold text-foreground/80 max-w-[200px] mx-auto leading-normal">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Why Choose Us Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
        <div className="space-y-4 lg:col-span-1 text-center lg:text-left">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Tại Sao Nên Chọn <br /> Dịch Vụ Tại FixCare?
          </h2>
          <p className="text-muted text-xs md:text-sm leading-relaxed">
            Chúng tôi xây dựng quy trình sửa chữa minh bạch, cam kết đặt quyền lợi khách hàng lên hàng đầu.
          </p>
          <div className="pt-4 hidden lg:block">
            <Link
              href="/booking"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white hover:bg-primary-hover text-xs font-bold rounded-lg transition"
            >
              <span>Đặt lịch đặt hẹn ngay</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:col-span-2">
          {/* Card 1: Transparent repair */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Ký Tên Lên Linh Kiện</h3>
            <p className="text-xs text-muted leading-relaxed">
              Khách hàng ký tên lên mainboard, camera, pin... trước khi gửi lại máy. Xem trực tiếp quá trình kỹ thuật tháo lắp thay linh kiện.
            </p>
          </div>

          {/* Card 2: Genuine parts */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Linh Kiện Chính Hãng</h3>
            <p className="text-xs text-muted leading-relaxed">
              Cam kết sử dụng linh kiện zin tháo máy hoặc bên thứ 3 uy tín (Pisen, Orizin, Gen A...). Hoàn tiền gấp đôi nếu phát hiện hàng nhái.
            </p>
          </div>

          {/* Card 3: Quick repair */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Sửa Nhanh Lấy Ngay</h3>
            <p className="text-xs text-muted leading-relaxed">
              Hơn 80% dịch vụ sửa chữa như thay pin, thay màn hình, ép mặt kính hoàn thành chỉ từ 30 - 60 phút. Không giữ máy qua đêm với lỗi nhẹ.
            </p>
          </div>

          {/* Card 4: Long warranty */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-foreground">Bảo Hành Dài Hạn</h3>
            <p className="text-xs text-muted leading-relaxed">
              Bảo hành từ 6 đến 12 tháng lỗi 1 đổi 1. Hỗ trợ tra cứu tem bảo hành trực tuyến tiện lợi bằng số điện thoại.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Brand logo ribbon */}
      <section className="bg-slate-50 dark:bg-slate-950/20 py-8 border-y border-slate-100 dark:border-slate-850 overflow-hidden no-print">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">
            Thương hiệu hỗ trợ sửa chữa & phân phối linh kiện uỷ quyền
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-60">
            {brandLogos.map((brand, i) => (
              <span key={i} className="text-sm font-black text-slate-650 dark:text-slate-400 tracking-tight select-none">
                {brand.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Popular pricing table preview (minified) */}
      <section className="py-16 max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 text-center md:text-left">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              Bảng Giá Tham Khảo Linh Kiện Nổi Bật
            </h2>
            <p className="text-muted text-xs md:text-sm mt-1">
              Báo giá sửa chữa minh bạch đã bao gồm công thợ tháo lắp. Đặt lịch để giữ linh kiện và nhận ưu đãi giảm 10%.
            </p>
          </div>
          
          {/* Quick tab filter */}
          <div className="flex flex-wrap justify-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(['all', 'phone', 'laptop', 'tablet'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 text-[11px] font-bold uppercase rounded-lg transition duration-200 cursor-pointer ${
                  activeCategory === cat 
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' 
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {cat === 'all' ? 'TẤT CẢ' : cat === 'phone' ? 'ĐIỆN THOẠI' : cat === 'laptop' ? 'LAPTOP' : 'MÁY TÍNH BẢNG'}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing list layout */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {filteredServices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-muted font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4">Dòng Máy Thiết Bị</th>
                    <th className="p-4">Dịch Vụ Thay Thế</th>
                    <th className="p-4">Thời Gian</th>
                    <th className="p-4">Bảo Hành</th>
                    <th className="p-4 text-right">Chi Phí (Trọn gói)</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {filteredServices.slice(0, 6).map((service) => (
                    <tr key={service.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition">
                      <td className="p-4 font-bold text-foreground">{service.deviceModel}</td>
                      <td className="p-4 text-slate-700 dark:text-slate-350">{service.name}</td>
                      <td className="p-4 text-muted">{service.time}</td>
                      <td className="p-4">
                        <span className="inline-block px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-success rounded text-[10px] font-bold border border-success/20">
                          {service.warranty}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-accent">{formatPrice(service.price)}</td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/booking?device=${encodeURIComponent(service.deviceModel)}&type=${service.category}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-primary-light hover:bg-primary text-primary hover:text-white rounded-lg text-[10px] font-bold transition"
                        >
                          Đặt lịch hẹn
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted">
              Đang tải danh sách bảng giá...
            </div>
          )}
          
          <div className="p-4 bg-slate-50 dark:bg-slate-850 text-center border-t border-slate-100 dark:border-slate-800">
            <Link 
              href="/price-list" 
              className="text-xs font-bold text-primary hover:text-primary-hover flex items-center justify-center gap-1.5"
            >
              <span>Xem toàn bộ bảng giá sửa chữa công khai</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Testimonial Carousel */}
      <section className="bg-slate-100 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800/80 py-16 no-print">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              Ý Kiến Đánh Giá Từ Khách Hàng
            </h2>
            <p className="text-muted text-xs md:text-sm">
              Xem cảm nhận thực tế của những khách hàng đã trải nghiệm dịch vụ sửa chữa của FixCare.
            </p>
          </div>

          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-8 md:p-12 shadow-xl">
            <Quote className="w-12 h-12 text-primary/10 absolute top-4 left-6" />
            
            {/* Feedback Content */}
            <div className="space-y-6 relative z-10">
              <div className="flex justify-center gap-1">
                {[...Array(testimonials[activeReview].rating)].map((_, i) => (
                  <Star key={i} className="w-4.5 h-4.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              
              <p className="text-sm md:text-base italic text-foreground/90 leading-relaxed font-medium">
                &ldquo;{testimonials[activeReview].content}&rdquo;
              </p>
              
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                  {testimonials[activeReview].avatar}
                </div>
                <div className="text-left text-xs">
                  <h4 className="font-bold text-foreground">{testimonials[activeReview].name}</h4>
                  <p className="text-muted">{testimonials[activeReview].role}</p>
                </div>
              </div>
            </div>

            {/* Navigation Dots */}
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveReview(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition duration-300 cursor-pointer ${
                    activeReview === idx ? 'bg-primary scale-125' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. CTA Banner (Final booking prompt) */}
      <section className="bg-gradient-to-r from-primary to-primary-hover text-white py-16 no-print">
        <div className="max-w-5xl mx-auto px-4 md:px-8 text-center space-y-6">
          <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">
            Thiết Bị Của Bạn Đang Gặp Lỗi? Đặt Lịch Ngay Nhận Ưu Đãi!
          </h2>
          <p className="text-primary-light max-w-lg mx-auto text-xs md:text-sm leading-relaxed">
            Nhận ngay mã giảm giá 10% chi phí thay thế linh kiện, miễn phí vệ sinh và sấy khô máy ẩm nước. Ưu đãi chỉ áp dụng đặt lịch trực tuyến.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
            <Link
              href="/booking"
              className="px-8 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-extrabold rounded-xl transition shadow-lg shadow-accent/15"
            >
              Đặt lịch sửa chữa lấy ngay
            </Link>
            <a
              href="tel:18002056"
              className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-xl transition"
            >
              Liên hệ tổng đài 1800 2056
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
