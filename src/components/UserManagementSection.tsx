import React, { useState } from 'react';
import { User, RolePerms } from '../types';
import { Users, UserPlus, Shield, Eye, EyeOff, Check, X, Edit2, Trash2, Key, HelpCircle } from 'lucide-react';

interface UserManagementProps {
  users: Record<string, User>;
  rolePerms: Record<string, RolePerms>;
  currentUser: User;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (username: string) => void;
  onUpdateRolePerms: (role: string, perms: RolePerms) => void;
}

const PERM_LABELS: Record<keyof RolePerms, string> = {
  seeCost: 'Xem giá mua',
  seeSell: 'Xem giá bán',
  seeProfit: 'Xem lợi nhuận & biên gộp',
  canAdd: 'Thêm mới báo giá',
  canEdit: 'Chỉnh sửa báo giá',
  canDelete: 'Xoá báo giá',
  canImport: 'Nhập Excel/CSV',
  canAccessSupplier: 'Truy cập tab Nhà cung cấp'
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên (Admin)',
  sales: 'Kinh doanh (Sales)',
  accountant: 'Kế toán (Accountant)',
  viewer: 'Người xem (Viewer)',
  custom: 'Tùy chỉnh riêng (Custom)'
};

export default function UserManagementSection({
  users,
  rolePerms,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onUpdateRolePerms
}: UserManagementProps) {
  const [openModal, setOpenModal] = useState(false);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [display, setDisplay] = useState('');
  const [role, setRole] = useState<'admin' | 'sales' | 'accountant' | 'viewer' | 'custom'>('viewer');
  const [customPerms, setCustomPerms] = useState<RolePerms>({
    seeCost: false,
    seeSell: false,
    seeProfit: false,
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canImport: false,
    canAccessSupplier: false
  });

  const [error, setError] = useState('');

  const handleOpenAdd = () => {
    setEditingUsername(null);
    setUsername('');
    setPassword('');
    setName('');
    setDisplay('');
    setRole('viewer');
    setCustomPerms({
      seeCost: false,
      seeSell: true,
      seeProfit: false,
      canAdd: false,
      canEdit: false,
      canDelete: false,
      canImport: false,
      canAccessSupplier: false
    });
    setError('');
    setOpenModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUsername(user.username);
    setUsername(user.username);
    setPassword(user.password || '••••••••');
    setName(user.name);
    setDisplay(user.display || '');
    setRole(user.role);

    // If custom, seed the custom perms
    const activePerms = user.role === 'custom' && user.customPerms
      ? { ...user.customPerms }
      : { ...(rolePerms[user.role] || rolePerms.viewer) };

    setCustomPerms(activePerms);
    setError('');
    setOpenModal(true);
  };

  const handleToggleRolePerm = (targetRole: string, permKey: keyof RolePerms) => {
    if (targetRole === 'admin') return; // Admin always possesses full rights
    const updated = { ...rolePerms[targetRole] };
    updated[permKey] = !updated[permKey];
    onUpdateRolePerms(targetRole, updated);
  };

  const handleToggleCustomPerm = (permKey: keyof RolePerms) => {
    setCustomPerms(prev => ({
      ...prev,
      [permKey]: !prev[permKey]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setError('Tên đăng nhập không được trống.');
      return;
    }
    if (!name.trim()) {
      setError('Họ tên không được trống.');
      return;
    }

    const payload: User = {
      username: cleanUser,
      password: password,
      name: name.trim(),
      display: display.trim(),
      role: role
    };

    if (role === 'custom') {
      payload.customPerms = customPerms;
    } else {
      payload.customPerms = null;
    }

    if (editingUsername) {
      // If password string is unchanged visual placeholder, keep the old password
      if (password === '••••••••') {
        const oldUser = users[editingUsername];
        payload.password = oldUser?.password || '';
      }
      onUpdateUser(payload);
    } else {
      if (!password) {
        setError('Hãy nhập mật khẩu ban đầu cho tài khoản.');
        return;
      }
      if (users[cleanUser]) {
        setError('Tên đăng nhập này đã tồn tại.');
        return;
      }
      onAddUser(payload);
    }

    setOpenModal(false);
  };

  const checkVal = (b: boolean) => {
    return b ? (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-50 text-green-600">
        <Check size={12} className="stroke-[3]" />
      </span>
    ) : (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-50 text-red-400">
        <X size={12} className="stroke-[3]" />
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Upper bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-blue-600" size={24} />
            Phân quyền người dùng hệ thống
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Quản trị tài khoản, phân vai trò nghiệp vụ và tuỳ biến chính sách bảo mật dữ liệu giá
          </p>
        </div>
        {currentUser.role === 'admin' && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-xs"
          >
            <UserPlus size={16} /> Thêm tài khoản
          </button>
        )}
      </div>

      {/* Account Tables */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Danh sách tài khoản trực tuyến</span>
          <span className="text-[10px] bg-blue-50 text-blue-600 rounded-md py-0.5 px-2 font-mono font-medium">
            {Object.keys(users).length} Accounts
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200">
                <th className="px-4 py-3 font-semibold text-[10px] uppercase text-gray-400 tracking-wider">User / Chức vụ</th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase text-gray-400 tracking-wider">Username</th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase text-gray-400 tracking-wider">Vai trò</th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase text-gray-400 tracking-wider text-center">Giá mua</th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase text-gray-400 tracking-wider text-center">Giá bán</th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase text-gray-400 tracking-wider text-center">Lợi nhuận</th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase text-gray-400 tracking-wider text-center">Nhà cung cấp</th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase text-gray-400 tracking-wider text-center">Tác vụ Thêm/Sửa</th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase text-gray-400 tracking-wider text-center">Xoá</th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase text-gray-400 tracking-wider text-center">Tác vụ khác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(users).map(([uname, u]) => {
                const uperms = u.role === 'custom' && u.customPerms
                  ? u.customPerms
                  : (rolePerms[u.role] || rolePerms.viewer);

                const isProtectedAdmin = uname === 'admin';

                return (
                  <tr key={uname} className="hover:bg-slate-50/40 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 leading-tight">{u.name}</div>
                          <div className="text-[10px] text-gray-400">{u.display || 'Thành viên'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-gray-700 text-xs">{u.username}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide leading-relaxed uppercase
                        ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : ''}
                        ${u.role === 'sales' ? 'bg-green-100 text-green-700' : ''}
                        ${u.role === 'accountant' ? 'bg-rose-100 text-rose-700' : ''}
                        ${u.role === 'viewer' ? 'bg-slate-100 text-slate-500' : ''}
                        ${u.role === 'custom' ? 'bg-blue-100 text-blue-700' : ''}
                      `}>
                        {u.role === 'custom' ? 'Tuỳ chỉnh' : ROLE_LABELS[u.role].split(' ')[0]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{checkVal(uperms.seeCost)}</td>
                    <td className="px-4 py-3 text-center">{checkVal(uperms.seeSell)}</td>
                    <td className="px-4 py-3 text-center">{checkVal(uperms.seeProfit)}</td>
                    <td className="px-4 py-3 text-center">{checkVal(uperms.canAccessSupplier)}</td>
                    <td className="px-4 py-3 text-center">{checkVal(uperms.canAdd || uperms.canEdit)}</td>
                    <td className="px-4 py-3 text-center">{checkVal(uperms.canDelete)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {currentUser.role === 'admin' && (
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-md transition"
                            title="Chỉnh sửa tài khoản"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        {currentUser.role === 'admin' && !isProtectedAdmin ? (
                          <button
                            onClick={() => onDeleteUser(uname)}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition"
                            title="Xoá tài khoản"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          isProtectedAdmin && (
                            <span className="p-1 text-slate-300 cursor-not-allowed">
                              <Trash2 size={13} className="opacity-40" />
                            </span>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role permission matrix configurations */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-blue-600" size={18} />
            Định nghĩa mẫu phân quyền theo vai trò (Template Roles)
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Mọi thay đổi dưới đây sẽ áp dụng tự động cho toàn bộ tài khoản đại diện cho vai trò đó
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['sales', 'accountant', 'viewer'].map((roleKey) => {
            const p = rolePerms[roleKey];
            if (!p) return null;

            return (
              <div key={roleKey} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-3xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className={`inline-flex px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider
                    ${roleKey === 'sales' ? 'bg-green-100 text-green-700' : ''}
                    ${roleKey === 'accountant' ? 'bg-rose-100 text-rose-700' : ''}
                    ${roleKey === 'viewer' ? 'bg-slate-100 text-slate-500' : ''}
                  `}>
                    Vai trò: {ROLE_LABELS[roleKey]}
                  </span>
                  <HelpCircle size={14} className="text-gray-300" title="Click checkbox dưới để cấu hình nóng quyền hạn" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(PERM_LABELS).map(([key, label]) => {
                    const active = p[key as keyof RolePerms];
                    return (
                      <button
                        key={key}
                        onClick={() => handleToggleRolePerm(roleKey, key as keyof RolePerms)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition select-none
                          ${active
                            ? 'bg-blue-50/50 border-blue-200 text-blue-900 font-medium'
                            : 'bg-slate-50/30 border-gray-200 text-gray-500 hover:bg-slate-50'
                          }
                        `}
                      >
                        <span className="truncate pr-1">{label}</span>
                        {checkVal(active)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Account Add/Edit Dialog */}
      {openModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150-out">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/30">
              <div>
                <h3 className="font-bold text-gray-900 text-base md:text-lg flex items-center gap-2">
                  <UserPlus size={18} className="text-blue-600" />
                  {editingUsername ? `Điều chỉnh tài khoản: ${editingUsername}` : 'Khởi tạo tài khoản nghiệp vụ mới'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Khai báo nhân sự và phân định quyền tương tác thông số kỹ thuật</p>
              </div>
              <button
                onClick={() => setOpenModal(false)}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-md transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold">{error}</div>}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tên đăng nhập (Username)</label>
                    <input
                      type="text"
                      disabled={!!editingUsername}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username, vd: nguyenvan_sales"
                      className="w-full text-xs md:text-sm border border-gray-300 disabled:bg-gray-150 disabled:text-gray-500 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Mật khẩu truy cập</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mật khẩu bí mật"
                        className="w-full text-xs md:text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
                      />
                      <Key size={14} className="absolute right-3 top-2.5 text-gray-300" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Họ tên thành viên</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="VD: Nguyễn Văn Kinh Doanh"
                      className="w-full text-xs md:text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Chức danh / Phòng ban</label>
                    <input
                      type="text"
                      value={display}
                      onChange={(e) => setDisplay(e.target.value)}
                      placeholder="VD: Team Lead Kinh Doanh HN"
                      className="w-full text-xs md:text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Vai trò áp dụng</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full text-xs md:text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
                  >
                    <option value="admin">Admin — Đầy đủ quyền quản trị</option>
                    <option value="sales">Sales — Quản lý giá bán, chặn giá nhập</option>
                    <option value="accountant">Accountant — Quản lý giá mua, chặn giá bán</option>
                    <option value="viewer">Viewer — Chỉ xem các thông tin kỹ thuật cơ bản</option>
                    <option value="custom">Bespoke Custom — Thiết lập tùy chỉnh cụ biệt cho tài khoản này</option>
                  </select>
                </div>

                {role === 'custom' && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Quyền tùy biến cụ biệt:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {Object.entries(PERM_LABELS).map(([key, label]) => {
                        const active = customPerms[key as keyof RolePerms];
                        return (
                          <button
                            type="button"
                            key={key}
                            onClick={() => handleToggleCustomPerm(key as keyof RolePerms)}
                            className={`flex items-center justify-between p-2 rounded-lg border text-left bg-white transition select-none
                              ${active ? 'border-blue-300 ring-2 ring-blue-50 text-blue-900 font-medium' : 'border-gray-200 text-gray-500'}
                            `}
                          >
                            <span className="truncate pr-1">{label}</span>
                            {checkVal(active)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs md:text-sm font-semibold hover:bg-gray-100 text-gray-750 transition"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs md:text-sm font-semibold transition"
                >
                  Lưu thiết lập
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
