import React, { useState } from 'react';
import { Supplier, Quote, RolePerms } from '../types';
import { Building, Phone, Mail, MapPin, FileSpreadsheet, UserPlus, Edit3, Save, Plus, X, Award, ShieldAlert } from 'lucide-react';

interface SupplierSectionProps {
  suppliers: Supplier[];
  quotes: Quote[];
  permissions: RolePerms;
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: number) => void;
}

export default function SupplierSection({
  suppliers,
  quotes,
  permissions,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier
}: SupplierSectionProps) {
  const [openModal, setOpenModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [note, setNote] = useState('');

  const [error, setError] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatMillions = (val: number) => {
    return (val / 1_000_000).toFixed(1) + 'M';
  };

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setTaxCode('');
    setContactPerson('');
    setNote('');
    setError('');
    setOpenModal(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setPhone(sup.phone);
    setEmail(sup.email);
    setAddress(sup.address);
    setTaxCode(sup.taxCode);
    setContactPerson(sup.contactPerson);
    setNote(sup.note);
    setError('');
    setOpenModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tên nhà cung cấp không được để trống.');
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      taxCode: taxCode.trim(),
      contactPerson: contactPerson.trim(),
      note: note.trim()
    };

    if (editingSupplier) {
      onUpdateSupplier({
        ...editingSupplier,
        ...payload
      });
    } else {
      onAddSupplier(payload);
    }
    setOpenModal(false);
  };

  // If user does not have permission to view suppliers, show alert
  if (!permissions.canAccessSupplier) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-gray-100 text-center max-w-md mx-auto my-12 shadow-sm">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert size={28} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Quyền truy cập bị từ chối</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Tài khoản của bạn không được phân quyền truy cập thông tin nhà cung cấp. Vui lòng liên hệ quản trị viên để cấu hình quyền truy cập.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building className="text-blue-600" size={24} />
            Danh sách Nhà cung cấp ({suppliers.length})
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Quản lý thông tin liên hệ và tổng quan hiệu quả báo giá của từng đối tác nhà cung cấp
          </p>
        </div>
        {permissions.canEdit && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
          >
            <Plus size={16} /> Add Supplier / Thêm NCC
          </button>
        )}
      </div>

      {/* Grid displays Suppliers info and summary metrics - NO DEVICE DETAIL TABLES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((sup) => {
          // Compute summary stats for this supplier
          const supQuotes = quotes.filter((q) => q.supplier.toLowerCase() === sup.name.toLowerCase());
          const totalDevices = supQuotes.length;
          const totalProjects = new Set(supQuotes.map((q) => q.project).filter(Boolean)).size;

          const totalCost = supQuotes.reduce((sum, q) => sum + q.price * q.qty, 0);
          const totalSell = supQuotes.reduce((sum, q) => sum + (q.sellPrice || 0) * q.qty, 0);
          const totalRevenue = supQuotes.reduce((sum, q) => sum + (q.sellPrice || 0) * q.qty, 0);
          const netProfit = totalSell > 0 ? totalSell - totalCost : 0;
          const averageMargin = totalSell > 0 ? ((totalSell - totalCost) / totalSell * 100).toFixed(1) : '0';

          return (
            <div
              key={sup.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition duration-200 overflow-hidden flex flex-col justify-between"
            >
              {/* Header card with name & actions */}
              <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0 border border-blue-100">
                      {sup.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm md:text-base line-clamp-1" title={sup.name}>
                        {sup.name}
                      </h3>
                      <p className="text-xs text-blue-600 font-medium mt-0.5">
                        {totalDevices} thiết bị · {totalProjects} dự án
                      </p>
                    </div>
                  </div>
                  {permissions.canEdit && (
                    <button
                      onClick={() => handleOpenEdit(sup)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-md border border-transparent hover:border-gray-200 transition"
                      title="Sửa thông tin nhà cung cấp"
                    >
                      <Edit3 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Body: Supplier Information Details */}
              <div className="p-5 space-y-4 flex-1">
                <div className="space-y-2.5 text-xs text-gray-600">
                  <div className="flex items-start gap-2.5">
                    <UserPlus size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-gray-400">Người liên hệ:</span>{' '}
                      <span className="font-medium text-gray-900">{sup.contactPerson || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Phone size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-gray-400">Hotline/SĐT:</span>{' '}
                      <span className="font-medium text-gray-900">{sup.phone || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Mail size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-gray-400">Email:</span>{' '}
                      <span className="font-medium text-blue-600 hover:underline">
                        {sup.email || 'Chưa cập nhật'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Award size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-gray-400">Mã số thuế:</span>{' '}
                      <span className="font-mono font-medium text-gray-900">{sup.taxCode || 'Chưa cập nhật'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-gray-400">Địa chỉ:</span>{' '}
                      <span className="font-medium text-gray-900 line-clamp-2" title={sup.address}>
                        {sup.address || 'Chưa cập nhật'}
                      </span>
                    </div>
                  </div>
                </div>

                {sup.note && (
                  <div className="p-2.5 bg-yellow-50/50 rounded-lg text-xs border border-yellow-100 text-yellow-800">
                    <span className="font-semibold block mb-0.5">Ghi chú:</span>
                    <span className="line-clamp-2">{sup.note}</span>
                  </div>
                )}
              </div>

              {/* Footer card: Summary metrics (no device detail table!) */}
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/30 grid grid-cols-2 gap-3 text-center">
                {permissions.seeCost ? (
                  <div className="p-2 bg-amber-50/30 rounded-lg border border-amber-100/30">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tổng Giá Mua</p>
                    <p className="text-sm font-semibold text-amber-700 mt-0.5">
                      {totalDevices > 0 ? formatMillions(totalCost) : '0đ'}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 bg-gray-100/50 rounded-lg">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Giá mua</p>
                    <p className="text-xs font-semibold text-gray-400 mt-0.5 filter blur-xs selection:hidden">******</p>
                  </div>
                )}

                {permissions.seeSell ? (
                  <div className="p-2 bg-blue-50/30 rounded-lg border border-blue-100/30">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tổng Giá Bán</p>
                    <p className="text-sm font-semibold text-blue-700 mt-0.5">
                      {totalDevices > 0 ? formatMillions(totalSell) : '0đ'}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 bg-gray-100/50 rounded-lg">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Giá bán</p>
                    <p className="text-xs font-semibold text-gray-400 mt-0.5 filter blur-xs selection:hidden">******</p>
                  </div>
                )}

                {permissions.seeProfit && totalDevices > 0 && totalSell > 0 ? (
                  <div className="col-span-2 p-2 bg-green-50/40 rounded-lg border border-green-100/40 flex items-center justify-between px-3 text-left">
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide">Lợi Nhuận Gộp</p>
                      <p className="text-xs font-semibold text-green-700">{formatMillions(netProfit)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide">Biên Gộp TB</p>
                      <p className="text-xs font-semibold text-blue-600">{averageMargin}%</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {suppliers.length === 0 && (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-gray-200">
            <Building className="mx-auto text-gray-300 mb-2" size={40} />
            <h4 className="font-semibold text-gray-650">Chưa có nhà cung cấp nào</h4>
            <p className="text-xs text-gray-400 mt-1">Vui lòng click nút thêm mới để cập nhật đối tác.</p>
          </div>
        )}
      </div>

      {/* Modern Dialog Modal to Add/Edit Suppliers */}
      {openModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Building size={20} className="text-blue-600" />
                  {editingSupplier ? 'Sửa thông tin nhà cung cấp' : 'Thêm nhà cung cấp mới'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Lưu trữ thông tin liên hệ phục vụ tra cứu nhanh và cấu hình báo giá
                </p>
              </div>
              <button
                onClick={() => setOpenModal(false)}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-md transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold">{error}</div>}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Tên Nhà cung cấp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Công ty TNHH Giải Pháp Mạng TID"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Người liên hệ</label>
                    <input
                      type="text"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="VD: Ông Nguyễn Văn A"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Số điện thoại</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="VD: 0912 345 678"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Address Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="VD: contact@tid.com.vn"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Mã số thuế</label>
                    <input
                      type="text"
                      value={taxCode}
                      onChange={(e) => setTaxCode(e.target.value)}
                      placeholder="VD: 0305123456"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Địa chỉ trụ sở</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="VD: 15B Điện Biên Phủ, Phường 25, Quận Bình Thạnh, Tp.HCM"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ghi chú nhà cung cấp</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="VD: Phương thức giao nhận, chiết khấu đại lý, điều khoản công nợ..."
                    rows={3}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-100 text-gray-700 transition"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
                >
                  <Save size={16} /> Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
