'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/protected-route';
import { 
  Wrench, Search, Clock, CheckCircle2, AlertTriangle, Play, CheckSquare, 
  FileText, ShieldCheck, User, Smartphone, RefreshCw, Plus, Trash2, ArrowRight
} from 'lucide-react';
import { 
  getTechnicianWorkboard, 
  startRepair, 
  updateRepairExecution, 
  completeRepair, 
  submitQCCheck 
} from '@/lib/api/technician';
import { formatPrice, getStatusBadgeConfig } from '@/lib/format';

export default function TechnicianWorkboardPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active modal ticket state
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [repairResultInput, setRepairResultInput] = useState<string>('');
  const [actualPartsInput, setActualPartsInput] = useState<Array<{ part_name: string; unit_price: number; quantity: number }>>([]);
  const [qcNoteInput, setQcNoteInput] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWorkboard();
  }, [activeTab]);

  const fetchWorkboard = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getTechnicianWorkboard(activeTab);
      setTickets(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Không thể tải danh sách công việc.');
    } finally {
      setLoading(false);
    }
  };

  const openTicketDetail = (ticket: any) => {
    setSelectedTicket(ticket);
    setRepairResultInput(ticket.repair_result || '');
    setQcNoteInput(ticket.qc_note || '');
    if (ticket.actual_parts && ticket.actual_parts.length > 0) {
      setActualPartsInput(ticket.actual_parts.map((p: any) => ({
        part_name: p.part_name,
        unit_price: Number(p.unit_price),
        quantity: Number(p.quantity)
      })));
    } else if (ticket.quotation && ticket.quotation.items && ticket.quotation.items.length > 0) {
      setActualPartsInput(ticket.quotation.items.map((it: any) => ({
        part_name: it.part_name,
        unit_price: Number(it.unit_price),
        quantity: Number(it.quantity)
      })));
    } else {
      setActualPartsInput([]);
    }
  };

  const handleStartRepair = async (numericId: number) => {
    setSubmitting(true);
    try {
      const updated = await startRepair(numericId);
      setSelectedTicket(updated);
      fetchWorkboard();
    } catch (err: any) {
      alert(err.message || 'Không thể bắt đầu sửa chữa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveExecution = async () => {
    if (!selectedTicket) return;
    setSubmitting(true);
    try {
      const updated = await updateRepairExecution(selectedTicket.numeric_id, {
        repair_result: repairResultInput,
        parts_used: actualPartsInput.filter(p => p.part_name.trim() !== '')
      });
      setSelectedTicket(updated);
      fetchWorkboard();
      alert('Đã cập nhật thông tin linh kiện & kết quả sửa chữa!');
    } catch (err: any) {
      alert(err.message || 'Lỗi cập nhật');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteRepair = async () => {
    if (!selectedTicket) return;
    if (!repairResultInput.trim()) {
      alert('Vui lòng ghi nhận kết quả sửa chữa thực tế trước khi bấm hoàn thành!');
      return;
    }
    setSubmitting(true);
    try {
      // First save execution details
      await updateRepairExecution(selectedTicket.numeric_id, {
        repair_result: repairResultInput,
        parts_used: actualPartsInput.filter(p => p.part_name.trim() !== '')
      });
      // Then complete repair
      const updated = await completeRepair(selectedTicket.numeric_id);
      setSelectedTicket(updated);
      fetchWorkboard();
      alert('Đã hoàn thành sửa chữa! Phiếu đã chuyển sang chờ QC kiểm tra.');
    } catch (err: any) {
      alert(err.message || 'Không thể hoàn thành sửa chữa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQCCheck = async (result: 'passed' | 'failed') => {
    if (!selectedTicket) return;
    if (result === 'failed' && !qcNoteInput.trim()) {
      alert('Vui lòng nhập lý do QC không đạt để kỹ thuật viên biết sửa lại!');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await submitQCCheck(selectedTicket.numeric_id, {
        result,
        note: qcNoteInput
      });
      setSelectedTicket(updated);
      fetchWorkboard();
      alert(result === 'passed' ? 'Xác nhận QC ĐẠT! Phiếu đã sẵn sàng giao máy.' : 'QC KHÔNG ĐẠT. Đã gửi yêu cầu sửa lại.');
    } catch (err: any) {
      alert(err.message || 'Không thể cập nhật kết quả QC');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper calculation
  const calculateActualPartsTotal = () => {
    return actualPartsInput.reduce((sum, p) => sum + (Number(p.unit_price) || 0) * (Number(p.quantity) || 1), 0);
  };

  const filteredTickets = tickets.filter(t => {
    const term = search.toLowerCase();
    return (
      t.id.toLowerCase().includes(term) ||
      t.customerName.toLowerCase().includes(term) ||
      t.deviceModel.toLowerCase().includes(term) ||
      t.symptoms.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'KhachDongY':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold rounded-full border border-emerald-300">Chờ bắt đầu sửa</span>;
      case 'DangSua':
        return <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-bold rounded-full border border-indigo-300 animate-pulse">Đang sửa chữa</span>;
      case 'DaSuaXong':
        return <span className="px-2.5 py-1 bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-xs font-bold rounded-full border border-teal-300">Đã sửa - Chờ QC</span>;
      case 'KiemTraChatLuong':
        return <span className="px-2.5 py-1 bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 text-xs font-bold rounded-full border border-cyan-300">Đang QC</span>;
      case 'HoanThanh':
      case 'DaThanhToan':
        return <span className="px-2.5 py-1 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 text-xs font-bold rounded-full border border-green-300">Hoàn thành</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold rounded-full">{status}</span>;
    }
  };

  return (
    <ProtectedRoute allowedRoles={['technician', 'admin']}>
      <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen space-y-6">
        
        {/* Header Title & Summary Cards */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground flex items-center gap-2.5">
              <Wrench className="w-7 h-7 text-primary" />
              Technician Workboard
            </h1>
            <p className="text-xs text-muted mt-1">
              Bảng quản lý quy trình thực hiện sửa chữa thiết bị, ghi nhận linh kiện & kiểm tra QC.
            </p>
          </div>
          <button
            onClick={fetchWorkboard}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground text-xs font-bold rounded-xl transition flex items-center gap-1.5 self-start cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới bảng việc</span>
          </button>
        </div>

        {/* Status Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'KhachDongY', label: '1. Chờ bắt đầu' },
              { id: 'DangSua', label: '2. Đang sửa' },
              { id: 'DaSuaXong', label: '3. Đã sửa' },
              { id: 'HoanThanh', label: '4. Hoàn thành' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
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
              placeholder="Tìm theo mã FIX-, tên, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none focus:border-primary text-foreground"
            />
          </div>
        </div>

        {/* Tickets Grid / List */}
        {loading ? (
          <div className="p-12 text-center text-xs text-muted">Đang tải danh sách việc...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
            <CheckSquare className="w-8 h-8 text-muted mx-auto" />
            <p className="text-xs font-bold text-foreground">Không có phiếu sửa chữa nào trong danh sách.</p>
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
                    <span className="text-xs font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg">{t.id}</span>
                    {getStatusBadge(t.status)}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground">{t.deviceModel} ({t.brand})</h3>
                    <p className="text-xs text-muted font-medium mt-0.5">Khách: {t.customerName} - {t.phoneNumber}</p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl space-y-1 text-xs">
                    <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Triệu chứng & Lỗi chẩn đoán</span>
                    <p className="text-foreground font-medium line-clamp-2">{t.inspection_result || t.symptoms}</p>
                  </div>

                  {t.quotation && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-850">
                      <span className="text-muted">Giá đã duyệt:</span>
                      <span className="font-extrabold text-accent">{formatPrice(t.quotation.total_amount)}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => openTicketDetail(t)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Mở chi tiết & Xử lý</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TICKET DETAIL & EXECUTION MODAL */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 md:p-8 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
              
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-150 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-primary">{selectedTicket.id}</span>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  <h2 className="text-lg font-bold text-foreground mt-1">{selectedTicket.deviceModel} - {selectedTicket.customerName} ({selectedTicket.phoneNumber})</h2>
                </div>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-muted text-xs font-bold cursor-pointer"
                >
                  Đóng ✕
                </button>
              </div>

              {/* Step 1: Start Repair Action */}
              {selectedTicket.status === 'KhachDongY' && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Khách hàng đã đồng ý báo giá. Bấm bắt đầu để tiếp nhận sửa chữa!</span>
                  </div>
                  <button
                    onClick={() => handleStartRepair(selectedTicket.numeric_id)}
                    disabled={submitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>BẮT ĐẦU SỬA CHỮA NGAY</span>
                  </button>
                </div>
              )}

              {/* Diagnosis Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Thông Tin Chẩn Đoán Lỗi</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-850">
                  <div>
                    <span className="text-muted block font-semibold">Kết quả kiểm tra:</span>
                    <p className="text-foreground mt-0.5">{selectedTicket.inspection_result || 'Chưa có'}</p>
                  </div>
                  <div>
                    <span className="text-muted block font-semibold">Nguyên nhân lỗi:</span>
                    <p className="text-foreground mt-0.5">{selectedTicket.root_cause || 'Chưa có'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted block font-semibold">Hướng sửa chữa:</span>
                    <p className="text-foreground mt-0.5">{selectedTicket.proposed_solution || 'Chưa có'}</p>
                  </div>
                </div>
              </div>

              {/* Actual Parts Used Form */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Linh Kiện Thực Tế Đã Sử Dụng</h3>
                  {selectedTicket.status === 'DangSua' && (
                    <button
                      onClick={() => setActualPartsInput([...actualPartsInput, { part_name: '', unit_price: 0, quantity: 1 }])}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-lg text-primary flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm linh kiện
                    </button>
                  )}
                </div>

                {actualPartsInput.length === 0 ? (
                  <p className="text-xs text-muted italic">Chưa ghi nhận linh kiện sửa chữa thực tế.</p>
                ) : (
                  <div className="space-y-2">
                    {actualPartsInput.map((p, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Tên linh kiện"
                          disabled={selectedTicket.status !== 'DangSua'}
                          value={p.part_name}
                          onChange={(e) => {
                            const updated = [...actualPartsInput];
                            updated[idx].part_name = e.target.value;
                            setActualPartsInput(updated);
                          }}
                          className="flex-2 p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-xs outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Đơn giá"
                          disabled={selectedTicket.status !== 'DangSua'}
                          value={p.unit_price}
                          onChange={(e) => {
                            const updated = [...actualPartsInput];
                            updated[idx].unit_price = Number(e.target.value);
                            setActualPartsInput(updated);
                          }}
                          className="w-28 p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-xs outline-none"
                        />
                        <input
                          type="number"
                          min="1"
                          placeholder="SL"
                          disabled={selectedTicket.status !== 'DangSua'}
                          value={p.quantity}
                          onChange={(e) => {
                            const updated = [...actualPartsInput];
                            updated[idx].quantity = Number(e.target.value);
                            setActualPartsInput(updated);
                          }}
                          className="w-16 p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl text-xs outline-none"
                        />
                        {selectedTicket.status === 'DangSua' && (
                          <button
                            type="button"
                            onClick={() => setActualPartsInput(actualPartsInput.filter((_, i) => i !== idx))}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="text-right text-xs font-bold text-foreground pt-1">
                      Tổng tiền linh kiện thực tế: <span className="text-accent">{formatPrice(calculateActualPartsTotal())}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Repair Result Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Kết Quả Sửa Chữa Thực Tế (*)</label>
                <textarea
                  rows={3}
                  disabled={selectedTicket.status !== 'DangSua'}
                  placeholder="Ghi rõ các hạng mục kỹ thuật đã xử lý (e.g. Đã thay màn hình OLED mới, ép kính, test cảm ứng chuẩn)..."
                  value={repairResultInput}
                  onChange={(e) => setRepairResultInput(e.target.value)}
                  className="w-full p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-2xl text-xs outline-none focus:border-primary text-foreground"
                />
              </div>

              {/* QC Section */}
              {(selectedTicket.status === 'DaSuaXong' || selectedTicket.status === 'KiemTraChatLuong') && (
                <div className="p-4 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 rounded-2xl space-y-3">
                  <h3 className="text-xs font-bold text-cyan-900 dark:text-cyan-300 flex items-center gap-1.5 uppercase">
                    <ShieldCheck className="w-4 h-4 text-cyan-600" /> Kiểm Tra Chất Lượng (QC Check)
                  </h3>
                  <textarea
                    rows={2}
                    placeholder="Ghi chú kết quả kiểm tra QC (Ghi rõ lý do nếu KHÔNG ĐẠT)..."
                    value={qcNoteInput}
                    onChange={(e) => setQcNoteInput(e.target.value)}
                    className="w-full p-2.5 border border-cyan-200 dark:border-cyan-800 bg-white dark:bg-slate-950 rounded-xl text-xs outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleQCCheck('passed')}
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> QC ĐẠT (Hoàn tất)
                    </button>
                    <button
                      onClick={() => handleQCCheck('failed')}
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4" /> QC KHÔNG ĐẠT (Sửa lại)
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150 dark:border-slate-800">
                {selectedTicket.status === 'DangSua' && (
                  <>
                    <button
                      onClick={handleSaveExecution}
                      disabled={submitting}
                      className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Lưu Tiến Độ
                    </button>
                    <button
                      onClick={handleCompleteRepair}
                      disabled={submitting}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      HOÀN THÀNH SỬA CHỮA
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
