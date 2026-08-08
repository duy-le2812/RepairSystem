'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { 
  Smartphone, Laptop, Tablet, Watch, ChevronRight, Search, 
  Clock, ShieldCheck, Wrench, Sparkles, RefreshCw, AlertTriangle, ArrowRight
} from 'lucide-react';
import { Category, Brand, DeviceModel, ServiceCatalogItem } from '../../types';
import { 
  getCategories, 
  getBrandsByCategory, 
  getModelsByBrand, 
  getServicesByModel 
} from '../../lib/api/catalog';
import { formatPrice } from '../../lib/format';

function ServiceCatalogContent() {
  // Selection states
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  const [models, setModels] = useState<DeviceModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<DeviceModel | null>(null);

  const [services, setServices] = useState<ServiceCatalogItem[]>([]);

  // Search within models
  const [modelSearchQuery, setModelSearchQuery] = useState('');

  // Loading & Error states
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch Categories on Mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    setErrorMsg(null);
    try {
      const data = await getCategories();
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0]);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Không thể tải danh sách loại thiết bị. Vui lòng kiểm tra lại kết nối.');
    } finally {
      setLoadingCategories(false);
    }
  };

  // 2. Fetch Brands when Category changes
  useEffect(() => {
    if (!selectedCategory) {
      setBrands([]);
      setSelectedBrand(null);
      return;
    }
    setLoadingBrands(true);
    setErrorMsg(null);
    setBrands([]);
    setSelectedBrand(null);
    setModels([]);
    setSelectedModel(null);
    setServices([]);

    getBrandsByCategory(selectedCategory.id)
      .then((data) => {
        setBrands(data);
        if (data.length > 0) {
          setSelectedBrand(data[0]);
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Không thể tải danh sách hãng sản xuất.');
      })
      .finally(() => setLoadingBrands(false));
  }, [selectedCategory]);

  // 3. Fetch DeviceModels when Brand changes
  useEffect(() => {
    if (!selectedBrand) {
      setModels([]);
      setSelectedModel(null);
      return;
    }
    setLoadingModels(true);
    setErrorMsg(null);
    setModels([]);
    setSelectedModel(null);
    setServices([]);

    getModelsByBrand(selectedBrand.id)
      .then((data) => {
        setModels(data);
        if (data.length > 0) {
          setSelectedModel(data[0]);
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Không thể tải danh sách model thiết bị.');
      })
      .finally(() => setLoadingModels(false));
  }, [selectedBrand]);

  // 4. Fetch Services when DeviceModel changes
  useEffect(() => {
    if (!selectedModel) {
      setServices([]);
      return;
    }
    setLoadingServices(true);
    setErrorMsg(null);

    getServicesByModel(selectedModel.id)
      .then((data) => {
        setServices(data);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Không thể tải danh sách dịch vụ cho model này.');
      })
      .finally(() => setLoadingServices(false));
  }, [selectedModel]);

  const getCategoryIcon = (slug: string) => {
    const s = slug.toLowerCase();
    if (s.includes('laptop') || s.includes('macbook')) return Laptop;
    if (s.includes('tablet') || s.includes('ipad')) return Tablet;
    if (s.includes('watch')) return Watch;
    return Smartphone;
  };

  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(modelSearchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 min-h-screen space-y-8">
      
      {/* 1. Breadcrumb Bar */}
      <nav className="flex items-center gap-2 text-xs text-muted flex-wrap">
        <Link href="/" className="hover:text-primary transition font-medium">Trang chủ</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-bold">Danh mục dịch vụ</span>
        {selectedCategory && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-primary font-bold">{selectedCategory.name}</span>
          </>
        )}
        {selectedBrand && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-primary font-bold">{selectedBrand.name}</span>
          </>
        )}
        {selectedModel && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-bold">{selectedModel.name}</span>
          </>
        )}
      </nav>

      {/* 2. Hero Banner */}
      <div className="bg-gradient-to-br from-primary-light/40 via-white to-accent-light/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Service Catalog
        </div>
        <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight">
          Danh Mục Dịch Vụ Sửa Chữa Thiết Bị
        </h1>
        <p className="text-xs md:text-sm text-muted max-w-xl mx-auto leading-relaxed">
          Tra cứu bảng giá minh bạch, linh kiện chính hãng và bảo hành dài hạn. Chọn thiết bị của bạn để tìm dịch vụ phù hợp nhất.
        </p>
      </div>

      {/* Error state alert */}
      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-800 dark:text-red-300">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => fetchCategories()}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Thử lại
          </button>
        </div>
      )}

      {/* 3. STEP 1: CATEGORY SELECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
            Chọn Loại Thiết Bị
          </h2>
          {loadingCategories && (
            <span className="text-xs text-muted flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tải...
            </span>
          )}
        </div>

        {loadingCategories ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat.slug);
              const isSelected = selectedCategory?.id === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary-light/40 dark:bg-primary-light/10 text-primary shadow-md shadow-primary/10 font-bold scale-[1.02]'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 bg-white dark:bg-slate-900 text-foreground'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-muted'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold leading-tight">{cat.name}</h3>
                    <p className="text-[10px] text-muted line-clamp-1 mt-0.5">{cat.description || 'Xem dịch vụ'}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. STEP 2: BRAND SELECTION */}
      {selectedCategory && (
        <section className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
              Chọn Hãng Sản Xuất ({selectedCategory.name})
            </h2>
            {loadingBrands && (
              <span className="text-xs text-muted flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tải hãng...
              </span>
            )}
          </div>

          {loadingBrands ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-28 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : brands.length === 0 ? (
            <p className="text-xs text-muted italic py-4">Chưa có hãng nào cho loại thiết bị này.</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {brands.map((b) => {
                const isSelected = selectedBrand?.id === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBrand(b)}
                    className={`px-5 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary text-white shadow-md shadow-primary/20 scale-105'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-foreground hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 5. STEP 3: MODEL SELECTION */}
      {selectedBrand && (
        <section className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3 gap-2">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">3</span>
              Chọn Model Máy ({selectedBrand.name})
            </h2>
            
            {/* Model Filter Input */}
            {models.length > 4 && (
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Lọc model..."
                  value={modelSearchQuery}
                  onChange={(e) => setModelSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs outline-none focus:border-primary text-foreground transition"
                />
              </div>
            )}
          </div>

          {loadingModels ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : filteredModels.length === 0 ? (
            <p className="text-xs text-muted italic py-4">Không tìm thấy model khớp với tìm kiếm.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {filteredModels.map((m) => {
                const isSelected = selectedModel?.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m)}
                    className={`p-3 rounded-xl border text-center text-xs font-semibold truncate transition cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary-light/30 dark:bg-primary-light/10 text-primary font-bold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-foreground hover:border-slate-350'
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 6. STEP 4: SERVICES LIST */}
      {selectedModel && (
        <section className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-black text-foreground flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                Dịch Vụ Sửa Chữa Cho: <span className="text-primary">{selectedModel.name}</span>
              </h2>
              <p className="text-xs text-muted mt-1">
                Bảng giá trọn gói đã bao gồm công tháo lắp và kiểm tra linh kiện trực tiếp.
              </p>
            </div>
            {loadingServices && (
              <span className="text-xs text-muted flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang cập nhật bảng giá...
              </span>
            )}
          </div>

          {loadingServices ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-44 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse"></div>
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-3xl space-y-3">
              <Wrench className="w-10 h-10 text-muted mx-auto stroke-1" />
              <h3 className="text-sm font-bold text-foreground">Hiện chưa có dịch vụ cho model này</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Quý khách có thể gửi yêu cầu đặt lịch kiểm tra trực tiếp để kỹ thuật viên hỗ trợ báo giá cá nhân hóa.
              </p>
              <Link
                href={`/booking?device=${encodeURIComponent(selectedModel.name)}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition shadow-md shadow-primary/20"
              >
                <span>Đặt lịch kiểm tra ngay</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((svc) => (
                <div 
                  key={svc.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-foreground leading-snug">{svc.serviceName}</h3>
                      <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full shrink-0 border border-emerald-200 dark:border-emerald-800">
                        Sẵn linh kiện
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed line-clamp-2">
                      {svc.description || 'Dịch vụ sửa chữa thay thế linh kiện chuyên nghiệp, đảm bảo độ bền cao.'}
                    </p>
                  </div>

                  {/* Specs & Price */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-850 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-primary" /> Khoảng {svc.estimatedDurationMinutes} phút
                      </span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-success" /> Bảo hành {svc.warrantyMonths > 0 ? `${svc.warrantyMonths} tháng` : 'Không áp dụng'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Giá trọn gói</span>
                        <span className="text-lg font-black text-accent">{formatPrice(svc.basePrice)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/services/${svc.id}`}
                          className="px-3 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground text-xs font-bold rounded-xl transition"
                        >
                          Chi tiết
                        </Link>

                        <Link
                          href={`/booking?serviceId=${svc.id}`}
                          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition shadow-md shadow-primary/20 flex items-center gap-1"
                        >
                          <span>Đặt lịch</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </section>
      )}

    </div>
  );
}

export default function ServiceCatalogPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Đang tải danh mục dịch vụ...</div>}>
      <ServiceCatalogContent />
    </Suspense>
  );
}
