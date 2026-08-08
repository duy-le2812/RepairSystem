'use client';

import React, { useEffect, useState } from 'react';
import { getAdminStats, AdminStats } from '@/lib/api/admin';
import { Users, Ticket, Wrench, CircleDollarSign } from 'lucide-react';

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminStats()
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tổng quan hệ thống</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Khách hàng</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.total_customers}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Phiếu sửa chữa</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.total_tickets}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
            <CircleDollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Doanh thu dự kiến</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.total_revenue.toLocaleString()}đ</p>
          </div>
        </div>
      </div>

      {/* Trạng thái đơn */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Trạng thái phiếu sửa chữa</h2>
        <div className="space-y-4 max-w-xl">
          {Object.entries(stats.tickets_by_status).map(([status, count]) => {
            const statusMap: Record<string, { label: string, color: string }> = {
              'TiepNhan': { label: 'Mới tiếp nhận', color: 'bg-slate-500' },
              'DangKiemTra': { label: 'Đang kiểm tra', color: 'bg-yellow-500' },
              'ChoLinh Kien': { label: 'Chờ linh kiện', color: 'bg-orange-500' },
              'DangSua': { label: 'Đang tiến hành sửa', color: 'bg-blue-500' },
              'HoanThanh': { label: 'Đã hoàn thành', color: 'bg-green-500' },
            };
            const mapped = statusMap[status] || { label: status, color: 'bg-slate-400' };
            const percentage = stats.total_tickets > 0 ? (count / stats.total_tickets) * 100 : 0;
            
            return (
              <div key={status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{mapped.label}</span>
                  <span className="text-slate-500">{count} ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full ${mapped.color}`} style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
