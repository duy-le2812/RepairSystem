'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/protected-route';
import { 
  CreditCard, CheckCircle2, PackageCheck, Printer, FileText, Search, 
  RefreshCw, Smartphone, User, ArrowRight, ShieldCheck, DollarSign
} from 'lucide-react';
import { 
  getReadyHandoverTickets, 
  processPayment, 
  confirmHandover 
} from '@/lib/api/handover';
import Link from 'next/link';
import { formatPrice, getStatusBadgeConfig } from '@/lib/format';

export default function StaffHandoverPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNPAID' | 'READY' | 'HANDED_OVER'>('ALL');

  // Payment Modal State
  const [payTicket, setPayTicket] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [transRef, setTransRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Handover Confirm Modal State
  const [handoverTicket, setHandoverTicket] = useState<any | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await getReadyHandoverTickets();
      setTickets(data);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Không thể tải danh sách phiếu trả máy.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTicket) return;
    setSubmitting(true);
    try {
      await processPayment(payTicket.numeric_id, {
        amount: payTicket.total_amount,
        payment_method: paymentMethod,
        transaction_reference: transRef
      });
      alert('Thanh toán thành công & Đã xuất hóa đơn!');
      setPayTicket(null);
      setTransRef('');
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Thanh toán thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmHandover = async () => {
    if (!handoverTicket) return;
    setSubmitting(true);
    try {
      await confirmHandover(handoverTicket.numeric_id);
      alert('Đã bàn giao thiết bị thành công cho khách hàng!');
      setHandoverTicket(null);
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Bàn giao thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const term = search.toLowerCase();
    const matchesSearch = (
      t.id.toLowerCase().includes(term) ||
      t.customerName.toLowerCase().includes(term) ||
      t.phoneNumber.includes(term) ||
      t.deviceModel.toLowerCase().includes(term)
    );

    if (!matchesSearch) return false;

    if (filterTab === 'UNPAID') return t.payment_status === 'UNPAID' && t.handover_status !== 'HANDED_OVER';
    if (filterTab === 'READY') return t.payment_status === 'PAID' && t.handover_status === 'READY';
    if (filterTab === 'HANDED_OVER') return t.handover_status === 'HANDED_OVER';
    return true;
  });

  return (
    <ProtectedRoute allowedRoles={['admin', 'staff', 'receptionist']}>
      <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground flex items-center gap-2.5">
              <PackageCheck className="w-7 h-7 text-emerald-600" />
              Bàn Giao & Thanh Toán Thiết Bị
            </h1>
            <p className="text-xs text-muted mt-1">
              Quản lý thu tiền thanh toán, xuất hóa đơn & bàn giao thiết bị hoàn tất cho khách hàng.
            </p>
          </div>
          <button
            onClick={fetchTickets}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-bold rounded-xl transition flex items-center gap-1.5 self-start cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới danh sách</span>
          </button>
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'UNPAID', label: 'Chờ thanh toán' },
              { id: 'READY', label: 'Sẵn sàng giao máy' },
              { id: 'HANDED_OVER', label: 'Đã hoàn tất trả máy' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  filterTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-foreground hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Tìm mã FIX-, tên, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:border-emerald-500 text-foreground"
            />
          </div>
        </div>

        {/* Tickets Grid */}
        {loading ? (
          <div className="p-12 text-center text-xs text-muted">Đang tải danh sách...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
            <PackageCheck className="w-8 h-8 text-muted mx-auto" />
            <p className="text-xs font-bold text-foreground">Không có thiết bị nào trong danh sách chờ trả.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTickets.map((t) => (
              <div 
                key={t.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-200">{t.id}</span>
                    <div className="flex gap-1">
                      {t.payment_status === 'PAID' ? (
                        <span className="px-2.5 py-1 bg-green-100 text-green-800 text-[10px] font-extrabold rounded-full">ĐÃ THANH TOÁN</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full">CHƯA THANH TOÁN</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground">{t.deviceModel} ({t.brand})</h3>
                    <p className="text-xs text-muted font-medium mt-0.5">Khách: {t.customerName} - {t.phoneNumber}</p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">Tổng tiền duyệt:</span>
                      <span className="font-extrabold text-emerald-600">{formatPrice(t.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted">Bảo hành:</span>
                      <span className="font-semibold text-foreground">{t.warranty}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted">Trạng thái QC:</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> PASS
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                  {t.payment_status === 'UNPAID' ? (
                    <button
                      onClick={() => setPayTicket(t)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Thu Tiền Thanh Toán</span>
                    </button>
                  ) : t.handover_status !== 'HANDED_OVER' ? (
                    <button
                      onClick={() => setHandoverTicket(t)}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Xác Nhận Đã Giao Máy</span>
                    </button>
                  ) : (
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-center text-xs font-bold text-emerald-600">
                      ✓ Đã hoàn tất giao máy
                    </div>
                  )}

                  {t.invoice && (
                    <div className="flex gap-2">
                      <Link
                        href={`/invoices/${t.numeric_id}`}
                        target="_blank"
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-foreground text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1 transition"
                      >
                        <Printer className="w-3.5 h-3.5 text-primary" /> In Hóa Đơn
                      </Link>
                      <Link
                        href={`/invoices/${t.numeric_id}?receipt=true`}
                        target="_blank"
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-foreground text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1 transition"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" /> Phiếu Giao Nhận
                      </Link>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

        {/* PAYMENT MODAL */}
        {payTicket && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <form onSubmit={handleConfirmPayment} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" /> Thanh Toán Hóa Đơn
                </h3>
                <button type="button" onClick={() => setPayTicket(null)} className="text-xs text-muted font-bold">✕</button>
              </div>

              <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-850">
                <div className="flex justify-between"><span className="text-muted">Mã phiếu:</span><span className="font-bold text-foreground">{payTicket.id}</span></div>
                <div className="flex justify-between"><span className="text-muted">Khách hàng:</span><span className="font-bold text-foreground">{payTicket.customerName}</span></div>
                <div className="flex justify-between"><span className="text-muted">Thiết bị:</span><span className="font-bold text-foreground">{payTicket.deviceModel}</span></div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-foreground">TỔNG THU:</span>
                  <span className="text-lg font-black text-emerald-600">{formatPrice(payTicket.total_amount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-foreground">Phương thức thanh toán</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-2.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-foreground'
                    }`}
                  >
                    💵 Tiền mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                    className={`py-2.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      paymentMethod === 'BANK_TRANSFER'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-foreground'
                    }`}
                  >
                    🏦 Chuyển khoản QR
                  </button>
                </div>
              </div>

              {paymentMethod === 'BANK_TRANSFER' && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-foreground">Mã tham chiếu / Mã giao dịch</label>
                  <input
                    type="text"
                    placeholder="e.g. FT26080812345"
                    value={transRef}
                    onChange={(e) => setTransRef(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-xs outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayTicket(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-foreground text-xs font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {submitting ? 'Đang xử lý...' : 'Xác Nhận Thanh Toán'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* HANDOVER CONFIRM MODAL */}
        {handoverTicket && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-indigo-600" /> Xác Nhận Giao Máy Cho Khách
                </h3>
                <button type="button" onClick={() => setHandoverTicket(null)} className="text-xs text-muted font-bold">✕</button>
              </div>

              <div className="space-y-2 text-xs bg-indigo-50/50 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-150 dark:border-indigo-850">
                <div className="flex justify-between"><span className="text-muted">Mã phiếu:</span><span className="font-bold text-foreground">{handoverTicket.id}</span></div>
                <div className="flex justify-between"><span className="text-muted">Khách hàng:</span><span className="font-bold text-foreground">{handoverTicket.customerName}</span></div>
                <div className="flex justify-between"><span className="text-muted">Thiết bị:</span><span className="font-bold text-foreground">{handoverTicket.deviceModel}</span></div>
                <div className="flex justify-between items-center pt-2 border-t border-indigo-200 dark:border-indigo-800">
                  <span className="font-bold text-foreground">Trạng thái tiền:</span>
                  <span className="text-xs font-black text-emerald-600">✓ ĐÃ THANH TOÁN ({formatPrice(handoverTicket.total_amount)})</span>
                </div>
              </div>

              <p className="text-xs text-muted">
                Xác nhận khách hàng đã kiểm tra thiết bị, ký nhận và nhận máy hoàn tất?
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setHandoverTicket(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-foreground text-xs font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmHandover}
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  {submitting ? 'Đang giao...' : 'XÁC NHẬN ĐÃ GIAO MÁY'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
