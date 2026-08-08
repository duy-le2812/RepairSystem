'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Wrench, Clock, ShieldCheck, CheckCircle2, ChevronRight, 
  AlertTriangle, PhoneCall, Sparkles, ArrowLeft, Share2, HelpCircle
} from 'lucide-react';
import { ServiceCatalogItem } from '../../../types';
import { getServiceDetail } from '../../../lib/api/catalog';
import { formatPrice } from '../../../lib/format';

function ServiceDetailContent() {
  const params = useParams();
  const router = useRouter();
  const serviceIdStr = params?.id as string;

  const [service, setService] = useState<ServiceCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceIdStr) return;
    const sId = Number(serviceIdStr);
    if (isNaN(sId)) {
      setErrorMsg('Mã dịch vụ không hợp lệ.');
      setLoading(false);
      return;
    }

    setLoading(true);
    getServiceDetail(sId)
      .then((data) => {
        if (!data || !data.isActive) {
          setErrorMsg('Dịch vụ hiện không khả dụng hoặc đã bị ẩn khỏi danh mục công khai.');
        } else {
          setService(data);
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Không thể kết nối đến máy chủ để lấy thông tin dịch vụ.');
      })
      .finally(() => setLoading(false));
  }, [serviceIdStr]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-muted font-medium">Đang tải thông tin chi tiết dịch vụ...</p>
      </div>
    );
  }

  if (errorMsg || !service) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">Dịch vụ không khả dụng</h1>
          <p className="text-xs text-muted leading-relaxed max-w-md mx-auto">{errorMsg}</p>
        </div>
        <div>
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition shadow-md shadow-primary/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh mục dịch vụ</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen space-y-8 animate-fade-in">
      
      {/* 1. Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted flex-wrap">
        <Link href="/" className="hover:text-primary transition font-medium">Trang chủ</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/services" className="hover:text-primary transition font-medium">Danh mục dịch vụ</Link>
        {service.category && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-muted">{service.category.name}</span>
          </>
        )}
        {service.brand && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-muted">{service.brand.name}</span>
          </>
        )}
        {service.model && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-muted">{service.model.name}</span>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-bold truncate max-w-[200px]">{service.serviceName}</span>
      </nav>

      {/* 2. Main Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-8">
        
        {/* Header Title & Badges */}
        <div className="space-y-3 border-b border-slate-150 dark:border-slate-800 pb-6">
          <div className="flex flex-wrap gap-2">
            {service.category && (
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-bold uppercase tracking-wider">
                {service.category.name}
              </span>
            )}
            {service.brand && (
              <span className="px-3 py-1 bg-primary-light/40 dark:bg-primary-light/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider">
                {service.brand.name}
              </span>
            )}
            {service.model && (
              <span className="px-3 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-full text-[10px] font-bold">
                {service.model.name}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            {service.serviceName}
          </h1>

          <p className="text-xs md:text-sm text-muted leading-relaxed">
            {service.description || 'Dịch vụ sửa chữa thay thế linh kiện chuyên nghiệp, quy trình chuẩn xác đảm bảo hiệu năng thiết bị ban đầu.'}
          </p>
        </div>

        {/* Highlight Specifications Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-1">
            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Giá dịch vụ trọn gói</span>
            <span className="text-xl font-black text-accent block">{formatPrice(service.basePrice)}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">Đã bao gồm công lắp & VAT</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-1">
            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" /> Thời gian sửa dự kiến
            </span>
            <span className="text-lg font-bold text-foreground block">Khoảng {service.estimatedDurationMinutes} phút</span>
            <span className="text-[10px] text-muted block">Xem trực tiếp & lấy ngay</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-1">
            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-success" /> Thời gian bảo hành
            </span>
            <span className="text-lg font-bold text-foreground block">
              {service.warrantyMonths > 0 ? `${service.warrantyMonths} tháng` : 'Không áp dụng'}
            </span>
            <span className="text-[10px] text-muted block">Bảo hành điện tử qua SĐT</span>
          </div>
        </div>

        {/* Guarantees List */}
        <div className="p-5 bg-primary-light/20 dark:bg-primary-light/5 border border-primary/20 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 fill-primary text-primary" /> Cam kết chất lượng dịch vụ
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-foreground/90 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <span>Linh kiện đạt chuẩn 100%</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <span>Quan sát tháo lắp trực tiếp</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <span>Hoàn tiền nếu không dứt bệnh</span>
            </div>
          </div>
        </div>

        {/* CTA Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-150 dark:border-slate-800">
          <button
            onClick={() => router.back()}
            className="w-full sm:w-auto px-5 py-3 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-foreground transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <a
              href="tel:19001234"
              className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-4 h-4 text-primary" />
              <span>Tư vấn hotline</span>
            </a>

            <Link
              href={`/booking?serviceId=${service.id}`}
              className="flex-1 sm:flex-none px-8 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-xl transition shadow-lg shadow-accent/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Đặt Lịch Sửa Ngay</span>
              <ChevronRight className="w-4.5 h-4.5" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}

export default function ServiceDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Đang tải thông tin dịch vụ...</div>}>
      <ServiceDetailContent />
    </Suspense>
  );
}
