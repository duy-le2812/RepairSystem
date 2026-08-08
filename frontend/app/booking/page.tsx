'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Smartphone, Laptop, Tablet, Watch, ChevronRight, ChevronLeft, 
  MapPin, Calendar, Clock, User, Phone, CheckCircle2, Copy, Share2, Sparkles, AlertTriangle
} from 'lucide-react';
import { OrderItem, ServiceCatalogItem } from '../../types';
import ApiClient from '../../lib/api/client';
import { Branch } from '../../types';
import { getServiceDetail } from '../../lib/api/catalog';
import Link from 'next/link';

// Zod Validation Schema
const bookingSchema = z.object({
  deviceType: z.enum(['phone', 'tablet', 'laptop', 'watch', 'other']),
  brand: z.string().min(1, 'Hãng sản xuất không được để trống'),
  deviceModel: z.string().min(1, 'Vui lòng nhập model máy cụ thể'),
  symptoms: z.string().min(5, 'Mô tả triệu chứng tối thiểu 5 ký tự'),
  branchId: z.string().min(1, 'Vui lòng chọn chi nhánh gần bạn nhất'),
  appointmentDate: z.string().min(1, 'Vui lòng chọn ngày hẹn').refine(dateStr => {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !isNaN(d.getTime()) && d >= today;
  }, 'Ngày hẹn không được ở trong quá khứ'),
  appointmentTime: z.string().min(1, 'Vui lòng chọn khung giờ hẹn'),
  customerName: z.string().min(2, 'Họ tên phải từ 2 ký tự trở lên'),
  phoneNumber: z.string().regex(/^(0[3|5|7|8|9])+([0-9]{8})$/, 'Số điện thoại không hợp lệ (độ dài 10 số bắt đầu bằng 0)'),
});

type BookingFormData = z.infer<typeof bookingSchema>;

