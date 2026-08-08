/**
 * Centralized Formatter Utility for RepairSystem
 * Ensures 100% consistent monetary formatting and status color coding across all 15 routes.
 */

/**
 * Format any number or numeric string to Vietnamese Dong format.
 * Example: 1000000 -> "1.000.000 ₫"
 * Example: 15000000 -> "15.000.000 ₫"
 */
export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '0 ₫';
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    return '0 ₫';
  }

  // Format with vi-VN locale, appending symbol ₫
  const formatted = new Intl.NumberFormat('vi-VN').format(Math.round(num));
  return `${formatted} ₫`;
}

export type TicketStatusType = 
  | 'TiepNhan' 
  | 'DangKiemTra' 
  | 'DaChuanDoan' 
  | 'ChoKhachXacNhan' 
  | 'KhachDongY' 
  | 'KhachTuChoi' 
  | 'DangSua' 
  | 'DaSuaXong' 
  | 'KiemTraChatLuong' 
  | 'HoanTat' 
  | 'DaThanhToan' 
  | 'DaTraMay'
  | string;

export interface StatusBadgeConfig {
  label: string;
  className: string;
}

/**
 * Standardized status color mapping across Ticket, QC, Payment, and Invoice statuses.
 * SUCCESS  -> Green (emerald)
 * WARNING  -> Amber (amber)
 * ERROR    -> Red (rose)
 * INFO     -> Blue / Cyan / Indigo
 * NEUTRAL  -> Slate / Gray
 */
export function getStatusBadgeConfig(status: TicketStatusType): StatusBadgeConfig {
  switch (status) {
    case 'TiepNhan':
      return {
        label: 'Tiếp nhận',
        className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
      };
    case 'DangKiemTra':
      return {
        label: 'Đang kiểm tra',
        className: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
      };
    case 'DaChuanDoan':
      return {
        label: 'Đã chẩn đoán',
        className: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800'
      };
    case 'ChoKhachXacNhan':
      return {
        label: 'Chờ khách duyệt',
        className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold animate-pulse'
      };
    case 'KhachDongY':
      return {
        label: 'Khách đồng ý',
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold'
      };
    case 'KhachTuChoi':
      return {
        label: 'Khách từ chối',
        className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold'
      };
    case 'DangSua':
      return {
        label: 'Đang sửa chữa',
        className: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 font-bold'
      };
    case 'DaSuaXong':
      return {
        label: 'Đã sửa xong',
        className: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800 font-bold'
      };
    case 'KiemTraChatLuong':
      return {
        label: 'Đang kiểm tra QC',
        className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
      };
    case 'HoanTat':
    case 'PASSED':
      return {
        label: status === 'PASSED' ? 'QC ĐẠT' : 'Chờ giao máy (QC Pass)',
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold'
      };
    case 'FAILED':
      return {
        label: 'QC KHÔNG ĐẠT',
        className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold'
      };
    case 'DaThanhToan':
    case 'PAID':
      return {
        label: status === 'PAID' ? 'Đã thanh toán' : 'Đã thanh toán',
        className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold'
      };
    case 'DaTraMay':
      return {
        label: 'Đã trả máy',
        className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold'
      };
    default:
      return {
        label: status,
        className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
      };
  }
}
