'use client';

import React, { useEffect, useState } from 'react';
import { Service } from '@/types';
import { updateService } from '@/lib/api/admin';
import { Edit, Trash, Plus, Save, X } from 'lucide-react';
import { BASE_URL } from '@/lib/api/client';
import { getAuthHeaders } from '@/lib/api/auth';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // States for Edit / Add
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Service>>({});
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/services/`);
      const data = await res.json();
      setServices(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = async (id: number) => {
    try {
      await updateService(id, {
        service_name: editForm.service_name,
        description: editForm.description,
        base_price: editForm.base_price,
      });
      setEditingId(null);
      fetchServices();
    } catch (e) {
      alert('Lỗi cập nhật');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa dịch vụ này?')) return;
    try {
      await fetch(`${BASE_URL}/api/services/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      fetchServices();
    } catch (e) {
      alert('Lỗi khi xóa');
    }
  };

  const handleAdd = async () => {
    try {
      await fetch(`${BASE_URL}/api/services/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(editForm),
      });
      setIsAdding(false);
      setEditForm({});
      fetchServices();
    } catch (e) {
      alert('Lỗi khi thêm mới');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Quản lý Dịch vụ</h1>
        <button
          onClick={() => { setIsAdding(true); setEditForm({ service_name: '', description: '', base_price: 0 }); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-hover transition shadow-sm shadow-primary/30"
        >
          <Plus className="w-4 h-4" /> Thêm mới
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4 font-semibold w-1/4">Tên dịch vụ</th>
                <th className="px-6 py-4 font-semibold w-2/4">Mô tả</th>
                <th className="px-6 py-4 font-semibold w-1/4">Giá tiền (VNĐ)</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isAdding && (
                <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="px-6 py-4">
                    <input
                      className="w-full border rounded px-2 py-1 text-sm bg-white dark:bg-slate-800"
                      placeholder="Tên..."
                      value={editForm.service_name || ''}
                      onChange={e => setEditForm({...editForm, service_name: e.target.value})}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      className="w-full border rounded px-2 py-1 text-sm bg-white dark:bg-slate-800"
                      placeholder="Mô tả..."
                      value={editForm.description || ''}
                      onChange={e => setEditForm({...editForm, description: e.target.value})}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      className="w-full border rounded px-2 py-1 text-sm bg-white dark:bg-slate-800"
                      placeholder="Giá..."
                      value={editForm.base_price || 0}
                      onChange={e => setEditForm({...editForm, base_price: Number(e.target.value)})}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={handleAdd} className="text-green-600 mr-3"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setIsAdding(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
                  </td>
                </tr>
              )}
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8">Đang tải...</td></tr>
              ) : (
                services.map(srv => (
                  <tr key={srv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    {editingId === srv.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input
                            className="w-full border rounded px-2 py-1 text-sm bg-white dark:bg-slate-900"
                            value={editForm.service_name}
                            onChange={e => setEditForm({...editForm, service_name: e.target.value})}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            className="w-full border rounded px-2 py-1 text-sm bg-white dark:bg-slate-900"
                            value={editForm.description}
                            onChange={e => setEditForm({...editForm, description: e.target.value})}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            className="w-full border rounded px-2 py-1 text-sm bg-white dark:bg-slate-900"
                            value={editForm.base_price}
                            onChange={e => setEditForm({...editForm, base_price: Number(e.target.value)})}
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleSave(srv.id)} className="text-green-600 mr-3 hover:text-green-700"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{srv.service_name}</td>
                        <td className="px-6 py-4 text-slate-500 whitespace-normal min-w-[200px]">{srv.description}</td>
                        <td className="px-6 py-4 font-bold text-primary">{srv.base_price.toLocaleString()}đ</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => { setEditingId(srv.id); setEditForm(srv); }} className="text-blue-500 mr-4 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(srv.id)} className="text-red-500 hover:text-red-600"><Trash className="w-4 h-4" /></button>
                        </td>
                      </>
                    )}
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
