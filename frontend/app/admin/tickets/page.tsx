'use client';

import React, { useEffect, useState } from 'react';
import { 
  getAdminTickets, 
  updateTicketStatus, 
  updateTicketNotes, 
  saveDiagnosis, 
  saveQuotation, 
  getTicketHistory 
} from '@/lib/api/admin';
import { 
  Search, Save, X, Edit, Stethoscope, FileText, History, Plus, Trash2, 
  CheckCircle2, AlertTriangle, XCircle, Clock, Info, Wrench, ShieldCheck, DollarSign 
} from 'lucide-react';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');

  // Diagnosis Modal state
  const [diagnosisTicket, setDiagnosisTicket] = useState<any | null>(null);
  const [diagSymptoms, setDiagSymptoms] = useState('');
  const [diagResult, setDiagResult] = useState('');
  const [diagCause, setDiagCause] = useState('');
  const [diagSolution, setDiagSolution] = useState('');
  const [diagSubmitting, setDiagSubmitting] = useState(false);

  // Quotation Modal state
  const [quoteTicket, setQuoteTicket] = useState<any | null>(null);
  const [laborCost, setLaborCost] = useState<number>(100000);
  const [additionalCost, setAdditionalCost] = useState<number>(0);
  const [warranty, setWarranty] = useState<string>('6 tháng');
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [quoteParts, setQuoteParts] = useState<Array<{ part_name: string; unit_price: number; quantity: number }>>([
    { part_name: '', unit_price: 0, quantity: 1 }
  ]);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

  // History & Detail Modal state
  const [detailTicket, setDetailTicket] = useState<any | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const statusOptions = [
    { value: 'TiepNhan', label: '1. Đã tiếp nhận', color: 'bg-blue-100 text-blue-800' },
    { value: 'DangKiemTra', label: '2. Đang kiểm tra', color: 'bg-amber-100 text-amber-800' },
    { value: 'DaChuanDoan', label: '3. Đã chuẩn đoán', color: 'bg-purple-100 text-purple-800' },
    { value: 'ChoKhachXacNhan', label: '4. Chờ khách xác nhận', color: 'bg-orange-100 text-orange-800 font-bold' },
    { value: 'KhachDongY', label: '5. Khách đồng ý sửa', color: 'bg-emerald-100 text-emerald-800 font-bold' },
    { value: 'KhachTuChoi', label: '6. Khách từ chối sửa', color: 'bg-red-100 text-red-800 font-bold' },
    { value: 'DangSua', label: '7. Đang sửa', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'DaSuaXong', label: '8. Đã sửa xong', color: 'bg-teal-100 text-teal-800' },
    { value: 'KiemTraChatLuong', label: '9. Kiểm tra chất lượng (QC)', color: 'bg-cyan-100 text-cyan-800' },
    { value: 'ChoKhachNhanMay', label: '10. Chờ khách nhận máy', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'DaThanhToan', label: '11. Đã thanh toán', color: 'bg-sky-100 text-sky-800' },
    { value: 'HoanThanh', label: '12. Hoàn thành', color: 'bg-green-100 text-green-800 font-bold' },
  ];

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = () => {
    setLoading(true);
    getAdminTickets().then(data => {
      setTickets(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  const handleStatusChange = async (ticketIdStr: string, newStatus: string) => {
    try {
      const ticketId = parseInt(ticketIdStr.split('-')[1]);
      await updateTicketStatus(ticketId, newStatus);
      fetchTickets();
    } catch (error: any) {
      alert(error.message || 'Lỗi cập nhật trạng thái');
    }
  };

  const handleSaveNote = async (ticketIdStr: string) => {
    try {
      const ticketId = parseInt(ticketIdStr.split('-')[1]);
      await updateTicketNotes(ticketId, editNoteContent);
      setEditingNoteId(null);
      fetchTickets();
    } catch (error: any) {
      alert(error.message || 'Lỗi cập nhật ghi chú');
    }
  };

  // Open Diagnosis Modal
  const openDiagnosisModal = (ticket: any) => {
    setDiagnosisTicket(ticket);
    setDiagSymptoms(ticket.diagnosis?.symptoms || ticket.symptoms || '');
    setDiagResult(ticket.diagnosis?.inspection_result || '');
    setDiagCause(ticket.diagnosis?.root_cause || '');
    setDiagSolution(ticket.diagnosis?.proposed_solution || '');
  };

  const handleSaveDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosisTicket) return;
    const numericId = parseInt(diagnosisTicket.id.split('-')[1]);
    setDiagSubmitting(true);
    try {
      await saveDiagnosis(numericId, {
        symptoms: diagSymptoms,
        inspection_result: diagResult,
        root_cause: diagCause,
        proposed_solution: diagSolution,
      });
      setDiagnosisTicket(null);
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Lưu chẩn đoán thất bại');
    } finally {
      setDiagSubmitting(false);
    }
  };

  // Open Quotation Modal
  const openQuotationModal = (ticket: any) => {
    setQuoteTicket(ticket);
    if (ticket.quotation) {
      setLaborCost(Number(ticket.quotation.labor_cost) || 100000);
      setAdditionalCost(Number(ticket.quotation.additional_cost) || 0);
      setWarranty(ticket.quotation.warranty || '6 tháng');
      setQuoteNotes(ticket.quotation.notes || '');
      if (ticket.quotation.items && ticket.quotation.items.length > 0) {
        setQuoteParts(ticket.quotation.items.map((it: any) => ({
          part_name: it.part_name,
          unit_price: Number(it.unit_price),
          quantity: Number(it.quantity)
        })));
      } else {
        setQuoteParts([{ part_name: '', unit_price: 0, quantity: 1 }]);
      }
    } else {
      setLaborCost(100000);
      setAdditionalCost(0);
      setWarranty('6 tháng');
      setQuoteNotes('');
      setQuoteParts([{ part_name: '', unit_price: 0, quantity: 1 }]);
    }
  };

  const addPartRow = () => {
    setQuoteParts([...quoteParts, { part_name: '', unit_price: 0, quantity: 1 }]);
  };

  const removePartRow = (idx: number) => {
    setQuoteParts(quoteParts.filter((_, i) => i !== idx));
  };

  const updatePartRow = (idx: number, field: string, val: any) => {
    const updated = [...quoteParts];
    updated[idx] = { ...updated[idx], [field]: val };
    setQuoteParts(updated);
  };

  const calculateTotal = () => {
    const partsSum = quoteParts.reduce((sum, p) => sum + (Number(p.unit_price) || 0) * (Number(p.quantity) || 1), 0);
    return partsSum + Number(laborCost || 0) + Number(additionalCost || 0);
  };

  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteTicket) return;
    if (quoteParts.some(p => !p.part_name.trim())) {
      alert('Vui lòng nhập tên đầy đủ cho tất cả linh kiện!');
      return;
    }
    const numericId = parseInt(quoteTicket.id.split('-')[1]);
    setQuoteSubmitting(true);
    try {
      await saveQuotation(numericId, {
        labor_cost: Number(laborCost),
        additional_cost: Number(additionalCost),
        warranty,
        notes: quoteNotes,
        parts: quoteParts.map(p => ({
          part_name: p.part_name.trim(),
          unit_price: Number(p.unit_price),
          quantity: Number(p.quantity)
        }))
      });
      setQuoteTicket(null);
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Lập báo giá thất bại');
    } finally {
      setQuoteSubmitting(false);
    }
  };

  // Open Detail / History Modal
  const openHistoryModal = async (ticket: any) => {
    setDetailTicket(ticket);
    const numericId = parseInt(ticket.id.split('-')[1]);
    setHistoryLoading(true);
    try {
      const historyData = await getTicketHistory(numericId);
      setHistoryLogs(historyData);
    } catch (err) {
      console.error(err);
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Filter tab filtering
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.id.toLowerCase().includes(search.toLowerCase()) || 
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.phoneNumber.includes(search);
      
    if (!matchesSearch) return false;

    if (activeTab === 'WAITING_DIAG') return ['TiepNhan', 'DangKiemTra'].includes(t.status);
    if (activeTab === 'WAITING_CONFIRM') return t.status === 'ChoKhachXacNhan';
    if (activeTab === 'REJECTED') return t.status === 'KhachTuChoi';
    if (activeTab === 'REPAIRING') return ['KhachDongY', 'DangSua', 'DaSuaXong', 'KiemTraChatLuong'].includes(t.status);
    if (activeTab === 'COMPLETED') return ['ChoKhachNhanMay', 'DaThanhToan', 'HoanThanh'].includes(t.status);
    
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">Quản lý Quy Trình Sửa Chữa</h1>
          <p className="text-xs text-slate-500 mt-1">Chẩn đoán lỗi, báo giá, chờ khách xác nhận và theo dõi lịch sử xử lý.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Tìm mã phiếu, SĐT, Tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary text-sm shadow-sm"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'ALL', label: 'Tất cả phiếu' },
          { id: 'WAITING_DIAG', label: 'Chờ chẩn đoán' },
          { id: 'WAITING_CONFIRM', label: 'Chờ khách xác nhận' },
          { id: 'REJECTED', label: 'Khách từ chối' },
          { id: 'REPAIRING', label: 'Đang sửa & QC' },
          { id: 'COMPLETED', label: 'Hoàn thành / Đã nhận' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Mã Phiếu</th>
                <th className="px-6 py-4">Khách Hàng</th>
                <th className="px-6 py-4">Thiết Bị</th>
                <th className="px-6 py-4">Trạng Thái & Tiến Độ</th>
                <th className="px-6 py-4">Báo Giá & Chẩn Đoán</th>
                <th className="px-6 py-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Đang tải dữ liệu phiếu sửa chữa...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Không tìm thấy phiếu sửa chữa nào khớp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredTickets.map(ticket => {
                  const currentOpt = statusOptions.find(opt => opt.value === ticket.status);
                  return (
                    <tr key={ticket.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      
                      {/* Mã Phiếu */}
                      <td className="px-6 py-4">
                        <span className="font-bold text-primary text-base">{ticket.id}</span>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(ticket.dateCreated).toLocaleDateString('vi-VN')}</p>
                      </td>

                      {/* Khách Hàng */}
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{ticket.customerName}</p>
                        <p className="text-xs text-slate-500">{ticket.phoneNumber}</p>
                      </td>

                      {/* Thiết Bị */}
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{ticket.brand} {ticket.deviceModel}</p>
                        <p className="text-xs text-slate-500 truncate max-w-xs" title={ticket.symptoms}>Lỗi: {ticket.symptoms}</p>
                      </td>

                      {/* Trạng Thái */}
                      <td className="px-6 py-4">
                        <select
                          value={ticket.status}
                          onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                          className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary outline-none"
                        >
                          {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        {ticket.status === 'KhachTuChoi' && (
                          <span className="block mt-1 text-[10px] text-red-600 font-bold">Khách từ chối (Giữ nguyên)</span>
                        )}
                        {ticket.status === 'KhachDongY' && (
                          <span className="block mt-1 text-[10px] text-emerald-600 font-bold">Đã đồng ý - Có thể chuyển Đang sửa</span>
                        )}
                      </td>

                      {/* Báo giá & Chẩn đoán summary */}
                      <td className="px-6 py-4 text-xs">
                        {ticket.quotation ? (
                          <div>
                            <span className="font-bold text-accent text-sm block">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ticket.quotation.total_amount)}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              ticket.quotation.customer_decision === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                              ticket.quotation.customer_decision === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {ticket.quotation.customer_decision === 'approved' ? 'Khách đã duyệt' :
                               ticket.quotation.customer_decision === 'rejected' ? 'Khách đã từ chối' : 'Chờ phản hồi'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa lập báo giá</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openDiagnosisModal(ticket)}
                            title="Chẩn đoán lỗi"
                            className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:hover:bg-purple-900/50 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Stethoscope className="w-4 h-4" />
                            <span>Chẩn đoán</span>
                          </button>

                          <button
                            onClick={() => openQuotationModal(ticket)}
                            title="Lập báo giá"
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Báo giá</span>
                          </button>

                          <button
                            onClick={() => openHistoryModal(ticket)}
                            title="Xem lịch sử & chi tiết"
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          >
                            <History className="w-4 h-4" />
                            <span>Lịch sử</span>
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. DIAGNOSIS MODAL */}
      {diagnosisTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fade-in border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Form Chẩn Đoán Lỗi ({diagnosisTicket.id})</h3>
              </div>
              <button onClick={() => setDiagnosisTicket(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDiagnosis} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mô tả lỗi khách cung cấp</label>
                <textarea
                  value={diagSymptoms}
                  onChange={(e) => setDiagSymptoms(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  rows={2}
                  placeholder="Triệu chứng hư hỏng khi nhận máy..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Kết quả kiểm tra kỹ thuật <span className="text-red-500">*</span></label>
                <textarea
                  required
                  value={diagResult}
                  onChange={(e) => setDiagResult(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  rows={2}
                  placeholder="Ví dụ: Màn hình không hiển thị, IC nguồn hỏng..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nguyên nhân <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={diagCause}
                  onChange={(e) => setDiagCause(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Ví dụ: Rơi vỡ, chập điện do nước vào..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Hướng sửa chữa đề xuất <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={diagSolution}
                  onChange={(e) => setDiagSolution(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Ví dụ: Thay bộ màn hình Oled zin, ép kính lại..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDiagnosisTicket(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={diagSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20"
                >
                  {diagSubmitting ? 'Đang lưu...' : 'Lưu Chẩn Đoán'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. QUOTATION MODAL */}
      {quoteTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Lập Báo Giá Sửa Chữa ({quoteTicket.id})</h3>
              </div>
              <button onClick={() => setQuoteTicket(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuotation} className="space-y-4">
              
              {/* Dynamic Parts Table */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Danh Sách Linh Kiện Thay Thế <span className="text-red-500">*</span></label>
                  <button
                    type="button"
                    onClick={addPartRow}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm linh kiện
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {quoteParts.map((part, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                      <input
                        type="text"
                        required
                        placeholder="Tên linh kiện (ví dụ: Màn hình OLED iPhone 13)"
                        value={part.part_name}
                        onChange={(e) => updatePartRow(idx, 'part_name', e.target.value)}
                        className="flex-1 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <input
                        type="number"
                        min="0"
                        required
                        placeholder="Đơn giá (VNĐ)"
                        value={part.unit_price}
                        onChange={(e) => updatePartRow(idx, 'unit_price', Number(e.target.value))}
                        className="w-32 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none text-right"
                      />
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="SL"
                        value={part.quantity}
                        onChange={(e) => updatePartRow(idx, 'quantity', Number(e.target.value))}
                        className="w-16 p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none text-center"
                      />
                      {quoteParts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePartRow(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Labor & Extra Costs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Công sửa chữa (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={laborCost}
                    onChange={(e) => setLaborCost(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Chi phí phát sinh (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={additionalCost}
                    onChange={(e) => setAdditionalCost(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Bảo hành</label>
                  <input
                    type="text"
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., 6 tháng"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ghi chú báo giá</label>
                <input
                  type="text"
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ghi chú thêm cho khách hàng..."
                />
              </div>

              {/* Real-time Total sum banner */}
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex justify-between items-center">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">TỔNG CỘNG BÁO GIÁ:</span>
                <span className="text-lg font-black text-blue-700 dark:text-blue-300">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(calculateTotal())}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuoteTicket(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={quoteSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  {quoteSubmitting ? 'Đang gửi...' : 'Gửi Báo Giá Cho Khách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. HISTORY & DETAIL MODAL */}
      {detailTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Lịch Sử & Thông Tin Phiếu ({detailTicket.id})</h3>
              </div>
              <button onClick={() => setDetailTicket(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Diagnosis summary if present */}
            {detailTicket.diagnosis && (
              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-150 dark:border-purple-900/50 rounded-2xl p-4 space-y-2 text-xs">
                <h4 className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-purple-600" /> Kết Quả Chẩn Đoán Kỹ Thuật
                </h4>
                <p><strong>Kết quả kiểm tra:</strong> {detailTicket.diagnosis.inspection_result}</p>
                <p><strong>Nguyên nhân:</strong> {detailTicket.diagnosis.root_cause}</p>
                <p><strong>Phương án sửa:</strong> {detailTicket.diagnosis.proposed_solution}</p>
              </div>
            )}

            {/* Quotation summary if present */}
            {detailTicket.quotation && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-150 dark:border-blue-900/50 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-blue-200/50 pb-2">
                  <h4 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" /> Chi Tiết Báo Giá
                  </h4>
                  <span className="font-black text-blue-700 text-sm">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(detailTicket.quotation.total_amount)}
                  </span>
                </div>
                <div className="space-y-1 pt-1">
                  {detailTicket.quotation.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span>• {item.part_name} (x{item.quantity})</span>
                      <span className="font-semibold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.subtotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200/50">
                    <span>Công sửa chữa:</span>
                    <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(detailTicket.quotation.labor_cost)}</span>
                  </div>
                  {Number(detailTicket.quotation.additional_cost) > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Chi phí phát sinh:</span>
                      <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(detailTicket.quotation.additional_cost)}</span>
                    </div>
                  )}
                  <p className="pt-2 text-slate-600"><strong>Bảo hành:</strong> {detailTicket.quotation.warranty || 'Không'}</p>
                  <p className="text-slate-600"><strong>Trạng thái khách phản hồi:</strong> <span className="font-bold uppercase">{detailTicket.quotation.customer_decision}</span> {detailTicket.quotation.confirmed_by && `(bởi ${detailTicket.quotation.confirmed_by})`}</p>
                </div>
              </div>
            )}

            {/* Audit History Timeline */}
            <div>
              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wider">Lịch Sử Nhật Ký Xử Lý (Audit History)</h4>
              {historyLoading ? (
                <p className="text-xs text-slate-400">Đang tải nhật ký...</p>
              ) : historyLogs.length === 0 ? (
                <p className="text-xs text-slate-400">Chưa có lịch sử recorded.</p>
              ) : (
                <div className="space-y-3 relative before:absolute before:top-2 before:bottom-2 before:left-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 pl-8">
                  {historyLogs.map((log, idx) => (
                    <div key={idx} className="relative text-xs space-y-0.5">
                      <div className="absolute -left-8 top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-white dark:ring-slate-900"></div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{log.action} ({log.status})</span>
                        <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                      </div>
                      <p className="text-slate-500 italic">{log.details}</p>
                      <p className="text-[10px] text-slate-400">Thực hiện bởi: <span className="font-semibold">{log.actor_name || 'Hệ thống'}</span> ({log.actor_role})</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setDetailTicket(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
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

