'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, X, ChevronRight, Laptop, Smartphone, ShieldCheck, Clock } from 'lucide-react';
import ApiClient from '../../lib/api/client';
import { ServiceItem } from '../../types';

export default function AiSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ServiceItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search logic
  useEffect(() => {
    if (!query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const data = await ApiClient.getServices({ searchQuery: query });
        setResults(data.slice(0, 5)); // Limit to top 5 results for clean dropdown
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Click outside to close suggestion box
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length + 1 ? prev + 1 : 0)); // +2 extra slots for fallback search actions
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length + 1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex === -1) {
        // Search full query
        handleFullSearch();
      } else if (selectedIndex < results.length) {
        // Go to specific service price page
        const selectedService = results[selectedIndex];
        router.push(`/price-list?category=${selectedService.category}&brand=${selectedService.brand}`);
        setIsOpen(false);
      } else if (selectedIndex === results.length) {
        handleFullSearch();
      } else if (selectedIndex === results.length + 1) {
        // Quick booking shortcut
        router.push(`/booking`);
        setIsOpen(false);
      }
    }
  };

  const handleFullSearch = () => {
    if (!query.trim()) return;
    router.push(`/price-list?search=${encodeURIComponent(query)}`);
    setIsOpen(false);
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md" onKeyDown={handleKeyDown}>
      {/* Search Input Box */}
      <div className="relative flex items-center w-full bg-slate-100 dark:bg-slate-800 rounded-full border border-transparent focus-within:border-primary/50 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all duration-300 shadow-sm focus-within:shadow-md">
        <div className="pl-4 text-muted dark:text-muted flex items-center">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Tìm sửa điện thoại, laptop... (Thử 'pin')"
          className="w-full py-2 px-3 text-sm bg-transparent border-0 outline-none text-foreground placeholder:text-muted/70 focus:ring-0"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="p-1 mr-2 text-muted hover:text-foreground rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-1 py-1 px-2.5 mr-2 text-[10px] font-medium text-primary bg-primary-light dark:bg-primary-light/10 dark:text-primary rounded-full border border-primary/20 shrink-0 select-none">
          <Sparkles className="w-3 h-3" />
          <span>AI Search</span>
        </div>
      </div>

      {/* Suggested Dropdown Panel */}
      {isOpen && (query.trim() || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in max-h-[460px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 gap-2 text-muted text-sm">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>AI đang quét bảng giá...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              {/* Category: Services */}
              <div className="px-3 py-1.5 text-[11px] font-bold text-muted uppercase tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 mb-1">
                <span>DỊCH VỤ CÓ SẴN</span>
                <span className="text-[10px] text-primary normal-case font-normal flex items-center">
                  Tìm thấy {results.length} dịch vụ
                </span>
              </div>
              
              <ul className="space-y-0.5">
                {results.map((service, index) => {
                  const isSelected = selectedIndex === index;
                  return (
                    <li key={service.id}>
                      <button
                        onClick={() => {
                          router.push(`/price-list?category=${service.category}&brand=${service.brand}`);
                          setIsOpen(false);
                        }}
                        className={`w-full text-left flex items-start gap-3 p-2.5 rounded-lg transition duration-200 ${
                          isSelected 
                            ? 'bg-primary-light/50 dark:bg-primary-light/10 border-l-4 border-primary' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded text-primary shrink-0 mt-0.5">
                          {service.category === 'laptop' ? <Laptop className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className="text-xs font-semibold text-foreground truncate">
                              {service.deviceModel}
                            </h4>
                            <span className="text-xs font-bold text-accent shrink-0">
                              {formatPrice(service.price)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted truncate mt-0.5">
                            {service.name}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-success" /> BH {service.warranty}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-primary" /> {service.time}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Suggestions / Shortcuts */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 mt-2 pt-2 pb-1 px-1">
                <button
                  onClick={handleFullSearch}
                  className={`w-full text-left flex items-center justify-between p-2 rounded-lg text-xs text-foreground transition ${
                    selectedIndex === results.length ? 'bg-primary-light/30 dark:bg-primary-light/10 font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-muted" />
                    <span>Xem tất cả kết quả cho &quot;<span className="font-semibold text-primary">{query}</span>&quot;</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted" />
                </button>

                <button
                  onClick={() => {
                    router.push('/booking');
                    setIsOpen(false);
                  }}
                  className={`w-full text-left flex items-center justify-between p-2 rounded-lg text-xs text-foreground transition ${
                    selectedIndex === results.length + 1 ? 'bg-primary-light/30 dark:bg-primary-light/10 font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>Đặt lịch sửa nhanh cùng kỹ thuật viên</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-muted">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">Không tìm thấy dịch vụ nào</p>
              <p className="text-[11px] text-muted mt-1 max-w-[280px] mx-auto">
                AI chưa thấy giá cho &quot;{query}&quot;. Thử tìm kiếm các từ khóa phổ biến như <span className="text-primary cursor-pointer hover:underline" onClick={() => setQuery('pin')}>pin</span>, <span className="text-primary cursor-pointer hover:underline" onClick={() => setQuery('màn hình')}>màn hình</span> hoặc <span className="text-primary cursor-pointer hover:underline" onClick={() => setQuery('MacBook')}>MacBook</span>.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
