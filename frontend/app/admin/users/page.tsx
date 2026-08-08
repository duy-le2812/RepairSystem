'use client';

import React, { useEffect, useState } from 'react';
import { getUsers, updateUserRole } from '@/lib/api/admin';
import { User } from '@/types';
import { Search, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId: number, newRole: 'admin' | 'customer') => {
    if (userId === currentUser?.user_id) {
      alert('Bạn không thể tự tước quyền của chính mình!');
      return;
    }
    
    if (!confirm(`Bạn có chắc muốn cấp quyền ${newRole.toUpperCase()} cho tài khoản này?`)) return;
    
    try {
      await updateUserRole(userId, newRole);
      fetchUsers();
    } catch (e) {
      alert('Lỗi cập nhật quyền');
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase())) ||
    (u.phone && u.phone.includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Quản lý Người dùng</h1>
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Tìm tài khoản, SĐT, Tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4 font-semibold">Tên đăng nhập</th>
                <th className="px-6 py-4 font-semibold">Họ và tên</th>
                <th className="px-6 py-4 font-semibold">Số điện thoại</th>
                <th className="px-6 py-4 font-semibold">Ngày tạo</th>
                <th className="px-6 py-4 font-semibold text-right">Phân quyền (Role)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Đang tải dữ liệu...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Không tìm thấy người dùng nào.</td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{u.username}</span>
                      {u.id === currentUser?.user_id && (
                        <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">BẠN</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{u.full_name || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{u.phone || '-'}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(u.created_at || Date.now()).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {u.role === 'admin' && (
                          <ShieldAlert className="w-4 h-4 text-red-500" />
                        )}
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as 'admin' | 'customer')}
                          disabled={u.id === currentUser?.user_id}
                          className={`border text-xs rounded-lg px-2 py-1.5 focus:ring-primary focus:border-primary disabled:opacity-50 ${
                            u.role === 'admin' 
                              ? 'bg-red-50 border-red-200 text-red-700 font-bold dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' 
                              : 'bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <option value="customer">Customer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