function BookingContent() {
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const defaultDevice = searchParams.get('device') || '';
  const defaultType = searchParams.get('type') || 'phone';
  const paramServiceId = searchParams.get('serviceId');

  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<OrderItem | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceCatalogItem | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Form Setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
    trigger
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    defaultValues: {
      deviceType: defaultType as "phone" | "laptop" | "tablet" | "watch" | "other",
      deviceModel: defaultDevice,
      brand: defaultDevice.split(' ')[0] || '',
      symptoms: '',
      branchId: '',
      appointmentDate: '',
      appointmentTime: '',
      customerName: '',
      phoneNumber: '',
    }
  });

  // Watch fields for summaries
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const watchedValues = watch();

  // Auto pre-fill user info if logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.full_name || user.username) {
        setValue('customerName', user.full_name || user.username, { shouldValidate: true });
      }
      if (user.phone) {
        setValue('phoneNumber', user.phone, { shouldValidate: true });
      }
    }
  }, [isAuthenticated, user, setValue]);

  // Fetch serviceId if provided
  useEffect(() => {
    if (paramServiceId) {
      const sId = Number(paramServiceId);
      if (isNaN(sId)) {
        setServiceError('Mã dịch vụ không hợp lệ');
        return;
      }
      getServiceDetail(sId).then((svc) => {
        if (!svc || !svc.isActive) {
          setServiceError('Dịch vụ không tồn tại hoặc hiện không khả dụng.');
        } else {
          setSelectedService(svc);
          if (svc.category) {
            const catSlug = svc.category.slug.toLowerCase();
            let dType: "phone" | "laptop" | "tablet" | "watch" | "other" = "phone";
            if (catSlug.includes('laptop') || catSlug.includes('macbook')) dType = "laptop";
            else if (catSlug.includes('tablet') || catSlug.includes('ipad')) dType = "tablet";
            else if (catSlug.includes('watch')) dType = "watch";
            setValue('deviceType', dType, { shouldValidate: true });
          }
          if (svc.brand) {
            setValue('brand', svc.brand.name, { shouldValidate: true });
          }
          if (svc.model) {
            setValue('deviceModel', svc.model.name, { shouldValidate: true });
          }
          setValue('symptoms', svc.serviceName, { shouldValidate: true });
        }
      }).catch(() => {
        setServiceError('Không thể tải thông tin dịch vụ.');
      });
    }
  }, [paramServiceId, setValue]);

  useEffect(() => {
    ApiClient.getBranches().then((data) => {
      setBranches(data);
      if (data.length > 0) {
        setValue('branchId', String(data[0].id));
      }
    });
  }, [setValue]);

  // Sync parameters if loaded late
  useEffect(() => {
    if (defaultDevice) {
      setValue('deviceModel', defaultDevice);
      setValue('brand', defaultDevice.split(' ')[0] || '');
      setValue('deviceType', defaultType as "phone" | "laptop" | "tablet" | "watch" | "other");
    }
  }, [defaultDevice, defaultType, setValue]);

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof BookingFormData)[] = [];
    if (step === 1) {
      fieldsToValidate = ['deviceType', 'brand', 'deviceModel'];
    } else if (step === 2) {
      fieldsToValidate = ['symptoms'];
    } else if (step === 3) {
      fieldsToValidate = ['branchId', 'appointmentDate', 'appointmentTime'];
    }

    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setStep((prev) => prev - 1);
  };

  const handleCopyOrderId = () => {
    if (!createdOrder) return;
    navigator.clipboard.writeText(createdOrder.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const onSubmit = async (data: BookingFormData) => {
    setSubmitting(true);
    try {
      const order = await ApiClient.createBooking({
        customerName: data.customerName,
        phoneNumber: data.phoneNumber,
        deviceType: data.deviceType,
        brand: data.brand,
        deviceModel: data.deviceModel,
        symptoms: data.symptoms,
        branchId: data.branchId,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
      });
      setCreatedOrder(order);
      setStep(5); // Confirmation Screen
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Tạo lịch hẹn thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStepProgressWidth = () => {
    if (step === 5) return '100%';
    return `${((step - 1) / 3) * 100}%`;
  };

  const selectedBranchName = branches.find(b => b.id.toString() === watchedValues.branchId)?.name || createdOrder?.branchName || '';

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 min-h-screen">
      
      {/* 1. Header Details */}
      {step < 5 && (
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Đặt Lịch Hẹn Sửa Chữa
          </h1>
          <p className="text-muted text-xs">
            Giảm ngay 10% chi phí hóa đơn. Hỗ trợ đặt chỗ trực tuyến chỉ mất 1 phút.
          </p>
        </div>
      )}

      {serviceError && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{serviceError}</span>
          </div>
          <Link
            href="/services"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shrink-0"
          >
            Xem danh mục dịch vụ
          </Link>
        </div>
      )}

      {/* 2. Progress Stepper Bar */}
      {step < 5 && (
        <div className="mb-10 relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0 rounded-full"></div>
          <div 
            className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 rounded-full transition-all duration-500"
            style={{ width: getStepProgressWidth() }}
          ></div>
          
          <div className="relative flex justify-between z-10 select-none">
            {[
              { num: 1, label: 'Thiết bị' },
              { num: 2, label: 'Báo lỗi' },
              { num: 3, label: 'Lịch hẹn' },
              { num: 4, label: 'Thông tin' }
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-1.5 bg-background px-2">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                    step >= s.num 
                      ? 'bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/20' 
                      : 'bg-white dark:bg-slate-900 border-slate-350 dark:border-slate-800 text-muted'
                  }`}
                >
                  {s.num}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  step >= s.num ? 'text-primary' : 'text-muted'
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Main Form Container */}
      {step < 5 && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
          
          {/* STEP 1: SELECT DEVICE TYPE & MODEL */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-base font-bold text-foreground border-b border-slate-100 dark:border-slate-800 pb-3">
                Bước 1: Chọn Thiết Bị Của Bạn
              </h2>

              {/* Grid selectors */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Loại thiết bị</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'phone', label: 'Điện thoại', icon: Smartphone },
                    { id: 'laptop', label: 'Laptop/Mac', icon: Laptop },
                    { id: 'tablet', label: 'Máy tính bảng', icon: Tablet },
                    { id: 'watch', label: 'Smartwatch', icon: Watch },
                  ].map((type) => {
                    const Icon = type.icon;
                    const isSelected = watchedValues.deviceType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setValue('deviceType', type.id as "phone" | "laptop" | "tablet" | "watch" | "other", { shouldValidate: true })}
                        className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 cursor-pointer transition ${
                          isSelected 
                            ? 'border-primary bg-primary-light/30 dark:bg-primary-light/5 text-primary shadow-sm font-bold' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 text-foreground'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-xs">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.deviceType && <p className="text-[10px] text-error font-semibold mt-1">{errors.deviceType.message}</p>}
              </div>

              {/* Brand and exact model */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Hãng sản xuất</label>
                  <input
                    type="text"
                    {...register('brand')}
                    placeholder="Ví dụ: Apple, Samsung, Dell..."
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition text-foreground"
                  />
                  {errors.brand && <p className="text-[10px] text-error font-semibold mt-1">{errors.brand.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Model thiết bị cụ thể</label>
                  <input
                    type="text"
                    {...register('deviceModel')}
                    placeholder="Ví dụ: iPhone 13 Pro, Latitude 5420..."
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition text-foreground"
                  />
                  {errors.deviceModel && <p className="text-[10px] text-error font-semibold mt-1">{errors.deviceModel.message}</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DETAILS OF PROBLEMS */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-base font-bold text-foreground border-b border-slate-100 dark:border-slate-800 pb-3">
                Bước 2: Triệu Chứng Lỗi & Sự Cố
              </h2>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Mô tả chi tiết tình trạng máy</label>
                <textarea
                  rows={4}
                  {...register('symptoms')}
                  placeholder="Vui lòng nhập chi tiết sự cố (Ví dụ: Máy bị rơi nước, bật không lên nguồn; hoặc màn hình bị sọc xanh cảm ứng không bấm được)..."
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-2xl text-xs outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition text-foreground resize-none leading-relaxed"
                />
                {errors.symptoms && <p className="text-[10px] text-error font-semibold mt-1">{errors.symptoms.message}</p>}
              </div>

              <div className="p-4 bg-primary-light/20 dark:bg-primary-light/5 border border-primary/20 rounded-2xl flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">
                  Mẹo AI: Mô tả càng chi tiết sẽ giúp hệ thống đề xuất kỹ thuật viên mang đúng linh kiện dự trữ sẵn kho để đẩy nhanh thời gian hoàn thành sau khi kiểm tra.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: DATE TIME BRANCH */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-base font-bold text-foreground border-b border-slate-100 dark:border-slate-800 pb-3">
                Bước 3: Chọn Thời Gian & Địa Điểm
              </h2>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted">Chi nhánh dịch vụ sửa chữa</label>
                <div className="grid grid-cols-1 gap-2.5">
                  {branches.map((b) => {
                    const isSelected = watchedValues.branchId === String(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setValue('branchId', String(b.id), { shouldValidate: true })}
                        className={`w-full text-left p-3.5 border rounded-2xl flex items-start gap-3 cursor-pointer transition ${
                          isSelected 
                            ? 'border-primary bg-primary-light/30 dark:bg-primary-light/5 text-primary' 
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/40 text-foreground'
                        }`}
                      >
                        <MapPin className="w-5 h-5 shrink-0 text-primary mt-0.5" />
                        <div className="text-xs">
                          <h4 className="font-bold">{b.name}</h4>
                          <p className="text-[11px] text-muted mt-0.5">{b.address}</p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-1">Làm việc: {b.workingHours}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> Ngày hẹn sửa chữa
                  </label>
                  <input
                    type="date"
                    {...register('appointmentDate')}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 text-foreground transition"
                  />
                  {errors.appointmentDate && <p className="text-[10px] text-error font-semibold mt-1">{errors.appointmentDate.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Khung giờ hẹn
                  </label>
                  <select
                    {...register('appointmentTime')}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 text-foreground transition"
                  >
                    <option value="">Chọn khung giờ</option>
                    <option value="08:00 - 10:00">08:00 - 10:00 (Đầu ca sáng)</option>
                    <option value="10:00 - 12:00">10:00 - 12:00</option>
                    <option value="12:00 - 14:00">12:00 - 14:00 (Hỗ trợ nghỉ trưa)</option>
                    <option value="14:00 - 16:00">14:00 - 16:00</option>
                    <option value="16:00 - 18:00">16:00 - 18:00 (Cuối chiều)</option>
                    <option value="18:00 - 20:00">18:00 - 20:00 (Khung giờ tối)</option>
                  </select>
                  {errors.appointmentTime && <p className="text-[10px] text-error font-semibold mt-1">{errors.appointmentTime.message}</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CONTACT & REVIEW */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-base font-bold text-foreground border-b border-slate-100 dark:border-slate-800 pb-3">
                Bước 4: Thông Tin Liên Hệ & Tóm Tắt
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-primary" /> Họ và tên khách hàng
                  </label>
                  <input
                    type="text"
                    {...register('customerName')}
                    placeholder="Nhập tên đầy đủ..."
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 text-foreground transition"
                  />
                  {errors.customerName && <p className="text-[10px] text-error font-semibold mt-1">{errors.customerName.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-primary" /> Số điện thoại liên hệ
                  </label>
                  <input
                    type="tel"
                    {...register('phoneNumber')}
                    placeholder="Số điện thoại di động..."
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-none focus:border-primary focus:bg-white dark:focus:bg-slate-900 text-foreground transition"
                  />
                  {errors.phoneNumber && <p className="text-[10px] text-error font-semibold mt-1">{errors.phoneNumber.message}</p>}
                </div>
              </div>

              {/* Review summary box */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-foreground border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
                  <span>Tóm tắt lịch hẹn sửa chữa</span>
                  <span className="text-[10px] text-primary flex items-center gap-0.5">
                    <Sparkles className="w-3 h-3 text-accent fill-accent" /> Giảm 10% đặt lịch trực tuyến
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-y-2.5 text-xs text-foreground/95 font-semibold">
                  <div>
                    <span className="text-[10px] text-muted uppercase tracking-wider block font-bold">Thiết bị</span>
                    <span>{watchedValues.brand} {watchedValues.deviceModel}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase tracking-wider block font-bold">Chi nhánh</span>
                    <span className="truncate block max-w-[200px]">{selectedBranchName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase tracking-wider block font-bold">Thời gian hẹn</span>
                    <span>{watchedValues.appointmentDate} • {watchedValues.appointmentTime}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase tracking-wider block font-bold">Triệu chứng lỗi</span>
                    <span className="truncate block max-w-[200px]">{watchedValues.symptoms}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Buttons Row */}
          <div className="flex items-center justify-between border-t border-slate-150 dark:border-slate-800/80 pt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-2.5 border border-slate-350 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-foreground transition flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>
            ) : (
              <div></div>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-primary/10 active:scale-[0.98]"
              >
                <span>Tiếp tục</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !isValid}
                className="px-8 py-3 bg-accent hover:bg-accent-hover disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-muted rounded-xl text-xs font-black text-white transition flex items-center gap-2 cursor-pointer shadow-lg shadow-accent/20 active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang gửi lịch hẹn...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4.5 h-4.5" />
                    <span>Xác Nhận Đặt Lịch</span>
                  </>
                )}
              </button>
            )}
          </div>

        </form>
      )}

      {/* 4. STEP 5: BOOKING SUCCESS CONFIRMATION PANEL */}
      {step === 5 && createdOrder && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-8 shadow-xl text-center space-y-6 animate-slide-up">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 text-success rounded-full flex items-center justify-center mx-auto border-2 border-success/30">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-black text-foreground">Đặt Lịch Hẹn Thành Công!</h1>
            <p className="text-muted text-xs leading-relaxed max-w-sm mx-auto">
              Hệ thống đã phê duyệt lịch của bạn. Nhân viên của RepairSystem sẽ liên hệ bằng số hotline để xác nhận lịch hẹn trong 10-15 phút tới.
            </p>
          </div>

          {/* Ticket code detail */}
          <div className="max-w-xs mx-auto bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl p-4 space-y-2 relative">
            <span className="text-[10px] text-muted uppercase font-bold tracking-widest block">Mã phiếu sửa chữa của bạn</span>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-black text-primary select-all">{createdOrder.id}</span>
              <button 
                onClick={handleCopyOrderId}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition text-muted hover:text-foreground"
                title="Sao chép mã"
              >
                <Copy className="w-4.5 h-4.5" />
              </button>
            </div>
            {copiedId && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded shadow animate-fade-in font-bold">
                Đã sao chép!
              </span>
            )}
          </div>

          {/* Detailed appointment summary */}
          <div className="max-w-md mx-auto text-left border border-slate-150 dark:border-slate-800 rounded-2xl p-5 text-xs text-foreground/90 font-medium space-y-3 bg-slate-50/50">
            <h3 className="font-bold border-b border-slate-200 dark:border-slate-850 pb-2">Chi tiết lịch hẹn</h3>
            <div className="grid grid-cols-2 gap-y-2">
              <span className="text-muted font-bold">Khách hàng:</span>
              <span className="text-right">{createdOrder.customerName}</span>
              <span className="text-muted font-bold">Số điện thoại:</span>
              <span className="text-right">{createdOrder.phoneNumber}</span>
              <span className="text-muted font-bold">Thiết bị cần sửa:</span>
              <span className="text-right">{createdOrder.brand} {createdOrder.deviceModel}</span>
              <span className="text-muted font-bold">Dịch vụ đề xuất:</span>
              <span className="text-right">{createdOrder.deviceType === 'phone' ? 'Thay linh kiện điện thoại' : 'Sửa chữa phần cứng'}</span>
              <span className="text-muted font-bold">Thời gian nhận máy:</span>
              <span className="text-right font-bold text-primary">
                {createdOrder.appointmentDate || watchedValues.appointmentDate} • {createdOrder.appointmentTime || watchedValues.appointmentTime}
              </span>
              <span className="text-muted font-bold">Địa chỉ chi nhánh:</span>
              <span className="text-right truncate max-w-[200px]" title={selectedBranchName}>{selectedBranchName}</span>
            </div>
          </div>

          {/* Share/Actions buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 max-w-sm mx-auto pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                alert('Đã đồng bộ lịch hẹn với Google Calendar/Apple Calendar thành công!');
              }}
              className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Calendar className="w-4 h-4 text-primary" />
              <span>Thêm vào lịch</span>
            </button>
            
            <a
              href={`https://zalo.me`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-4 bg-primary text-white hover:bg-primary-hover text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>Chia sẻ Zalo</span>
            </a>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setCreatedOrder(null);
                setStep(1);
              }}
              className="text-xs font-bold text-muted hover:text-primary transition underline cursor-pointer"
            >
              Đặt thêm một lịch sửa chữa khác
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Đang tải biểu mẫu đặt lịch...</div>}>
      <BookingContent />
    </Suspense>
  );
}
