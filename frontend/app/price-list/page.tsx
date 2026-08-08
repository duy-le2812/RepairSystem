'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, SlidersHorizontal, Smartphone, Laptop, Tablet, Watch, ShieldCheck, Clock, CalendarDays, AlertCircle } from 'lucide-react';
import ApiClient from '../../lib/api/client';
import { ServiceItem } from '../../types';

function PriceListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL params state
  const paramCategory = searchParams.get('category') || 'all';
  const paramBrand = searchParams.get('brand') || 'all';
  const paramSearch = searchParams.get('search') || '';

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>(paramCategory);
  const [selectedBrand, setSelectedBrand] = useState<string>(paramBrand);
  const [searchQuery, setSearchQuery] = useState<string>(paramSearch);

  // Sync state with URL params
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCategory(paramCategory);
    setSelectedBrand(paramBrand);
    setSearchQuery(paramSearch);
  }, [paramCategory, paramBrand, paramSearch]);

  // Fetch filtered data
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    ApiClient.getServices({
      category: selectedCategory,
      brand: selectedBrand,
      searchQuery: searchQuery
    })
      .then((data) => {
        setServices(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedCategory, selectedBrand, searchQuery]);

  // Handle filter changes and push to URL
  const updateParams = (category: string, brand: string, search: string) => {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (brand && brand !== 'all') params.set('brand', brand);
    if (search) params.set('search', search);
    router.push(`/price-list?${params.toString()}`);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    // Reset brand when category changes to avoid empty combinations
    setSelectedBrand('all');
    updateParams(cat, 'all', searchQuery);
  };

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    updateParams(selectedCategory, brand, searchQuery);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    updateParams(selectedCategory, selectedBrand, val);
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Get brands based on category
  const getBrandOptions = () => {
    if (selectedCategory === 'laptop') {
      return ['Apple', 'Dell', 'HP', 'Asus'];
    }
    if (selectedCategory === 'phone') {
      return ['Apple', 'Samsung', 'Oppo', 'Xiaomi'];
    }
    return ['Apple', 'Samsung', 'Dell', 'HP', 'Asus'];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 min-h-screen">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
        <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground">
          Bảng Giá Sửa Chữa Thiết Bị Điện Tử
        </h1>
        <p className="text-muted text-xs md:text-sm mt-2">
          Báo giá minh bạch, trọn gói linh kiện + tiền công thợ, cam kết không phát sinh chi phí phụ.
        </p>
      </div>

      {/* Grid Filter Options */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Sidebar Filters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-5 rounded-2xl space-y-6">
          <div className="flex items-center gap-2 font-bold text-xs text-foreground uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3">
            <SlidersHorizontal className="w-4.5 h-4.5 text-primary" />
            <span>Bộ lọc tìm kiếm</span>
          </div>

          {/* Search box inside filter panel */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider block">Từ khóa thiết bị</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Nhập tên máy (ví dụ: iPhone 13)..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition text-foreground"
              />
              <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Categories select list */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider block">Loại Thiết Bị</label>
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'all', label: 'Tất cả thiết bị', icon: null },
                { id: 'phone', label: 'Điện thoại', icon: Smartphone },
                { id: 'laptop', label: 'MacBook & Laptop', icon: Laptop },
                { id: 'tablet', label: 'iPad & Máy tính bảng', icon: Tablet },
                { id: 'watch', label: 'Smartwatch', icon: Watch },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedCategory === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleCategoryChange(opt.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                      isSelected 
                        ? 'bg-primary text-white shadow-md shadow-primary/10' 
                        : 'text-foreground/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4 shrink-0" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brand select dropdown */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider block">Hãng Sản Xuất</label>
            <select
              value={selectedBrand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 text-foreground transition"
            >
              <option value="all">Tất cả hãng sản xuất</option>
              {getBrandOptions().map((b) => (
                <option key={b} value={b.toLowerCase()}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Content Table Prices */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Important note */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
              <p className="font-bold">Lưu ý quan trọng về giá dịch vụ:</p>
              <p className="mt-1">
                Bảng giá đã bao gồm toàn bộ linh kiện thay mới + công thợ tháo lắp + bảo hành. Giá thực tế tại cửa hàng có thể dao động nhẹ tùy thuộc vào tình trạng mainboard hoặc linh kiện hao mòn khác của thiết bị. Kỹ thuật viên sẽ kiểm tra trực tiếp và báo giá chính xác miễn phí trước khi làm.
              </p>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              /* Skeleton Loader list */
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4 last:pb-0 last:border-b-0">
                    <div className="space-y-2 w-full max-w-sm">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-3/4"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-1/2"></div>
                    </div>
                    <div className="flex gap-4 w-full max-w-xs justify-end items-center shrink-0">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-16"></div>
                      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-24"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : services.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 text-muted font-bold border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 pl-6">Thiết Bị</th>
                      <th className="p-4">Dịch Vụ Thay Thế Sửa Chữa</th>
                      <th className="p-4">Bảo Hành</th>
                      <th className="p-4">Thời Gian</th>
                      <th className="p-4 text-right">Chi Phí (Trọn gói)</th>
                      <th className="p-4 pr-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                    {services.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-550/20 dark:hover:bg-slate-850/20 transition">
                        <td className="p-4 pl-6 font-bold text-foreground">
                          {s.deviceModel}
                        </td>
                        <td className="p-4 text-slate-700 dark:text-slate-300">
                          {s.name}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-success rounded text-[10px] font-bold border border-success/20">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{s.warranty}</span>
                          </span>
                        </td>
                        <td className="p-4 text-muted flex items-center gap-1 mt-1.5 border-t-0">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          <span>{s.time}</span>
                        </td>
                        <td className="p-4 text-right font-black text-accent text-sm">
                          {formatPrice(s.price)}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <Link
                            href={`/booking?device=${encodeURIComponent(s.deviceModel)}&type=${s.category}`}
                            className="inline-flex items-center gap-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition shadow-md shadow-primary/10 active:scale-95"
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>Đặt lịch hẹn</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Empty state */
              <div className="p-12 text-center text-muted">
                <p className="font-bold text-foreground text-sm">Không tìm thấy dịch vụ tương ứng</p>
                <p className="text-xs mt-1.5">Không tìm thấy linh kiện phù hợp với bộ lọc hiện tại. Vui lòng gõ tên máy khác hoặc nhắn tin Chat AI góc phải để được tìm kiếm tự động.</p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedBrand('all');
                    setSearchQuery('');
                    updateParams('all', 'all', '');
                  }}
                  className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-foreground text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

export default function PriceListPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Đang kết xuất bảng giá...</div>}>
      <PriceListContent />
    </Suspense>
  );
}
