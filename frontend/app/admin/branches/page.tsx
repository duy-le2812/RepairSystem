'use client';

import React, { useEffect, useState } from 'react';
import { Branch } from '@/types';
import { createBranch, updateBranch, deleteBranch } from '@/lib/api/admin';
import { Edit, Trash, Plus, Save, X } from 'lucide-react';
import { BASE_URL } from '@/lib/api/client';
import { getAuthHeaders } from '@/lib/api/auth';

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Branch>>({});
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/branches`);
      const data = await res.json();
      setBranches(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = async (id: number) => {
    try {
      await updateBranch(id, editForm);
      setEditingId(null);
      fetchBranches();
    } catch (e) {
      alert('Lỗi cập nhật');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa chi nhánh này?')) return;
    try {
      await deleteBranch(id);
      fetchBranches();
    } catch (e) {
      alert('Lỗi khi xóa');
    }
  };

  const handleAdd = async () => {
    try {
      await createBranch(editForm);
      setIsAdding(false);
      setEditForm({});
      fetchBranches();
    } catch (e) {
      alert('Lỗi khi thêm mới');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Quản lý Chi nhánh</h1>
        <button
          onClick={() => { setIsAdding(true); setEditForm({ name: '', address: '', hotline: '', workingHours: '' }); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-hover transition shadow-sm shadow-primary/30"
        >
          <Plus className="w-4 h-4" /> Thêm chi nhánh
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-6 py-4 font-semibold">Tên chi nhánh</th>
                <th className="px-6 py-4 font-semibold">Địa chỉ</th>
                <th className="px-6 py-4 font-semibold">Hotline</th>
                <th className="px-6 py-4 font-semibold">Giờ làm việc</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isAdding && (
                <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                  <td className="px-6 py-4">
                    <input className="w-full border rounded px-2 py-1 bg-white dark:bg-slate-800 text-sm" placeholder="Tên..." value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                  </td>
                  <td className="px-6 py-4">
                    <input className="w-full border rounded px-2 py-1 bg-white dark:bg-slate-800 text-sm" placeholder="Địa chỉ..." value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                  </td>
                  <td className="px-6 py-4">
                    <input className="w-full border rounded px-2 py-1 bg-white dark:bg-slate-800 text-sm" placeholder="Hotline..." value={editForm.hotline || ''} onChange={e => setEditForm({...editForm, hotline: e.target.value})} />
                  </td>
                  <td className="px-6 py-4">
                    <input className="w-full border rounded px-2 py-1 bg-white dark:bg-slate-800 text-sm" placeholder="Giờ mở cửa..." value={editForm.workingHours || ''} onChange={e => setEditForm({...editForm, workingHours: e.target.value})} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={handleAdd} className="text-green-600 mr-3"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setIsAdding(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
                  </td>
                </tr>
              )}
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8">Đang tải...</td></tr>
              ) : (
                branches.map(branch => (
                  <tr key={branch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    {editingId === branch.id ? (
                      <>
                        <td className="px-6 py-4">
                          <input className="w-full border rounded px-2 py-1 bg-white dark:bg-slate-900 text-sm" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        </td>
                        <td className="px-6 py-4">
                          <input className="w-full border rounded px-2 py-1 bg-white dark:bg-slate-900 text-sm" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                        </td>
                        <td className="px-6 py-4">
                          <input className="w-full border rounded px-2 py-1 bg-white dark:bg-slate-900 text-sm" value={editForm.hotline} onChange={e => setEditForm({...editForm, hotline: e.target.value})} />
                        </td>
                        <td className="px-6 py-4">
                          <input className="w-full border rounded px-2 py-1 bg-white dark:bg-slate-900 text-sm" value={editForm.workingHours} onChange={e => setEditForm({...editForm, workingHours: e.target.value})} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleSave(branch.id)} className="text-green-600 mr-3 hover:text-green-700"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{branch.name}</td>
                        <td className="px-6 py-4 text-slate-500 whitespace-normal min-w-[200px]">{branch.address}</td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{branch.hotline}</td>
                        <td className="px-6 py-4 text-slate-500">{branch.workingHours}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => { setEditingId(branch.id); setEditForm(branch); }} className="text-blue-500 mr-4 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(branch.id)} className="text-red-500 hover:text-red-600"><Trash className="w-4 h-4" /></button>
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
