'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Printer, ShieldCheck, CheckCircle2, Wrench, FileText, ArrowLeft } from 'lucide-react';
import { getTicketInvoice } from '@/lib/api/handover';
import Link from 'next/link';
import { formatPrice } from '@/lib/format';

export default function InvoicePrintPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ticketId = Number(params?.id);
  const isReceiptMode = searchParams?.get('receipt') === 'true';

  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketId) return;
    fetchInvoice();
  }, [ticketId]);

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTicketInvoice(ticketId);
      setInvoice(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể tải hóa đơn thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-slate-500">
        Đang tải thông tin hóa đơn...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-4">
        <p className="text-sm font-bold text-red-600">{error || 'Không tìm thấy hóa đơn'}</p>
        <Link href="/" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">Quay về trang chủ</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-8 px-4 font-sans text-slate-800">
      
      {/* Printable Container Toolbar */}
      <div className="max-w-2xl mx-auto mb-6 flex justify-between items-center no-print">
        <Link href="/staff/handover" className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>{isReceiptMode ? 'IN PHIẾU GIAO NHẬN' : 'IN HÓA ĐƠN THANH TOÁN'}</span>
        </button>
      </div>

      {/* Printable Sheet A4/Receipt Layout */}
      <div className="max-w-2xl mx-auto bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-slate-200 printable-area space-y-8">
        
        {/* Brand Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="w-7 h-7 text-primary" />
              <span className="text-2xl font-black tracking-tight text-slate-900">REPAIR<span className="text-primary">SYSTEM</span></span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">{invoice.branch?.name || 'FASTCARE Chuyên Nghiệp'}</p>
            <p className="text-[11px] text-slate-400">{invoice.branch?.address || '123 Đường 3/2, Phường 11, Quận 10, TP.HCM'}</p>
            <p className="text-[11px] text-slate-400">Hotline: {invoice.branch?.hotline || '1800 6868'}</p>
          </div>

          <div className="text-right">
            <h2 className="text-lg font-black text-slate-900 uppercase">
              {isReceiptMode ? 'PHIẾU GIAO NHẬN THIẾT BỊ' : 'HÓA ĐƠN THANH TOÁN'}
            </h2>
            <p className="text-xs font-bold text-primary mt-0.5">{invoice.invoice_number}</p>
            <p className="text-[11px] text-slate-500">Mã phiếu: <span className="font-semibold">{invoice.ticket_code}</span></p>
            <p className="text-[11px] text-slate-400">Ngày xuất: {new Date(invoice.issued_at).toLocaleDateString('vi-VN')}</p>
          </div>
        </div>

        {/* Customer & Device Information */}
        <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-150">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">THÔNG TIN KHÁCH HÀNG</span>
            <p className="font-bold text-slate-900">{invoice.customer_name}</p>
            <p className="text-slate-600 font-medium">SĐT: {invoice.phone_number}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">THÔNG TIN THIẾT BỊ</span>
            <p className="font-bold text-slate-900">{invoice.device_info}</p>
            <p className="text-slate-600 font-medium">Bảo hành: <span className="font-bold text-primary">{invoice.warranty}</span></p>
          </div>
        </div>

        {/* Services & Parts Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Chi Tiết Hạng Mục Sửa Chữa</h3>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold">
                <th className="py-2 text-left">Hạng mục / Linh kiện</th>
                <th className="py-2 text-center w-16">SL</th>
                <th className="py-2 text-right w-28">Đơn giá</th>
                <th className="py-2 text-right w-32">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-slate-800">
              {invoice.quotation_items && invoice.quotation_items.length > 0 ? (
                invoice.quotation_items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-3 font-medium">{item.part_name}</td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">{formatPrice(item.unit_price)}</td>
                    <td className="py-3 text-right font-bold">{formatPrice(item.subtotal)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-3 font-medium" colSpan={3}>{invoice.service_info}</td>
                  <td className="py-3 text-right font-bold">{formatPrice(invoice.total_amount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total & Payment Summary */}
        <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
          <div className="flex justify-between items-center font-bold text-sm">
            <span className="text-slate-900">TỔNG CỘNG THANH TOÁN:</span>
            <span className="text-xl font-black text-primary">{formatPrice(invoice.total_amount)}</span>
          </div>

          <div className="flex justify-between text-slate-600 pt-1">
            <span>Phương thức thanh toán:</span>
            <span className="font-semibold">{invoice.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản QR'}</span>
          </div>

          <div className="flex justify-between text-slate-600">
            <span>Trạng thái tiền:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ĐÃ THANH TOÁN
            </span>
          </div>
        </div>

        {/* Receipt Signatures for Handover Mode */}
        {isReceiptMode ? (
          <div className="pt-8 border-t border-slate-200 space-y-6">
            <p className="text-xs text-slate-500 italic text-center">
              Khách hàng xác nhận đã kiểm tra thiết bị hoạt động bình thường, đầy đủ phụ kiện và nhận máy hoàn tất.
            </p>
            <div className="grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <p className="font-bold text-slate-900">NHÂN VIÊN GIAO MÁY</p>
                <p className="text-[10px] text-slate-400 mt-0.5">(Ký & ghi rõ họ tên)</p>
                <div className="h-16" />
              </div>
              <div>
                <p className="font-bold text-slate-900">KHÁCH HÀNG KÝ NHẬN</p>
                <p className="text-[10px] text-slate-400 mt-0.5">(Ký & ghi rõ họ tên)</p>
                <div className="h-16" />
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-6 border-t border-slate-200 text-center text-[11px] text-slate-400">
            Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ tại RepairSystem!
          </div>
        )}

      </div>
    </div>
  );
}
