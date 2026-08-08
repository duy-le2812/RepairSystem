'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/protected-route';
import { 
  Search, ClipboardList, Printer, Download,
  AlertTriangle, CheckCircle, Hammer, Info, Timer 
} from 'lucide-react';
import ApiClient from '../../lib/api/client';
import { OrderItem } from '../../types';

function TrackingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const [inputVal, setInputVal] = useState(queryParam);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  async function handleSearch(searchQuery: string) {
    const term = searchQuery.trim();
    if (!term) return;

    setLoading(true);
    setSearched(true);
    try {
      const data = await ApiClient.getOrdersByContact(term);
      setOrders(data);
      if (data.length > 0) {
        setSelectedOrder(data[0]); // default to first match
      } else {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputVal(queryParam);
    if (queryParam.trim()) {
      handleSearch(queryParam);
    } else {
      setOrders([]);
      setSelectedOrder(null);
      setSearched(false);
    }
  }, [queryParam]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    
    // Push query to URL search parameters
    const params = new URLSearchParams();
    params.set('q', inputVal.trim());
    router.push(`/tracking?${params.toString()}`);
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Status step styling maps
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received': return ClipboardList;
      case 'inspecting': return Info;
      case 'waiting_parts': return Timer;
      case 'repairing': return Hammer;
      case 'completed': return CheckCircle;
      default: return ClipboardList;
    }
  };

  const printTicket = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 min-h-screen">
      
      {/* 1. Page Title */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-8 no-print">
        <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground">
          Tra Cứu Tiến Độ Sửa Chữa
        </h1>
        <p className="text-muted text-xs md:text-sm mt-2">
          Nhập số điện thoại đặt lịch hoặc Mã đơn hàng (ví dụ: <span className="text-primary font-bold">FIX-12345</span> hoặc số <span className="text-primary font-bold">0987654321</span>) để theo dõi linh kiện và chẩn đoán lỗi trực tuyến.
        </p>
      </div>

      {/* 2. Search Input bar */}
      <div className="max-w-xl mx-auto mb-10 no-print">
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Nhập mã đơn hàng FIX-xxxxx hoặc số điện thoại..."
              className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 rounded-2xl text-xs text-foreground placeholder:text-muted/70 outline-none focus:border-primary shadow-sm"
            />
            <Search className="w-5 h-5 text-muted absolute left-3 top-3.5" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-primary hover:bg-primary-hover disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-muted text-white text-xs font-bold rounded-2xl transition cursor-pointer shadow-md shadow-primary/10 active:scale-95 shrink-0"
          >
            {loading ? 'Đang tra...' : 'Tra cứu'}
          </button>
        </form>
      </div>

      {/* 3. Search Results panel */}
      {loading ? (
        <div className="py-12 text-center text-muted no-print">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs">Hệ thống đang quét sổ dữ liệu chi nhánh...</p>
        </div>
      ) : searched ? (
        orders.length > 0 ? (
          <div className="space-y-6">
            
            {/* Multiple orders filter tab in case lookup matches phone number */}
            {orders.length > 1 && (
              <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-850 rounded-xl max-w-md no-print">
                {orders.map((ord) => (
                  <button
                    key={ord.id}
                    onClick={() => setSelectedOrder(ord)}
                    className={`flex-1 py-2 px-3 rounded-lg text-center text-xs font-bold transition cursor-pointer ${
                      selectedOrder?.id === ord.id 
                        ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' 
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Mã {ord.id} ({ord.deviceModel})
                  </button>
                ))}
              </div>
            )}

            {/* Detailed order report */}
            {selectedOrder && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Side: Receipt Invoice Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-6 shadow-xl space-y-6 print:border-none print:shadow-none print:p-0 print:col-span-3">
                  <div className="border-b border-slate-100 dark:border-slate-850 pb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-foreground">Phiếu Bảo Hành & Sửa Chữa</h2>
                      <span className="text-[10px] text-muted font-bold block mt-0.5">Mã đơn: {selectedOrder.id}</span>
                    </div>
                    
                    <span className="no-print inline-block px-3 py-1 bg-primary-light dark:bg-primary-light/10 text-primary rounded-full text-[10px] font-bold border border-primary/20 uppercase">
                      {selectedOrder.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                    </span>
                  </div>

                  {/* Customer information */}
                  <div className="space-y-3.5 text-xs text-foreground/95">
                    <div className="grid grid-cols-2">
                      <span className="text-muted">Khách hàng:</span>
                      <span className="font-bold text-right">{selectedOrder.customerName}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span className="text-muted">Điện thoại:</span>
                      <span className="font-bold text-right">{selectedOrder.phoneNumber}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span className="text-muted">Ngày tiếp nhận:</span>
                      <span className="text-right">{formatDate(selectedOrder.dateCreated)}</span>
                    </div>
                    <div className="grid grid-cols-2">
                      <span className="text-muted">Dòng thiết bị:</span>
                      <span className="font-bold text-right">{selectedOrder.brand} {selectedOrder.deviceModel}</span>
                    </div>
                    <div className="grid grid-cols-2 border-t border-slate-100 dark:border-slate-850 pt-3">
                      <span className="text-muted font-bold">Tổng chi phí sửa:</span>
                      <span className="font-black text-right text-accent text-sm">
                        {selectedOrder.totalPrice > 0 ? formatPrice(selectedOrder.totalPrice) : 'Báo giá sau kiểm tra'}
                      </span>
                    </div>
                  </div>

                  {/* Description of faults */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl space-y-1">
                    <span className="text-[9px] text-muted uppercase font-bold tracking-wider">Yêu cầu sửa chữa & Tình trạng</span>
                    <p className="text-xs text-foreground leading-normal font-medium">{selectedOrder.symptoms}</p>
                  </div>

                  {/* Action buttons (hidden on print) */}
                  <div className="flex gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-850 no-print">
                    <button
                      onClick={printTicket}
                      className="flex-1 py-2 px-3 border border-slate-350 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-foreground transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Printer className="w-4 h-4 text-primary" />
                      <span>In phiếu</span>
                    </button>
                    <button
                      onClick={() => alert('Đang tạo tệp PDF báo cáo gửi qua thiết bị...')}
                      className="flex-1 py-2 px-3 border border-slate-350 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-foreground transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Download className="w-4 h-4 text-primary" />
                      <span>Tải về</span>
                    </button>
                  </div>
                </div>

                {/* Right Side: Timeline Progress Step Indicators & Quotation Decision */}
                <div className="lg:col-span-2 space-y-6 print:hidden">
                  
                  {/* QUOTATION & CUSTOMER APPROVAL CARD */}
                  {selectedOrder.quotation && (
                    <div className="bg-white dark:bg-slate-900 border-2 border-primary/30 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 animate-fade-in">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-4">
                        <div>
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Xác Nhận Phương Án</span>
                          <h3 className="text-base font-black text-foreground">Báo Giá Sửa Chữa & Chẩn Đoán Lỗi</h3>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                          selectedOrder.quotation.customer_decision === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          selectedOrder.quotation.customer_decision === 'rejected' ? 'bg-red-100 text-red-800 border border-red-300' :
                          'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                        }`}>
                          {selectedOrder.quotation.customer_decision === 'approved' ? '✓ Đã đồng ý sửa' :
                           selectedOrder.quotation.customer_decision === 'rejected' ? '✕ Đã từ chối sửa' : '⏳ Chờ bạn xác nhận'}
                        </span>
                      </div>

                      {/* Diagnosis Info */}
                      {selectedOrder.diagnosis && (
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 text-xs">
                          <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                            <Info className="w-4 h-4 text-primary" /> Kết Quả Kiểm Tra Kỹ Thuật
                          </h4>
                          <p><strong className="text-muted">Mô tả lỗi:</strong> {selectedOrder.diagnosis.symptoms || selectedOrder.symptoms}</p>
                          <p><strong className="text-muted">Kết quả kiểm tra:</strong> {selectedOrder.diagnosis.inspection_result}</p>
                          <p><strong className="text-muted">Nguyên nhân:</strong> {selectedOrder.diagnosis.root_cause}</p>
                          <p><strong className="text-muted">Hướng xử lý đề xuất:</strong> <span className="font-bold text-primary">{selectedOrder.diagnosis.proposed_solution}</span></p>
                        </div>
                      )}

                      {/* Itemized Parts Breakdown Table */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Chi Tiết Bảng Giá Linh Kiện & Dịch Vụ</h4>
                        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-850 text-muted uppercase text-[10px] font-bold">
                              <tr>
                                <th className="p-3">Linh kiện / Hạng mục</th>
                                <th className="p-3 text-right">Đơn giá</th>
                                <th className="p-3 text-center">SL</th>
                                <th className="p-3 text-right">Thành tiền</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                              {selectedOrder.quotation.items?.map((part: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                                  <td className="p-3 font-semibold text-foreground">{part.part_name}</td>
                                  <td className="p-3 text-right">{formatPrice(Number(part.unit_price))}</td>
                                  <td className="p-3 text-center font-bold">{part.quantity}</td>
                                  <td className="p-3 text-right font-bold text-foreground">{formatPrice(Number(part.subtotal))}</td>
                                </tr>
                              ))}
                              <tr className="bg-slate-50/50 dark:bg-slate-950/50">
                                <td colSpan={3} className="p-3 text-right text-muted font-bold">Công sửa chữa:</td>
                                <td className="p-3 text-right font-bold text-foreground">{formatPrice(Number(selectedOrder.quotation.labor_cost))}</td>
                              </tr>
                              {Number(selectedOrder.quotation.additional_cost) > 0 && (
                                <tr className="bg-slate-50/50 dark:bg-slate-950/50">
                                  <td colSpan={3} className="p-3 text-right text-muted font-bold">Chi phí phát sinh:</td>
                                  <td className="p-3 text-right font-bold text-foreground">{formatPrice(Number(selectedOrder.quotation.additional_cost))}</td>
                                </tr>
                              )}
                              <tr className="bg-primary/10 font-black text-sm">
                                <td colSpan={3} className="p-3.5 text-right text-primary">TỔNG CHI PHÍ THANH TOÁN:</td>
                                <td className="p-3.5 text-right text-accent">{formatPrice(Number(selectedOrder.quotation.total_amount))}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted pt-1">
                          <span><strong>Thời gian bảo hành:</strong> {selectedOrder.quotation.warranty || '6 tháng'}</span>
                          {selectedOrder.quotation.notes && <span><strong>Ghi chú:</strong> {selectedOrder.quotation.notes}</span>}
                        </div>
                      </div>

                      {/* Interactive Decision Actions */}
                      {(selectedOrder.status === 'ChoKhachXacNhan' || selectedOrder.quotation.customer_decision === 'pending') ? (
                        <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-4">
                          <div>
                            <h4 className="font-bold text-xs text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              Vui lòng xác nhận để chúng tôi bắt đầu sửa chữa
                            </h4>
                            <p className="text-xs text-amber-800 dark:text-amber-400 mt-1">
                              Chỉ khi quý khách nhấn &ldquo;Đồng ý sửa&rdquo;, kỹ thuật viên mới tiến hành tháo lắp và thay thế linh kiện.
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                              onClick={async () => {
                                try {
                                  const numericId = parseInt(selectedOrder.id.split('-')[1]);
                                  const { respondQuotation } = await import('../../lib/api/ticket');
                                  await respondQuotation(numericId, { decision: 'approved', customer_name: selectedOrder.customerName });
                                  handleSearch(inputVal || selectedOrder.id);
                                } catch (err: any) {
                                  alert(err.message || 'Lỗi gửi xác nhận');
                                }
                              }}
                              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-2xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>ĐỒNG Ý SỬA CHỮA</span>
                            </button>
                            <button
                              onClick={async () => {
                                const reason = prompt('Vui lòng nhập lý do từ chối sửa (không bắt buộc):');
                                try {
                                  const numericId = parseInt(selectedOrder.id.split('-')[1]);
                                  const { respondQuotation } = await import('../../lib/api/ticket');
                                  await respondQuotation(numericId, { decision: 'rejected', rejection_reason: reason || undefined, customer_name: selectedOrder.customerName });
                                  handleSearch(inputVal || selectedOrder.id);
                                } catch (err: any) {
                                  alert(err.message || 'Lỗi gửi phản hồi từ chối');
                                }
                              }}
                              className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-2xl transition shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <AlertTriangle className="w-4 h-4" />
                              <span>TỪ CHỐI SỬA CHỮA</span>
                            </button>
                          </div>
                        </div>
                      ) : selectedOrder.quotation.customer_decision === 'approved' ? (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-xs text-emerald-900 dark:text-emerald-300 font-bold flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span>Quý khách đã đồng ý phương án báo giá. Kỹ thuật viên đang tiến hành sửa chữa theo đúng cam kết!</span>
                        </div>
                      ) : (
                        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs text-red-900 dark:text-red-300 font-bold flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                          <span>Quý khách đã từ chối phương án sửa chữa này. Cửa hàng sẽ niêm phong và hỗ trợ gửi trả máy cho quý khách.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timeline container */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-6 md:p-8 shadow-xl">
                    <h3 className="font-bold text-sm text-foreground border-b border-slate-100 dark:border-slate-850 pb-3.5 mb-6">
                      Tiến độ sửa chữa thiết bị
                    </h3>

                    {/* Timeline elements */}
                    <div className="space-y-8 relative before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 z-0">
                      {selectedOrder.timeline.map((step, idx) => {
                        const Icon = getStatusIcon(step.status);
                        const isActive = selectedOrder.status === step.status || (selectedOrder.status !== 'completed' && !step.isCompleted && selectedOrder.timeline[idx-1]?.isCompleted);
                        
                        return (
                          <div key={idx} className="flex gap-4 relative z-10 animate-fade-in">
                            {/* Circle badge */}
                            <div 
                              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition duration-300 ${
                                step.isCompleted 
                                  ? 'bg-success border-success text-white' 
                                  : isActive 
                                    ? 'bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/20 animate-pulse'
                                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-850 text-muted'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>

                            {/* Text card */}
                            <div className="flex-1 text-left space-y-1">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <h4 className={`text-xs font-bold ${
                                  step.isCompleted ? 'text-foreground' : isActive ? 'text-primary' : 'text-muted'
                                }`}>
                                  {step.statusLabel}
                                </h4>
                                {step.timestamp && (
                                  <span className="text-[10px] text-muted font-medium bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-md">
                                    {formatDate(step.timestamp)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted leading-relaxed">
                                {step.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Audit History Log */}
                  {selectedOrder.histories && selectedOrder.histories.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-6 shadow-xl space-y-4">
                      <h3 className="font-bold text-xs text-foreground border-b border-slate-100 dark:border-slate-850 pb-2.5 flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-primary" />
                        <span>Lịch sử nhật ký xử lý phiếu</span>
                      </h3>
                      <div className="space-y-3">
                        {selectedOrder.histories.map((hist: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-1 text-xs">
                            <div className="flex justify-between items-center font-bold text-foreground">
                              <span>{hist.action} ({hist.status})</span>
                              <span className="text-[10px] text-muted">{new Date(hist.created_at).toLocaleString('vi-VN')}</span>
                            </div>
                            <p className="text-muted italic">{hist.details}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technician Notes Panel */}
                  {selectedOrder.technicianNotes && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl p-6 shadow-xl space-y-3">
                      <h3 className="font-bold text-xs text-foreground border-b border-slate-100 dark:border-slate-850 pb-2.5 flex items-center gap-1.5">
                        <Hammer className="w-4 h-4 text-primary" />
                        <span>Ghi chú từ Kỹ thuật viên chi nhánh</span>
                      </h3>
                      <p className="text-xs text-muted leading-relaxed bg-slate-50 dark:bg-slate-950 p-4 border border-slate-150 dark:border-slate-850 rounded-2xl italic font-medium">
                        &ldquo;{selectedOrder.technicianNotes}&rdquo;
                      </p>
                    </div>
                  )}

                </div>


              </div>
            )}
          </div>
        ) : (
          /* Empty/Not Found state */
          <div className="max-w-md mx-auto text-center py-12 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl shadow-xl space-y-4 no-print">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 text-warning rounded-full flex items-center justify-center mx-auto border border-warning/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Không tìm thấy thông tin đơn hàng</h2>
              <p className="text-xs text-muted mt-1 leading-normal">
                Không tìm thấy dữ liệu phiếu sửa chữa nào khớp với từ khóa &quot;<span className="font-semibold text-primary">{queryParam}</span>&quot;. Vui lòng kiểm tra kỹ số điện thoại (10 chữ số) hoặc định dạng mã phiếu sửa chữa (ví dụ: <span className="font-semibold text-primary">FIX-12345</span>).
              </p>
            </div>
            
            <div className="pt-2">
              <button
                onClick={() => {
                  setInputVal('');
                  router.push('/tracking');
                }}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-foreground text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Nhập lại từ khóa mới
              </button>
            </div>
          </div>
        )
      ) : (
        /* Prompt lookup guidance */
        <div className="max-w-md mx-auto text-center py-16 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl shadow-xl space-y-4 no-print">
          <div className="w-12 h-12 bg-primary-light/30 dark:bg-primary-light/5 text-primary rounded-full flex items-center justify-center mx-auto">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Sẵn sàng tra cứu tiến độ</h2>
            <p className="text-xs text-muted mt-1.5 leading-relaxed">
              Bạn có thể sử dụng thông tin số điện thoại khi đăng ký dịch vụ hoặc mã số phiếu được cấp ở hóa đơn để tra cứu tình trạng sửa chữa tức thời.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

export default function TrackingPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="p-8 text-center text-muted">Đang kết xuất thông tin tra cứu...</div>}>
        <TrackingContent />
      </Suspense>
    </ProtectedRoute>
  );
}
