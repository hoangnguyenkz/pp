import React, { useState, useEffect, useMemo } from 'react';
import { Quote, Supplier, User, RolePerms } from './types';
import {
  INITIAL_SUPPLIERS, INITIAL_QUOTES, INITIAL_USERS, INITIAL_ROLE_PERMS
} from './initialData';

// Modular UI tabs
import QuotesSection from './components/QuotesSection';
import SupplierSection from './components/SupplierSection';
import ProjectSection from './components/ProjectSection';
import ChartsSection from './components/ChartsSection';
import UserManagementSection from './components/UserManagementSection';

// Lucide Icons
import {
  Boxes, LayoutGrid, Building, Landmark, BarChart3, Users, Cloud,
  LogOut, ShieldAlert, CheckCircle, AlertCircle, RefreshCw, Key, HelpCircle, Copy
} from 'lucide-react';

const APPS_SCRIPT_TEMPLATE = `// ═══════════════════════════════════════════════════
// PriceTrack Pro — Google Apps Script Backend
// Bước 1: Dán toàn bộ code này vào Apps Script
// Bước 2: Deploy -> New deployment -> Web app
//         Execute as: Me | Who has access: Anyone
// ═══════════════════════════════════════════════════
const SHEET_ID = '1fg2Cgn0hd4BOtfJaZawVZLEX3G5msymAn3xHydJs_Yg';

const DATA_HEADERS = ['id','device','model','brand','origin','spec','supplier','cat','project','price','sellPrice','qty','vat','date','expiry','status','note'];
const USER_HEADERS = ['username','password','name','role','display','customPerms'];
const ROLE_HEADERS = ['role','seeCost','seeSell','seeProfit','canAdd','canEdit','canDelete','canImport','canAccessSupplier'];

// ── ĐỌC dữ liệu (GET request) ──────────────────────
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getData';
  const ss = SpreadsheetApp.openById(SHEET_ID);
  try {
    if (action === 'getData') {
      const sh = getOrCreate(ss, 'Data', DATA_HEADERS);
      const rows = sh.getLastRow() > 1
        ? sh.getRange(2, 1, sh.getLastRow() - 1, DATA_HEADERS.length).getValues() : [];
      return json({ ok: true, rows: rows });
    }
    if (action === 'getUsers') {
      const sh = getOrCreate(ss, 'Users', USER_HEADERS);
      const rows = sh.getLastRow() > 1
        ? sh.getRange(2, 1, sh.getLastRow() - 1, USER_HEADERS.length).getValues() : [];
      return json({ ok: true, rows: rows });
    }
    if (action === 'getRoles') {
      const sh = getOrCreate(ss, 'Roles', ROLE_HEADERS);
      const rows = sh.getLastRow() > 1
        ? sh.getRange(2, 1, sh.getLastRow() - 1, ROLE_HEADERS.length).getValues() : [];
      return json({ ok: true, rows: rows });
    }
    if (action === 'test') {
      return json({ ok: true, msg: 'Ket noi thanh cong!' });
    }
    return json({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
}

// ── GHI dữ liệu (POST request) ─────────────────────
function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : '';
    if (!raw) return json({ ok: false, error: 'Empty body' });
    var payload = JSON.parse(raw);
    return handleSave(payload);
  } catch (err) {
    return json({ ok: false, error: 'doPost error: ' + err.message });
  }
}

function handleSave(p) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  try {
    if (p.action === 'saveData') {
      writeSheet(ss, 'Data', DATA_HEADERS, p.rows || []);
      return json({ ok: true });
    }
    if (p.action === 'saveUsers') {
      writeSheet(ss, 'Users', USER_HEADERS, p.rows || []);
      return json({ ok: true });
    }
    if (p.action === 'saveRoles') {
      writeSheet(ss, 'Roles', ROLE_HEADERS, p.rows || []);
      return json({ ok: true });
    }
    return json({ ok: false, error: 'Unknown action: ' + p.action });
  } catch (err) {
    return json({ ok: false, error: 'handleSave error: ' + err.message });
  }
}

// ── Helpers ─────────────────────────────────────────
function writeSheet(ss, name, headers, rows) {
  var sh = getOrCreate(ss, name, headers);
  sh.clearContents();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length > 0) {
    sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function getOrCreate(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Main data states (loaded from localStorage on mount)
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [rolePerms, setRolePerms] = useState<Record<string, RolePerms>>({});

  // Active viewing tab
  const [activeTab, setActiveTab] = useState<'all' | 'supplier' | 'project' | 'chart' | 'users' | 'sheets'>('all');

  // Sync state
  const [scriptUrl, setScriptUrl] = useState(() => localStorage.getItem('pricetrack_script_url') || '');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'ok' | 'error' | 'nourl'>('nourl');
  const [syncMessage, setSyncMessage] = useState('Chưa kết nối Sheets');
  const [testingConnection, setTestingConnection] = useState(false);

  // Initialize data
  useEffect(() => {
    // Quotes
    const cachedQuotes = localStorage.getItem('pricetrack_quotes_store');
    if (cachedQuotes) {
      setQuotes(JSON.parse(cachedQuotes));
    } else {
      setQuotes(INITIAL_QUOTES);
      localStorage.setItem('pricetrack_quotes_store', JSON.stringify(INITIAL_QUOTES));
    }

    // Suppliers
    const cachedSuppliers = localStorage.getItem('pricetrack_suppliers_store');
    if (cachedSuppliers) {
      setSuppliers(JSON.parse(cachedSuppliers));
    } else {
      setSuppliers(INITIAL_SUPPLIERS);
      localStorage.setItem('pricetrack_suppliers_store', JSON.stringify(INITIAL_SUPPLIERS));
    }

    // Users registry
    const cachedUsers = localStorage.getItem('pricetrack_users_store');
    if (cachedUsers) {
      setUsers(JSON.parse(cachedUsers));
    } else {
      setUsers(INITIAL_USERS);
      localStorage.setItem('pricetrack_users_store', JSON.stringify(INITIAL_USERS));
    }

    // Roles permission matrix
    const cachedPerms = localStorage.getItem('pricetrack_perms_store');
    if (cachedPerms) {
      setRolePerms(JSON.parse(cachedPerms));
    } else {
      setRolePerms(INITIAL_ROLE_PERMS);
      localStorage.setItem('pricetrack_perms_store', JSON.stringify(INITIAL_ROLE_PERMS));
    }

    if (scriptUrl) {
      setSyncStatus('idle');
      setSyncMessage('Đã kết nối Sheets');
    }
  }, [scriptUrl]);

  // Compute active permissions matrix based on currentUser state
  const activePermissions = useMemo<RolePerms>(() => {
    if (!currentUser) {
      return {
        seeCost: false, seeSell: false, seeProfit: false,
        canAdd: false, canEdit: false, canDelete: false, canImport: false, canAccessSupplier: false
      };
    }
    if (currentUser.role === 'custom' && currentUser.customPerms) {
      return currentUser.customPerms;
    }
    // Fallback to global roles permissions template
    return rolePerms[currentUser.role] || {
      seeCost: false, seeSell: false, seeProfit: false,
      canAdd: false, canEdit: false, canDelete: false, canImport: false, canAccessSupplier: false
    };
  }, [currentUser, rolePerms]);

  // Guard routing if permission is adjusted
  useEffect(() => {
    if (activeTab === 'supplier' && !activePermissions.canAccessSupplier) {
      setActiveTab('all');
    }
  }, [activePermissions, activeTab]);

  // Handle local persistence helper
  const saveStateLocally = (
    upQuotes: Quote[],
    upSuppliers: Supplier[],
    upUsers: Record<string, User>,
    upPerms: Record<string, RolePerms>
  ) => {
    setQuotes(upQuotes);
    localStorage.setItem('pricetrack_quotes_store', JSON.stringify(upQuotes));

    setSuppliers(upSuppliers);
    localStorage.setItem('pricetrack_suppliers_store', JSON.stringify(upSuppliers));

    setUsers(upUsers);
    localStorage.setItem('pricetrack_users_store', JSON.stringify(upUsers));

    setRolePerms(upPerms);
    localStorage.setItem('pricetrack_perms_store', JSON.stringify(upPerms));

    // Trigger auto-sync if scriptUrl is valid
    if (scriptUrl) {
      pushSyncData(upQuotes, upSuppliers, upUsers, upPerms);
    }
  };

  // Google Sheets Push sync logic
  const pushSyncData = async (
    qList: Quote[] = quotes,
    sList: Supplier[] = suppliers,
    uReg: Record<string, User> = users,
    pMatrix: Record<string, RolePerms> = rolePerms
  ) => {
    if (!scriptUrl) return;
    setSyncStatus('saving');
    setSyncMessage('Đang lưu dữ liệu...');

    try {
      // Data tab
      const quotesRows = qList.map(q => [
        q.id, q.device, q.model, q.brand, q.origin, q.spec, q.supplier, q.cat, q.project,
        q.price, q.sellPrice || 0, q.qty, q.vat || 10, q.date, q.expiry || '', q.status, q.note || ''
      ]);
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ action: 'saveData', rows: quotesRows })
      });

      // Users tab
      const usersRows = Object.entries(uReg).map(([uname, u]) => [
        uname, u.password || '', u.name, u.role, u.display || '',
        u.customPerms ? JSON.stringify(u.customPerms) : ''
      ]);
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ action: 'saveUsers', rows: usersRows })
      });

      // Roles tab
      const rolesRows = Object.entries(pMatrix).map(([roleKey, p]) => [
        roleKey, p.seeCost ? 1 : 0, p.seeSell ? 1 : 0, p.seeProfit ? 1 : 0,
        p.canAdd ? 1 : 0, p.canEdit ? 1 : 0, p.canDelete ? 1 : 0, p.canImport ? 1 : 0, p.canAccessSupplier ? 1 : 0
      ]);
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ action: 'saveRoles', rows: rolesRows })
      });

      setSyncStatus('ok');
      setSyncMessage('Đã đồng bộ Sheets ✓');
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('Đã kết nối Sheets');
      }, 3500);

    } catch (err: any) {
      setSyncStatus('error');
      setSyncMessage('Lỗi đồng bộ: ' + (err.message || '').slice(0, 18));
      setTimeout(() => setSyncStatus('idle'), 4000);
    }
  };

  // Google Sheets Fetch command
  const fetchDataFromSheets = async () => {
    if (!scriptUrl) return;
    setSyncStatus('saving');
    setSyncMessage('Đang tải dữ liệu...');

    try {
      // 1. Fetch main bids/quotes
      const d1Res = await fetch(`${scriptUrl}?action=getData`);
      const d1 = await d1Res.json();
      let finalQuotes = [...quotes];
      if (d1.ok && d1.rows && d1.rows.length > 0) {
        finalQuotes = d1.rows.map((r: any) => ({
          id: parseInt(r[0]) || Math.floor(Math.random() * 1000000),
          device: String(r[1] || ''),
          model: String(r[2] || ''),
          brand: String(r[3] || ''),
          origin: String(r[4] || ''),
          spec: String(r[5] || ''),
          supplier: String(r[6] || ''),
          cat: String(r[7] || 'Khác'),
          project: String(r[8] || ''),
          price: parseFloat(r[9]) || 0,
          sellPrice: parseFloat(r[10]) || 0,
          qty: parseInt(r[11]) || 1,
          vat: parseFloat(r[12]) || 10,
          date: String(r[13] || new Date().toISOString().slice(0,10)),
          expiry: String(r[14] || ''),
          status: String(r[15] || 'Mới') as any,
          note: String(r[16] || '')
        }));
      }

      // 2. Fetch users database
      const d2Res = await fetch(`${scriptUrl}?action=getUsers`);
      const d2 = await d2Res.json();
      let finalUsers = { ...users };
      if (d2.ok && d2.rows && d2.rows.length > 0) {
        finalUsers = {};
        d2.rows.forEach((r: any) => {
          if (!r[0]) return;
          finalUsers[String(r[0])] = {
            username: String(r[0]),
            password: String(r[1] || ''),
            name: String(r[2] || ''),
            role: String(r[3] || 'viewer') as any,
            display: String(r[4] || ''),
            customPerms: r[5] ? JSON.parse(r[5]) : null
          };
        });
      }

      // 3. Fetch permissions templates
      const d3Res = await fetch(`${scriptUrl}?action=getRoles`);
      const d3 = await d3Res.json();
      let finalPerms = { ...rolePerms };
      if (d3.ok && d3.rows && d3.rows.length > 0) {
        d3.rows.forEach((r: any) => {
          if (!r[0]) return;
          finalPerms[String(r[0])] = {
            seeCost: !!parseInt(r[1]),
            seeSell: !!parseInt(r[2]),
            seeProfit: !!parseInt(r[3]),
            canAdd: !!parseInt(r[4]),
            canEdit: !!parseInt(r[5]),
            canDelete: !!parseInt(r[6]),
            canImport: !!parseInt(r[7]),
            canAccessSupplier: !!parseInt(r[8])
          };
        });
      }

      // Persist the entire sheet payload locally
      saveStateLocally(finalQuotes, suppliers, finalUsers, finalPerms);

      setSyncStatus('ok');
      setSyncMessage('Đã đồng bộ Sheets ✓');
      alert('Đồng bộ dữ liệu từ Google Sheets thành công!');
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('Đã kết nối Sheets');
      }, 3500);

    } catch (err: any) {
      setSyncStatus('error');
      setSyncMessage('Lỗi tải Sheets');
      alert('Không thể kết nối hoặc tải dữ liệu. Lỗi: ' + err.message);
      setTimeout(() => setSyncStatus('idle'), 4000);
    }
  };

  // Connection testing helper
  const handleTestConnection = async () => {
    if (!scriptUrl) return;
    setTestingConnection(true);
    try {
      const resp = await fetch(`${scriptUrl}?action=test`);
      const payload = await resp.json();
      if (payload && payload.ok) {
        alert('Kết nối thành công! Google Sheets và Apps Script hoạt động tốt.');
      } else {
        alert('Không đo được Apps Script: ' + JSON.stringify(payload));
      }
    } catch (err: any) {
      alert('Lỗi khi thực hiện kiểm tra: ' + err.message);
    } finally {
      setTestingConnection(false);
    }
  };

  // Auth Operations
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = loginUsername.trim().toLowerCase();
    const match = users[cleanUser];

    if (!match || match.password !== loginPassword) {
      setLoginError('Sai thông tin tài khoản hoặc mật khẩu.');
      return;
    }

    setLoginError('');
    setCurrentUser(match);
    setLoginPassword('');
  };

  const handleQuickLogin = (role: 'admin' | 'sales' | 'accountant' | 'viewer') => {
    const defaultPasswords: Record<string, string> = {
      admin: 'admin123',
      sales: 'sales123',
      accountant: 'acc123',
      viewer: 'view123'
    };
    const userToLog = users[role] || { username: role, password: defaultPasswords[role], name: role, role: role, display: 'Nghiệp vụ' };
    setCurrentUser(userToLog);
    setLoginUsername(role);
    setLoginPassword('');
    setLoginError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('all');
  };

  // CRUD Handler - Quote entries
  const handleAddQuote = (newQuote: Omit<Quote, 'id'>) => {
    // Check if supplier exists. If not, dynamically enroll him
    const supExist = suppliers.find(s => s.name.toLowerCase() === newQuote.supplier.toLowerCase());
    let updatedSuppliers = [...suppliers];
    if (!supExist) {
      const generatedSup: Supplier = {
        id: Math.max(...suppliers.map(s => s.id), 0) + 1,
        name: newQuote.supplier,
        phone: '', email: '', address: '', taxCode: '', contactPerson: '', note: 'Đăng ký tự động qua báo giá thầu.'
      };
      updatedSuppliers.push(generatedSup);
    }

    const item: Quote = {
      id: Math.max(...quotes.map(q => q.id), 0) + 1,
      ...newQuote
    };
    const updatedQuotes = [item, ...quotes];
    saveStateLocally(updatedQuotes, updatedSuppliers, users, rolePerms);
  };

  const handleUpdateQuote = (modified: Quote) => {
    const updatedQuotes = quotes.map(q => q.id === modified.id ? modified : q);
    saveStateLocally(updatedQuotes, suppliers, users, rolePerms);
  };

  const handleDeleteQuote = (id: number) => {
    const updatedQuotes = quotes.filter(q => q.id !== id);
    saveStateLocally(updatedQuotes, suppliers, users, rolePerms);
  };

  const handleImportQuotes = (imported: Omit<Quote, 'id'>[]) => {
    const mapped = imported.map((q, idx) => ({
      id: Math.max(...quotes.map(item => item.id), 0) + idx + 1,
      ...q
    }));
    const updatedQuotes = [...mapped, ...quotes];
    saveStateLocally(updatedQuotes, suppliers, users, rolePerms);
  };

  // CRUD Handler - Suppliers
  const handleAddSupplier = (newSup: Omit<Supplier, 'id'>) => {
    const item: Supplier = {
      id: Math.max(...suppliers.map(s => s.id), 0) + 1,
      ...newSup
    };
    const updatedSuppliers = [item, ...suppliers];
    saveStateLocally(quotes, updatedSuppliers, users, rolePerms);
  };

  const handleUpdateSupplier = (modified: Supplier) => {
    const updatedSuppliers = suppliers.map(s => s.id === modified.id ? modified : s);
    saveStateLocally(quotes, updatedSuppliers, users, rolePerms);
  };

  const handleDeleteSupplier = (id: number) => {
    if (confirm('Xoá nhà cung cấp này? Các báo giá thầu cũ liên đới có thể hiển thị thiếu thông tin liên hệ.')) {
      const updatedSuppliers = suppliers.filter(s => s.id !== id);
      saveStateLocally(quotes, updatedSuppliers, users, rolePerms);
    }
  };

  // CRUD Handler - Users registries
  const handleAddUser = (newUser: User) => {
    const updatedUsers = { ...users, [newUser.username]: newUser };
    saveStateLocally(quotes, suppliers, updatedUsers, rolePerms);
  };

  const handleUpdateUser = (modified: User) => {
    const updatedUsers = { ...users, [modified.username]: modified };
    // If the active user updated his own info, update current session
    if (currentUser && currentUser.username === modified.username) {
      setCurrentUser(modified);
    }
    saveStateLocally(quotes, suppliers, updatedUsers, rolePerms);
  };

  const handleDeleteUser = (uname: string) => {
    const updated = { ...users };
    delete updated[uname];
    saveStateLocally(quotes, suppliers, updated, rolePerms);
  };

  const handleUpdateRolePerms = (roleKey: string, perms: RolePerms) => {
    const updatedMatrix = { ...rolePerms, [roleKey]: perms };
    saveStateLocally(quotes, suppliers, users, updatedMatrix);
  };

  const handleSaveScriptUrl = (url: string) => {
    const cleanUrl = url.trim();
    localStorage.setItem('pricetrack_script_url', cleanUrl);
    setScriptUrl(cleanUrl);
    alert('Đã cập nhật URL Apps Script. Sẵn sàng đồng bộ hóa!');
  };

  // Auth Guard view switcher
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 antialiased">
        <div className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-sm shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mx-auto shadow-md">
              <Boxes size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-lg md:text-xl tracking-tight">TID CO.LTD</h1>
              <p className="text-[10px] md:text-xs text-blue-600 font-bold uppercase tracking-widest mt-1">Quản lý báo giá thiết bị</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-50 text-red-650 rounded-lg text-xs font-semibold flex items-center gap-2 border border-red-100">
                <AlertCircle size={14} className="text-red-550 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-0.5">Tên Đăng Nhập</label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="vd: admin, sales hoặc accountant"
                className="w-full text-xs md:text-sm border border-gray-350 rounded-lg p-2.5 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-0.5">Mật Khẩu</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Mật khẩu của bạn"
                className="w-full text-xs md:text-sm border border-gray-350 rounded-lg p-2.5 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-650 hover:bg-blue-700 hover:scale-[1.01] active:scale-95 text-white bg-blue-600 border border-transparent font-bold rounded-lg text-xs md:text-sm transition shadow-md"
            >
              Sign In / Đăng Nhập
            </button>
          </form>

          {/* Quick Demo selection */}
          <div className="pt-4 border-t border-gray-150 text-center space-y-3">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Đăng nhập nhanh nghiệp vụ (Demo)</span>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                onClick={() => handleQuickLogin('admin')}
                className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
              >
                🔑 Admin
              </button>
              <button
                onClick={() => handleQuickLogin('sales')}
                className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
              >
                💼 Sales
              </button>
              <button
                onClick={() => handleQuickLogin('accountant')}
                className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
              >
                📉 Kế toán
              </button>
              <button
                onClick={() => handleQuickLogin('viewer')}
                className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
              >
                👁️ Viewer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 flex antialiased text-slate-800">
      {/* Structural left sidebar navigation */}
      <aside className="w-60 min-w-60 bg-slate-900 text-slate-350 flex flex-col justify-between p-4 border-r border-slate-800 shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold shadow-sm">
              <Boxes size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-white font-black text-sm tracking-tight leading-tight">TID CO.LTD</h2>
              <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">Price Tracking Pro</p>
            </div>
          </div>

          {/* User profile capsule card */}
          <div className="p-3 bg-slate-800/65 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-500 text-white rounded-md flex items-center justify-center font-bold">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="max-w-[110px]">
                <p className="text-slate-200 font-bold truncate">{currentUser.name}</p>
                <span className="text-[9px] text-slate-400 capitalize block truncate">
                  {currentUser.role === 'custom' ? 'Custom' : currentUser.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition"
              title="Đăng xuất"
            >
              <LogOut size={14} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2.5 block mb-2">
              Danh mục thầu
            </span>

            <button
              onClick={() => setActiveTab('all')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition text-left font-bold
                ${activeTab === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'}
              `}
            >
              <LayoutGrid size={15} /> Tất cả báo giá
            </button>

            {/* Revised block link to supplier section, safeguarded with access permission */}
            {activePermissions.canAccessSupplier ? (
              <button
                onClick={() => setActiveTab('supplier')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition text-left font-bold
                  ${activeTab === 'supplier' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'}
                `}
              >
                <span className="flex items-center gap-2.5">
                  <Building size={15} /> Nhà cung cấp
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">Active</span>
              </button>
            ) : (
              <div
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-600 cursor-not-allowed opacity-50 font-bold"
                title="Tài khoản của bạn không được phân quyền xem tab Nhà cung cấp"
              >
                <span className="flex items-center gap-2.5">
                  <Building size={15} /> Nhà cung cấp
                </span>
                <span className="text-[9px] bg-red-950/40 text-red-450 border border-red-900/40 rounded px-1">Khoá</span>
              </div>
            )}

            <button
              onClick={() => setActiveTab('project')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition text-left font-bold
                ${activeTab === 'project' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'}
              `}
            >
              <Landmark size={15} /> Theo dự án thầu
            </button>

            <button
              onClick={() => setActiveTab('chart')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition text-left font-bold
                ${activeTab === 'chart' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'}
              `}
            >
              <BarChart3 size={15} /> Biểu đồ phân tích
            </button>

            {/* Administrations */}
            {currentUser.role === 'admin' && (
              <>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2.5 pt-4 block mb-2">
                  Quản trị viên
                </span>

                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition text-left font-bold
                    ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <Users size={15} /> Phân quyền người dùng
                </button>

                <button
                  onClick={() => setActiveTab('sheets')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition text-left font-bold
                    ${activeTab === 'sheets' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <Cloud size={15} /> Kết nối Google Sheets
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Sync Status bottom indicator */}
        <div className="border-t border-slate-800 pt-4 space-y-2">
          <div
            onClick={fetchDataFromSheets}
            className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition text-[10px] select-none
              ${syncStatus === 'nourl' ? 'bg-slate-800/40 text-slate-500' : ''}
              ${syncStatus === 'saving' ? 'bg-yellow-950/20 text-yellow-500 border border-yellow-900/30' : ''}
              ${syncStatus === 'ok' ? 'bg-green-950/25 text-green-400 border border-green-900/30' : ''}
              ${syncStatus === 'idle' ? 'bg-slate-800/70 text-slate-400 hover:bg-slate-800 border border-slate-700/50' : ''}
              ${syncStatus === 'error' ? 'bg-red-950/35 text-red-400 border border-red-900/30' : ''}
            `}
            title={scriptUrl ? "Tải lại dữ liệu sống từ Google Sheets" : "Cấu hình Google Sheets để bật đồng bộ"}
          >
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full
                ${syncStatus === 'nourl' ? 'bg-slate-500' : ''}
                ${syncStatus === 'saving' ? 'bg-yellow-400 animate-pulse' : ''}
                ${syncStatus === 'ok' ? 'bg-green-400' : ''}
                ${syncStatus === 'idle' ? 'bg-blue-400' : ''}
                ${syncStatus === 'error' ? 'bg-red-500 animate-pulse' : ''}
              `} />
              <span className="font-semibold">{syncMessage}</span>
            </div>
            {scriptUrl && <RefreshCw size={10} className={`${syncStatus === 'saving' ? 'animate-spin text-yellow-500' : 'text-slate-400'}`} />}
          </div>
          <p className="text-[9px] text-slate-600 text-center leading-normal">PriceTrack Pro v4.0 · 2026</p>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Section */}
        <header className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-30 shadow-3xs shrink-0">
          <div>
            <h1 className="text-base md:text-lg font-extrabold text-gray-900">
              {activeTab === 'all' && 'Bộ quản lý và so sánh báo giá thầu'}
              {activeTab === 'supplier' && 'Quản trị hồ sơ Nhà cung cấp'}
              {activeTab === 'project' && 'Quản trị báo giá thầu theo Dự án'}
              {activeTab === 'chart' && 'Báo cáo trực quan & Phân tích cơ chế giá'}
              {activeTab === 'users' && 'Hệ quản lý nhân sự nghiệp vụ'}
              {activeTab === 'sheets' && 'Cơ cấu cổng kết nối Google Sheets'}
            </h1>
            <p className="text-[10px] md:text-xs text-slate-500 leading-normal">
              {activeTab === 'all' && 'Phân tích chéo các thông số thầu, lọc giá rẻ nhất từ đối tác thầu.'}
              {activeTab === 'supplier' && 'Lưu trữ thông tin liên hệ, xem thống kê chất lượng thầu từ đối tác.'}
              {activeTab === 'project' && 'Kế hoạch hóa doanh thu, biên đầu tư vật tư công trình.'}
              {activeTab === 'chart' && 'Trực quan cạnh tranh báo thầu gộp, cơ hội tối ưu tỷ suất biên.'}
              {activeTab === 'users' && 'Bảo vệ giá mua/giá bán phục vụ phân cấp an toàn tài chính.'}
              {activeTab === 'sheets' && 'Tích hợp Apps Script đám mây giúp đồng bộ báo giá đa văn phòng.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wide uppercase leading-normal
              ${currentUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : ''}
              ${currentUser.role === 'sales' ? 'bg-green-100 text-green-800' : ''}
              ${currentUser.role === 'accountant' ? 'bg-rose-100 text-rose-800' : ''}
              ${currentUser.role === 'viewer' ? 'bg-slate-100 text-slate-600' : ''}
              ${currentUser.role === 'custom' ? 'bg-blue-100 text-blue-800' : ''}
            `}>
              Vai trò: {currentUser.role === 'custom' ? 'Tùy chỉnh' : currentUser.role}
            </span>
          </div>
        </header>

        {/* Content Box */}
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Active section routing */}
          {activeTab === 'all' && (
            <QuotesSection
              quotes={quotes}
              suppliers={suppliers}
              permissions={activePermissions}
              onAddQuote={handleAddQuote}
              onUpdateQuote={handleUpdateQuote}
              onDeleteQuote={handleDeleteQuote}
              onImportQuotes={handleImportQuotes}
            />
          )}

          {activeTab === 'supplier' && (
            <SupplierSection
              suppliers={suppliers}
              quotes={quotes}
              permissions={activePermissions}
              onAddSupplier={handleAddSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
            />
          )}

          {activeTab === 'project' && (
            <ProjectSection
              quotes={quotes}
              permissions={activePermissions}
            />
          )}

          {activeTab === 'chart' && (
            <ChartsSection
              quotes={quotes}
              permissions={activePermissions}
            />
          )}

          {activeTab === 'users' && currentUser.role === 'admin' && (
            <UserManagementSection
              users={users}
              rolePerms={rolePerms}
              currentUser={currentUser}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onUpdateRolePerms={handleUpdateRolePerms}
            />
          )}

          {activeTab === 'sheets' && currentUser.role === 'admin' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-3xs p-6 space-y-6 max-w-4xl">
              <div>
                <h2 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Cloud className="text-blue-600 animate-bounce-slow" size={20} />
                  Cấu hình đồng bộ hóa dữ liệu tập trung (Google Sheets Connection)
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Apps Script giúp PriceTrack liên kết đồng bộ trực tiếp hai chiều tới trang Google Spreadsheets của cá nhân bạn.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs md:text-sm">
                <div className="md:col-span-2 space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3 border-l-2 border-blue-500 pl-3">
                    <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">1</div>
                    <div>
                      <h4 className="font-bold text-gray-900 leading-tight">Mở Spreadsheets & Tạo Apps Script</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Vào Google Sheets → Tiện ích mở rộng (Extensions) → Apps Script. Xóa code cũ và dán đoạn mã chuẩn thầu bên phải vào.</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3 border-l-2 border-blue-500 pl-3">
                    <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">2</div>
                    <div>
                      <h4 className="font-bold text-gray-900 leading-tight">Triển khai Ứng dụng Web (Deploy as Web App)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Click Deploy (Triển khai) {"->"} New Deployment (Lập Triển khai mới) {"->"} Kiểu cấu hình: Ứng dụng Web (Web app). <br />
                        <strong>Mục thực thi (Execute as):</strong> <em>Me (Tôi)</em> <br />
                        <strong>Mục truy cập (Who has access):</strong> <em>Anyone (Bất kỳ ai)</em>. <br />
                        Click Deploy, xác thực quyền và sao chép đường dẫn (Copy URL) được Google cấp.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3 border-l-2 border-blue-500 pl-3">
                    <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0">3</div>
                    <div className="space-y-2 flex-1">
                      <h4 className="font-bold text-gray-900 leading-tight">Dán URL Apps Script và kết nối</h4>
                      <div className="flex gap-2">
                        <input
                          id="sheets-connection-input-url"
                          type="text"
                          defaultValue={scriptUrl}
                          placeholder="https://script.google.com/macros/s/.../exec"
                          className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-600"
                        />
                        <button
                          onClick={() => {
                            const val = (document.getElementById('sheets-connection-input-url') as HTMLInputElement)?.value;
                            handleSaveScriptUrl(val);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-lg transition"
                        >
                          Kết nối ngay
                        </button>
                      </div>
                      <div className="flex gap-2 pt-1 border-t border-gray-100">
                        <button
                          onClick={handleTestConnection}
                          disabled={testingConnection || !scriptUrl}
                          className="px-3.5 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-40"
                        >
                          {testingConnection ? 'Đang kiểm tra...' : 'Test kết nối thầu'}
                        </button>
                        <button
                          onClick={() => pushSyncData()}
                          disabled={!scriptUrl}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-lg transition disabled:opacity-40"
                        >
                          Đẩy dữ liệu lên Sheets
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right code snippet box */}
                <div className="space-y-2 bg-slate-900 text-emerald-400 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] uppercase tracking-wide font-black text-slate-500">Mã Apps Script mẫu</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
                        alert('Đã sao chép mã Apps Script vào clipboard!');
                      }}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded text-[10px] font-bold transition"
                      title="Copy code Apps Script"
                    >
                      <Copy size={10} /> Copy Code
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono leading-relaxed overflow-y-auto max-h-[320px] whitespace-pre-wrap select-all text-blue-300">
                    {APPS_SCRIPT_TEMPLATE}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
