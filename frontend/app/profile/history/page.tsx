'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/protected-route';
import { getMyRepairHistory } from '@/lib/api/auth';
import { respondQuotation } from '@/lib/api/ticket';
import { 
  User, History, Key, Search, ChevronRight, Clock, Hammer, AlertTriangle, 
  CheckCircle, XCircle, Info, Filter, ChevronLeft, Eye, X, ClipboardList 
} from 'lucide-react';
import Link from 'next/link';
import { OrderItem } from '@/types';
import { formatPrice, getStatusBadgeConfig } from '@/lib/format';

function HistoryContent() {
  const [tickets, setTickets] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search, filter & pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Selected ticket for Detail Modal
  const [selectedTicket, setSelectedTicket] = useState<OrderItem | null>(null);

  const fetchHistory = (p = page, q = searchQuery, st = statusFilter) => {
    setLoading(true);
    getMyRepairHistory({ page: p, limit: 5, q: q || undefined, status: st || undefined })
      .then(data => {
        if (data.items) {
          setTickets(data.items);
          setTotalPages(data.pages || 1);
          setTotalRecords(data.total || 0);
        } else if (Array.isArray(data)) {
          setTickets(data);
          setTotalPages(1);
          setTotalRecords(data.length);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHistory(page, searchQuery, statusFilter);
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchHistory(1, searchQuery, statusFilter);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statusLabelMap: Record<string, { label: string; color: string }> = {
    'TiepNhan': { label: 'Đã tiếp nhận', color: 'bg-blue-100 text-blue-800 border border-blue-200' },
    'DangKiemTra': { label: 'Đang kiểm tra', color: 'bg-amber-100 text-amber-800 border border-amber-200' },
    'DaChuanDoan': { label: 'Đã chuẩn đoán', color: 'bg-purple-100 text-purple-800 border border-purple-200' },
    'ChoKhachXacNhan': { label: 'Chờ khách xác nhận', color: 'bg-orange-100 text-orange-800 font-bold border border-orange-300 animate-pulse' },
    'KhachDongY': { label: 'Khách đồng ý sửa', color: 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300' },
    'KhachTuChoi': { label: 'Khách từ chối sửa', color: 'bg-red-100 text-red-800 font-bold border border-red-300' },
    'DangSua': { label: 'Đang sửa', color: 'bg-indigo-100 text-indigo-800 border border-indigo-200' },
    'DaSuaXong': { label: 'Đã sửa xong', color: 'bg-teal-100 text-teal-800 border border-teal-200' },
    'KiemTraChatLuong': { label: 'Kiểm tra chất lượng (QC)', color: 'bg-cyan-100 text-cyan-800 border border-cyan-200' },
    'ChoKhachNhanMay': { label: 'Chờ khách nhận máy', color: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
    'DaThanhToan': { label: 'Đã thanh toán', color: 'bg-sky-100 text-sky-800 border border-sky-200' },
    'HoanThanh': { label: 'Hoàn thành', color: 'bg-green-100 text-green-800 font-bold border border-green-300' },
  };

  const handleRespondQuotation = async (ticketId: string, decision: 'approved' | 'rejected', reason?: string) => {
    try {
      const numericId = parseInt(ticketId.split('-')[1]);
      await respondQuotation(numericId, { decision, rejection_reason: reason });
      fetchHistory(page, searchQuery, statusFilter);
      setSelectedTicket(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi gửi phản hồi');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 min-h-screen">
      {/* Title */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-foreground">
          Lịch Sử Sửa Chữa
        </h1>
        <p className="text-xs md:text-sm text-muted mt-1">
          Quản lý, tìm kiếm và theo dõi toàn bộ phiếu sửa chữa thiết bị của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground rounded-2xl text-xs font-bold transition"
          >
            <User className="w-4 h-4 text-primary" />
            <span>Thông tin cá nhân</span>
          </Link>
          <Link
            href="/profile/history"
            className="flex items-center gap-3 px-4 py-3 bg-primary text-white rounded-2xl text-xs font-bold shadow-md shadow-primary/20"
          >
            <History className="w-4 h-4" />
            <span>Lịch sử sửa chữa</span>
          </Link>
          <Link
            href="/profile/change-password"
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground rounded-2xl text-xs font-bold transition"
          >
            <Key className="w-4 h-4 text-primary" />
            <span>Đổi mật khẩu</span>
          </Link>
        </div>

        {/* Tickets List Area */}
        <div className="lg:col-span-3 space-y-6">

          {/* Search & Status Filter Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-4 shadow-md space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo Mã phiếu (FIX-XXXXX), Hãng, Model..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
                <Search className="w-4 h-4 text-muted absolute left-3 top-3" />
              </div>

              <div className="relative sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary appearance-none"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="TiepNhan">1. Đã tiếp nhận</option>
                  <option value="DangKiemTra">2. Đang kiểm tra</option>
                  <option value="DaChuanDoan">3. Đã chuẩn đoán</option>
                  <option value="ChoKhachXacNhan">4. Chờ khách xác nhận</option>
                  <option value="KhachDongY">5. Khách đồng ý sửa</option>
                  <option value="KhachTuChoi">6. Khách từ chối sửa</option>
                  <option value="DangSua">7. Đang sửa</option>
                  <option value="DaSuaXong">8. Đã sửa xong</option>
                  <option value="KiemTraChatLuong">9. Kiểm tra QC</option>
                  <option value="ChoKhachNhanMay">10. Chờ nhận máy</option>
                  <option value="DaThanhToan">11. Đã thanh toán</option>
                  <option value="HoanThanh">12. Hoàn thành</option>
                </select>
                <Filter className="w-4 h-4 text-muted absolute left-3 top-3 pointer-events-none" />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition cursor-pointer shrink-0"
              >
                Tìm Kiếm
              </button>
            </form>
          </div>

          {/* Tickets Cards */}
          {loading ? (
            <div className="py-12 text-center text-muted bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-6">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs">Đang tải danh sách lịch sử sửa chữa...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl space-y-3">
              <History className="w-10 h-10 text-muted mx-auto" />
              <h3 className="text-sm font-bold text-foreground">Không tìm thấy phiếu sửa chữa nào</h3>
              <p className="text-xs text-muted max-w-xs mx-auto">
                Không có dữ liệu khớp với bộ lọc hoặc bạn chưa có lịch sử sửa chữa nào.
              </p>
              <Link
                href="/booking"
                className="inline-block px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition shadow-md shadow-primary/20"
              >
                Đặt Lịch Sửa Chữa Ngay
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map(ticket => {
                const statusInfo = statusLabelMap[ticket.status] || { label: ticket.status, color: 'bg-slate-100 text-slate-800' };
                return (
                  <div
                    key={ticket.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-5 md:p-6 shadow-md hover:shadow-lg transition space-y-4"
                  >
                    <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-850 pb-3">
                      <div>
                        <span className="text-sm font-black text-primary">{ticket.id}</span>
                        <p className="text-[10px] text-muted font-semibold mt-0.5">Tiếp nhận: {formatDate(ticket.dateCreated)}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted block text-[10px]">Thiết bị & Hãng:</span>
                        <span className="font-bold text-foreground">{ticket.brand} {ticket.deviceModel} ({ticket.deviceType})</span>
                        {(ticket.appointmentDate || ticket.appointmentTime) && (
                          <p className="text-[10px] text-primary font-bold mt-1">
                            Lịch hẹn: {ticket.appointmentDate} {ticket.appointmentTime ? `• ${ticket.appointmentTime}` : ''}
                          </p>
                        )}
                        {ticket.branchName && (
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            Chi nhánh: {ticket.branchName}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-muted block text-[10px]">Tổng chi phí báo giá:</span>
                        <span className="font-black text-accent text-sm">
                          {ticket.totalPrice > 0 ? formatPrice(ticket.totalPrice) : 'Báo giá sau kiểm tra'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl text-xs space-y-0.5">
                      <span className="text-[9px] text-muted uppercase font-bold">Mô tả tình trạng lỗi:</span>
                      <p className="text-foreground font-medium truncate">{ticket.symptoms}</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                      {ticket.status === 'ChoKhachXacNhan' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRespondQuotation(ticket.id, 'approved')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Đồng ý sửa</span>
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Nhập lý do từ chối sửa (không bắt buộc):');
                              handleRespondQuotation(ticket.id, 'rejected', reason || undefined);
                            }}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Từ chối sửa</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted font-medium">
                          {ticket.status === 'HoanThanh' || ticket.status === 'DaThanhToan' ? `Hoàn thành ngày: ${formatDate(ticket.dateCompleted || ticket.dateCreated)}` : `Trạng thái: ${statusInfo.label}`}
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          <span>Chi tiết & Báo giá</span>
                        </button>
                        <Link
                          href={`/tracking?q=${ticket.id}`}
                          className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold flex items-center gap-1 transition"
                        >
                          <span>Tiến độ</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-4 text-xs font-semibold">
              <span className="text-muted">
                Tổng cộng {totalRecords} phiếu (Trang {page} / {totalPages})
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Trang trước</span>
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Trang sau</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* DETAIL MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl animate-fade-in relative">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-5 right-5 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>

            <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
              <span className="text-[10px] font-bold text-primary uppercase">Chi tiết phiếu sửa chữa</span>
              <h2 className="text-lg font-black text-foreground">Mã phiếu: {selectedTicket.id}</h2>
              <p className="text-xs text-muted">Thiết bị: {selectedTicket.brand} {selectedTicket.deviceModel}</p>
            </div>

            {/* Diagnosis section */}
            {selectedTicket.diagnosis && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 text-xs">
                <h4 className="font-bold text-foreground flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-primary" /> Kết quả kiểm tra chẩn đoán kỹ thuật
                </h4>
                <p><strong className="text-muted">Mô tả sự cố:</strong> {selectedTicket.diagnosis.symptoms || selectedTicket.symptoms}</p>
                <p><strong className="text-muted">Kết quả kiểm tra:</strong> {selectedTicket.diagnosis.inspection_result || 'Đang cập nhật'}</p>
                <p><strong className="text-muted">Nguyên nhân:</strong> {selectedTicket.diagnosis.root_cause || 'Đang cập nhật'}</p>
                <p><strong className="text-muted">Phương án xử lý:</strong> <span className="font-bold text-primary">{selectedTicket.diagnosis.proposed_solution || 'Đang cập nhật'}</span></p>
              </div>
            )}

            {/* Quotation itemized table */}
            {selectedTicket.quotation ? (
              <div className="space-y-3 text-xs">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">Bảng Giá Linh Kiện & Công Sửa Chữa</h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-850 text-muted uppercase text-[9px] font-bold">
                      <tr>
                        <th className="p-2.5">Tên linh kiện</th>
                        <th className="p-2.5 text-right">Đơn giá</th>
                        <th className="p-2.5 text-center">SL</th>
                        <th className="p-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {selectedTicket.quotation.items?.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-semibold text-foreground">{item.part_name}</td>
                          <td className="p-2.5 text-right">{formatPrice(Number(item.unit_price))}</td>
                          <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                          <td className="p-2.5 text-right font-bold">{formatPrice(Number(item.subtotal))}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/50 dark:bg-slate-950/50">
                        <td colSpan={3} className="p-2.5 text-right font-bold text-muted">Công sửa chữa:</td>
                        <td className="p-2.5 text-right font-bold">{formatPrice(Number(selectedTicket.quotation.labor_cost))}</td>
                      </tr>
                      {Number(selectedTicket.quotation.additional_cost) > 0 && (
                        <tr className="bg-slate-50/50 dark:bg-slate-950/50">
                          <td colSpan={3} className="p-2.5 text-right font-bold text-muted">Chi phí phát sinh:</td>
                          <td className="p-2.5 text-right font-bold">{formatPrice(Number(selectedTicket.quotation.additional_cost))}</td>
                        </tr>
                      )}
                      <tr className="bg-primary/10 font-black text-sm">
                        <td colSpan={3} className="p-3 text-right text-primary">TỔNG CHI PHÍ:</td>
                        <td className="p-3 text-right text-accent">{formatPrice(Number(selectedTicket.quotation.total_amount))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center text-muted text-[11px] pt-1">
                  <span><strong>Thời gian bảo hành:</strong> {selectedTicket.quotation.warranty || '6 tháng'}</span>
                  {selectedTicket.quotation.notes && <span><strong>Ghi chú:</strong> {selectedTicket.quotation.notes}</span>}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted italic">Chưa có bảng báo giá chi tiết cho phiếu này.</p>
            )}

            {/* Decision buttons inside modal if ChoKhachXacNhan */}
            {(selectedTicket.status === 'ChoKhachXacNhan' || selectedTicket.quotation?.customer_decision === 'pending') && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  Vui lòng xác nhận đồng ý hoặc từ chối sửa chữa đối với báo giá này:
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleRespondQuotation(selectedTicket.id, 'approved')}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>ĐỒNG Ý SỬA CHỮA</span>
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Nhập lý do từ chối (không bắt buộc):');
                      handleRespondQuotation(selectedTicket.id, 'rejected', reason || undefined);
                    }}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>TỪ CHỐI SỬA CHỮA</span>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}
