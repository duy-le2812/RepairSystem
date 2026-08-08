'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Ticket, Wrench, CircleDollarSign, Clock, AlertTriangle, 
  TrendingUp, Activity, CheckCircle2, XCircle, ShieldCheck, RefreshCw, Smartphone, Laptop
} from 'lucide-react';
import { getAdminDashboardOverview } from '@/lib/api/admin';
import { formatPrice } from '@/lib/format';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>('month');

  useEffect(() => {
    fetchDashboard(dateRange);
  }, [dateRange]);

  const fetchDashboard = async (range: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminDashboardOverview(range);
      setData(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể tải dữ liệu Dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-primary" />
        <span>Đang tải dữ liệu Báo cáo & Thống kê...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
        <p className="text-xs font-bold text-red-600">{error}</p>
        <button
          onClick={() => fetchDashboard(dateRange)}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const summary = data?.summary || {};
  const statusList = data?.status_distribution || [];
  const revenueList = data?.revenue_by_date || [];
  const popularDevices = data?.popular_devices || [];
  const popularBrands = data?.popular_brands || [];
  const popularServices = data?.popular_services || [];
  const techPerformance = data?.technician_performance || [];
  const outstandingTickets = data?.outstanding_tickets || [];
  const recentActivity = data?.recent_activity || [];

  // Maximum revenue for simple CSS chart scaling
  const maxRevenue = Math.max(...revenueList.map((r: any) => Number(r.revenue)), 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 py-4">
      
      {/* Header & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-primary" />
            Tổng Quan Hệ Thống & Báo Cáo Kinh Doanh
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi tình trạng vận hành, tiến độ sửa chữa & doanh thu thực tế theo thời gian thực.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-bold rounded-xl outline-none focus:border-primary cursor-pointer shadow-sm"
          >
            <option value="today">Hôm nay</option>
            <option value="7days">7 ngày gần đây</option>
            <option value="30days">30 ngày gần đây</option>
            <option value="month">Tháng này</option>
            <option value="last_month">Tháng trước</option>
          </select>

          <button
            onClick={() => fetchDashboard(dateRange)}
            className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 1. KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] uppercase font-extrabold text-slate-400">TỔNG PHIẾU</span>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{summary.total_tickets || 0}</p>
          <span className="text-[10px] text-slate-500 font-medium">Toàn hệ thống</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] uppercase font-extrabold text-indigo-500">ĐANG SỬA CHỮA</span>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{summary.active_repairs || 0}</p>
          <span className="text-[10px] text-slate-500 font-medium">Kỹ thuật viên</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] uppercase font-extrabold text-amber-500">CHỜ KHÁCH DUYỆT</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{summary.waiting_customer || 0}</p>
          <span className="text-[10px] text-slate-500 font-medium">Đã báo giá</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] uppercase font-extrabold text-cyan-500">CHỜ GIAO MÁY</span>
          <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">{summary.ready_for_pickup || 0}</p>
          <span className="text-[10px] text-slate-500 font-medium">QC PASS</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] uppercase font-extrabold text-emerald-500">HOÀN TẤT TRA MÁY</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{summary.completed || 0}</p>
          <span className="text-[10px] text-slate-500 font-medium">Giao máy thành công</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm bg-emerald-50/20 dark:bg-emerald-950/20">
          <span className="text-[10px] uppercase font-extrabold text-emerald-600 dark:text-emerald-300">DOANH THU THỰC</span>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatPrice(summary.revenue)}</p>
          <span className="text-[10px] text-slate-500 font-medium">Thanh toán (PAID)</span>
        </div>
      </div>

      {/* 2. REVENUE CHART & STATUS DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Timeline Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-emerald-600" /> Biểu Đồ Doanh Thu Theo Ngày (VND)
            </h2>
            <span className="text-xs font-bold text-emerald-600">{formatPrice(summary.revenue)}</span>
          </div>

          {revenueList.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400 italic">Chưa có giao dịch thanh toán trong khoảng thời gian này.</div>
          ) : (
            <div className="h-52 flex items-end gap-1.5 pt-6 pb-2 overflow-x-auto border-b border-slate-100 dark:border-slate-800">
              {revenueList.map((r: any, idx: number) => {
                const heightPercent = maxRevenue > 0 ? (Number(r.revenue) / maxRevenue) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 min-w-[24px] flex flex-col items-center gap-1 group relative">
                    {/* Hover Tooltip */}
                    <div className="absolute -top-8 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                      {r.date}: {formatPrice(r.revenue)}
                    </div>
                    <div 
                      className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-all"
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                    />
                    <span className="text-[9px] text-slate-400 rotate-45 origin-left mt-2">{r.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary" /> Phân Bố Trạng Thái Phiếu
          </h2>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {statusList.map((st: any) => {
              const pct = summary.total_tickets > 0 ? (st.count / summary.total_tickets) * 100 : 0;
              return (
                <div key={st.status} className="space-y-1 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-700 dark:text-slate-300">{st.label}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{st.count} <span className="text-[10px] text-slate-400">({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. DEVICE, BRAND & SERVICE ANALYTICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Popular Devices */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-indigo-500" /> Loại Thiết Bị Phổ Biến
          </h3>
          <div className="space-y-2 text-xs">
            {popularDevices.length === 0 ? (
              <p className="text-slate-400 italic">Chưa có dữ liệu thiết bị.</p>
            ) : (
              popularDevices.map((d: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl">
                  <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{d.name}</span>
                  <span className="font-extrabold text-indigo-600">{d.count} đơn ({d.percentage}%)</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Brands */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Laptop className="w-4 h-4 text-blue-500" /> Top 5 Hãng Thiết Bị
          </h3>
          <div className="space-y-2 text-xs">
            {popularBrands.length === 0 ? (
              <p className="text-slate-400 italic">Chưa có dữ liệu hãng.</p>
            ) : (
              popularBrands.map((b: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{idx + 1}. {b.name}</span>
                  <span className="font-extrabold text-blue-600">{b.count} đơn</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-emerald-500" /> Top Dịch Vụ Sử Dụng
          </h3>
          <div className="space-y-2 text-xs">
            {popularServices.length === 0 ? (
              <p className="text-slate-400 italic">Chưa có dữ liệu dịch vụ.</p>
            ) : (
              popularServices.map((s: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl">
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">{s.name}</span>
                  <span className="font-extrabold text-emerald-600">{s.count} lượt</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 4. TECHNICIAN PERFORMANCE TABLE */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Hiệu Suất Kỹ Thuật Viên
        </h2>

        {techPerformance.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Chưa có dữ liệu phân công kỹ thuật viên.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase">
                  <th className="py-2.5">Kỹ thuật viên</th>
                  <th className="py-2.5 text-center">Được phân công</th>
                  <th className="py-2.5 text-center">Đã hoàn thành</th>
                  <th className="py-2.5 text-center text-emerald-600">QC PASS</th>
                  <th className="py-2.5 text-center text-red-500">QC FAIL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {techPerformance.map((t: any) => (
                  <tr key={t.technician_id}>
                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{t.technician_name}</td>
                    <td className="py-3 text-center font-bold">{t.assigned_count}</td>
                    <td className="py-3 text-center font-bold text-blue-600">{t.completed_count}</td>
                    <td className="py-3 text-center font-bold text-emerald-600">{t.qc_passed_count}</td>
                    <td className="py-3 text-center font-bold text-red-500">{t.qc_failed_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. OUTSTANDING TICKETS & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Outstanding / Aging Tickets */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Phiếu Cần Chú Ý (Tồn Đọng Lâu)
          </h2>

          {outstandingTickets.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Không có phiếu tồn đọng.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {outstandingTickets.map((t: any) => (
                <div key={t.numeric_id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-primary">{t.ticket_code}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{t.device_model}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t.status_label} - Tạo: {t.created_at}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold rounded-lg text-[10px]">
                    Tồn: {t.aging_days} ngày
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" /> Nhật Ký Hoạt Động Gần Đây
          </h2>

          {recentActivity.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Chưa có hoạt động mới.</p>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {recentActivity.map((act: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-800 dark:text-white">{act.action} ({act.ticket_code})</span>
                    <span className="text-[10px] text-slate-400">{act.timestamp}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">{act.details || 'Không có ghi chú'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
