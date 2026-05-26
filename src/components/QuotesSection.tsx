import React, { useState, useMemo } from 'react';
import { Quote, Supplier, RolePerms } from '../types';
import * as XLSX from 'xlsx';
import {
  Search, Filter, SlidersHorizontal, FileSpreadsheet, Share2, Plus, Edit, Trash2, Eye,
  Sparkles, CheckCircle, Clock, AlertTriangle, CloudUpload, Info, Check, ArrowUpDown, X, Star
} from 'lucide-react';

interface QuotesSectionProps {
  quotes: Quote[];
  suppliers: Supplier[];
  permissions: RolePerms;
  onAddQuote: (quote: Omit<Quote, 'id'>) => void;
  onUpdateQuote: (quote: Quote) => void;
  onDeleteQuote: (id: number) => void;
  onImportQuotes: (quotes: Omit<Quote, 'id'>[]) => void;
}

const CATEGORIES = ['Điện', 'Mạng', 'Cơ khí', 'CNTT', 'An ninh', 'Cơ sở hạ tầng', 'Khác'];

export default function QuotesSection({
  quotes,
  suppliers,
  permissions,
  onAddQuote,
  onUpdateQuote,
  onDeleteQuote,
  onImportQuotes
}: QuotesSectionProps) {
  // Filters state
  const [search, setSearch] = useState('');
  const [fSupplier, setFSupplier] = useState('');
  const [fProject, setFProject] = useState('');
  const [fCat, setFCat] = useState('');
  const [fBrand, setFBrand] = useState('');
  const [fStatus, setFStatus] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<keyof Quote | 'total' | 'profit' | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>('');

  // Form states
  const [fId, setFId] = useState<number | null>(null);
  const [fDevice, setFDevice] = useState('');
  const [fModel, setFModel] = useState('');
  const [fBrandVal, setFBrandVal] = useState('');
  const [fOrigin, setFOrigin] = useState('');
  const [fCatVal, setFCatVal] = useState('Điện');
  const [fSpec, setFSpec] = useState('');
  const [fSupplierVal, setFSupplierVal] = useState('');
  const [fProjectVal, setFProjectVal] = useState('');
  const [fPrice, setFPrice] = useState<number>(0);
  const [fSellPrice, setFSellPrice] = useState<number>(0);
  const [fQty, setFQty] = useState<number>(1);
  const [fVat, setFVat] = useState<number>(10);
  const [fMarginPct, setFMarginPct] = useState<string>('');
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10));
  const [fExpiry, setFExpiry] = useState('');
  const [fStatusVal, setFStatusVal] = useState<'Mới' | 'Chờ duyệt' | 'Đã duyệt' | 'Hết hạn'>('Mới');
  const [fNote, setFNote] = useState('');

  const [formError, setFormError] = useState('');

  // Extract unique filters
  const uniqueSuppliers = useMemo(() => Array.from(new Set(quotes.map(q => q.supplier).filter(Boolean))), [quotes]);
  const uniqueProjects = useMemo(() => Array.from(new Set(quotes.map(q => q.project).filter(Boolean))), [quotes]);
  const uniqueBrands = useMemo(() => Array.from(new Set(quotes.map(q => q.brand).filter(Boolean))), [quotes]);

  // Compute best buyer pricing per device
  const bestPrices = useMemo(() => {
    const map: Record<string, number> = {};
    quotes.forEach(q => {
      const dev = q.device.toLowerCase().trim();
      if (!map[dev] || q.price < map[dev]) {
        map[dev] = q.price;
      }
    });
    return map;
  }, [quotes]);

  // Filter & sort list
  const filteredQuotes = useMemo(() => {
    let result = [...quotes];

    if (search.trim()) {
      const s = search.toLowerCase().trim();
      result = result.filter(q =>
        q.device.toLowerCase().includes(s) ||
        (q.model && q.model.toLowerCase().includes(s)) ||
        (q.brand && q.brand.toLowerCase().includes(s)) ||
        q.supplier.toLowerCase().includes(s) ||
        (q.project && q.project.toLowerCase().includes(s)) ||
        (q.spec && q.spec.toLowerCase().includes(s))
      );
    }

    if (fSupplier) result = result.filter(q => q.supplier === fSupplier);
    if (fProject) result = result.filter(q => q.project === fProject);
    if (fCat) result = result.filter(q => q.cat === fCat);
    if (fBrand) result = result.filter(q => q.brand === fBrand);
    if (fStatus) result = result.filter(q => q.status === fStatus);

    if (sortField) {
      result.sort((a, b) => {
        let valA: any = 0;
        let valB: any = 0;

        if (sortField === 'total') {
          valA = a.price * a.qty;
          valB = b.price * b.qty;
        } else if (sortField === 'profit') {
          valA = ((a.sellPrice || 0) - a.price) * a.qty;
          valB = ((b.sellPrice || 0) - b.price) * b.qty;
        } else {
          valA = a[sortField as keyof Quote];
          valB = b[sortField as keyof Quote];
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    return result;
  }, [quotes, search, fSupplier, fProject, fCat, fBrand, fStatus, sortField, sortAsc]);

  // Handle unit buy price changes in the form -> recalculate and update previews
  const handlePriceChange = (valStr: string) => {
    const rawNum = parseInt(valStr.replace(/[^\d]/g, ''), 10) || 0;
    setFPrice(rawNum);
  };

  // Handle unit sell price changes in the form -> recalculate and update previews
  const handleSellPriceChange = (valStr: string) => {
    const rawNum = parseInt(valStr.replace(/[^\d]/g, ''), 10) || 0;
    setFSellPrice(rawNum);
  };

  // Convert unit margin calculation
  const onMarginPctChange = (pctValue: string) => {
    setFMarginPct(pctValue);
  };

  const handleCalcSellPriceFromMargin = () => {
    const margin = parseFloat(fMarginPct);
    if (isNaN(margin) || margin <= 0 || margin >= 100) {
      alert('Vui lòng điền mục % Lợi nhuận gộp từ 0.1 đến 99');
      return;
    }
    if (!fPrice || fPrice <= 0) {
      alert('Vui lòng nhập Đơn giá mua trước');
      return;
    }
    // Formula: SELL_PRICE = BUY_PRICE / (1 - Margin%)
    const computedSell = Math.round(fPrice / (1 - margin / 100));
    setFSellPrice(computedSell);
  };

  // Handle click sorts
  const requestSort = (field: keyof Quote | 'total' | 'profit') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleOpenAdd = () => {
    setFId(null);
    setFDevice('');
    setFModel('');
    setFBrandVal('');
    setFOrigin('');
    setFCatVal('Điện');
    setFSpec('');
    setFSupplierVal(suppliers[0]?.name || '');
    setFProjectVal('');
    setFPrice(0);
    setFSellPrice(0);
    setFQty(1);
    setFVat(10);
    setFMarginPct('');
    setFDate(new Date().toISOString().slice(0, 10));
    setFExpiry('');
    setFStatusVal('Mới');
    setFNote('');
    setFormError('');
    setOpenModal(true);
  };

  const handleOpenEdit = (q: Quote) => {
    setFId(q.id);
    setFDevice(q.device);
    setFModel(q.model);
    setFBrandVal(q.brand);
    setFOrigin(q.origin);
    setFCatVal(q.cat);
    setFSpec(q.spec);
    setFSupplierVal(q.supplier);
    setFProjectVal(q.project);
    setFPrice(q.price);
    setFSellPrice(q.sellPrice || 0);
    setFQty(q.qty);
    setFVat(q.vat);

    // Seed Margin Pct preview
    if (q.price > 0 && q.sellPrice > 0) {
      const initialMargin = ((q.sellPrice - q.price) / q.sellPrice * 100).toFixed(1);
      setFMarginPct(initialMargin);
    } else {
      setFMarginPct('');
    }

    setFDate(q.date);
    setFExpiry(q.expiry);
    setFStatusVal(q.status);
    setFNote(q.note);
    setFormError('');
    setOpenModal(true);
  };

  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fDevice.trim()) {
      setFormError('Vui lòng điền tên của thiết bị.');
      return;
    }
    if (!fSupplierVal.trim()) {
      setFormError('Vui lòng chọn hoặc lập nhà cung cấp.');
      return;
    }
    if (fPrice <= 0) {
      setFormError('Vui lòng khai báo Đơn giá mua hợp lệ lớn hơn 0.');
      return;
    }

    const payload = {
      device: fDevice.trim(),
      model: fModel.trim(),
      brand: fBrandVal.trim(),
      origin: fOrigin.trim(),
      spec: fSpec.trim(),
      supplier: fSupplierVal.trim(),
      cat: fCatVal,
      project: fProjectVal.trim(),
      price: fPrice,
      sellPrice: fSellPrice || 0,
      qty: Math.max(1, fQty),
      vat: fVat,
      date: fDate,
      expiry: fExpiry,
      status: fStatusVal,
      note: fNote.trim()
    };

    if (fId) {
      onUpdateQuote({ id: fId, ...payload });
    } else {
      onAddQuote(payload);
    }
    setOpenModal(false);
  };

  // Open detailed inspection dialog
  const handleOpenDetail = (q: Quote) => {
    setSelectedQuote(q);
    setOpenDetailModal(true);
  };

  // Batch import excel parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        const importedList: Omit<Quote, 'id'>[] = [];
        // Skip header index
        rows.slice(1).forEach(r => {
          if (!r[1]) return; // Devices row must have name
          importedList.push({
            device: String(r[1] || ''),
            model: String(r[2] || ''),
            brand: String(r[3] || ''),
            origin: String(r[4] || ''),
            spec: String(r[5] || ''),
            supplier: String(r[6] || ''),
            cat: String(r[7] || 'Khác'),
            project: String(r[8] || ''),
            price: Number(r[9]) || 0,
            sellPrice: Number(r[10]) || 0,
            qty: Number(r[11]) || 1,
            vat: Number(r[12]) || 10,
            date: String(r[15] || new Date().toISOString().slice(0, 10)),
            expiry: String(r[16] || ''),
            status: 'Mới',
            note: String(r[17] || '')
          });
        });

        if (importedList.length > 0) {
          onImportQuotes(importedList);
          alert(`Nhập thành công ${importedList.length} báo giá từ Excel!`);
          setOpenImportModal(false);
        } else {
          alert('Không tìm thấy bản ghi hợp lệ trong file Excel.');
        }
      } catch (err) {
        alert('Lỗi khi đọc file đính kèm, vui lòng tải bản mẫu kiểm tra lại.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // clear input
  };

  const handleExportExcel = () => {
    const headerCols = ['Thiết bị', 'Model', 'Thương hiệu', 'Xuất xứ', 'Thông số KT', 'Nhà cung cấp', 'Danh mục', 'Dự án'];
    if (permissions.seeCost) {
      headerCols.push('Đơn giá mua (VNĐ)', 'Thành tiền mua');
    }
    if (permissions.seeSell) {
      headerCols.push('Đơn giá bán (VNĐ)', 'Thành tiền bán');
    }
    if (permissions.seeProfit) {
      headerCols.push('Tổng Lợi Nhuận', 'Biên Lợi Nhuận (%)');
    }
    headerCols.push('Số lượng', 'Thuế suất VAT (%)', 'Ngày báo', 'Hết hạn', 'Trạng thái', 'Ghi chú');

    const mappedRows = filteredQuotes.map((q, idx) => {
      const baseRow: any[] = [
        q.device,
        q.model,
        q.brand,
        q.origin,
        q.spec,
        q.supplier,
        q.cat,
        q.project
      ];

      if (permissions.seeCost) {
        baseRow.push(q.price, q.price * q.qty);
      }
      if (permissions.seeSell) {
        baseRow.push(q.sellPrice || 0, (q.sellPrice || 0) * q.qty);
      }
      if (permissions.seeProfit) {
        const profit = ((q.sellPrice || 0) - q.price) * q.qty;
        const margin = q.sellPrice ? (((q.sellPrice - q.price) / q.sellPrice) * 100).toFixed(1) + '%' : '0%';
        baseRow.push(profit, margin);
      }

      baseRow.push(q.qty, q.vat, q.date, q.expiry, q.status, q.note);
      return baseRow;
    });

    const ws = XLSX.utils.aoa_to_sheet([headerCols, ...mappedRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prices');
    XLSX.writeFile(wb, 'bao-gia-thiet-bi.xlsx');
  };

  const handleExportCSV = () => {
    const titles = ['STT', 'Thiết bị', 'Model', 'Thương hiệu', 'Nhà cung cấp', 'Số lượng', 'VAT'];
    if (permissions.seeCost) titles.push('Giá mua');
    if (permissions.seeSell) titles.push('Giá bán');
    titles.push('Ngày báo giá', 'Trạng thái');

    const lines = filteredQuotes.map((q, idx) => {
      const columns = [
        idx + 1,
        q.device,
        q.model || '',
        q.brand || '',
        q.supplier,
        q.qty,
        `${q.vat}%`
      ];
      if (permissions.seeCost) columns.push(q.price);
      if (permissions.seeSell) columns.push(q.sellPrice || 0);
      columns.push(q.date, q.status);

      return columns.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = '\uFEFF' + [titles.join(','), ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bao-gia-thiet-bi.csv');
    link.click();
  };

  // Helper clear filters
  const handleClearFilters = () => {
    setSearch('');
    setFSupplier('');
    setFProject('');
    setFCat('');
    setFBrand('');
    setFStatus('');
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Strip */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm thiết bị, model, dự án, ncc..."
              className="w-full text-xs md:text-sm pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition whitespace-normal"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={fCat}
              onChange={(e) => setFCat(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 cursor-pointer outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-white"
            >
              <option value="">Tất cả danh mục</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={fSupplier}
              onChange={(e) => setFSupplier(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 cursor-pointer outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-white max-w-[150px]"
            >
              <option value="">Tất cả nhà cung cấp</option>
              {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={fProject}
              onChange={(e) => setFProject(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 cursor-pointer outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-white max-w-[130px]"
            >
              <option value="">Tất cả dự án</option>
              {uniqueProjects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 cursor-pointer outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 bg-white"
            >
              <option value="">Trạng thái thầu</option>
              <option value="Mới">Mới</option>
              <option value="Chờ duyệt">Chờ duyệt</option>
              <option value="Đã duyệt">Đã duyệt</option>
              <option value="Hết hạn">Hết hạn</option>
            </select>

            <button
              onClick={handleClearFilters}
              className="px-2.5 py-2 text-xs text-gray-500 hover:text-blue-600 border border-gray-300 rounded-lg hover:border-blue-200 transition"
              title="Xóa bộ lọc"
            >
              Xóa lọc
            </button>
          </div>
        </div>
      </div>

      {/* Main quotes Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-3xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2 bg-gray-50/30">
          <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
            Kết quả: <span className="text-blue-600">{filteredQuotes.length}</span> thầu thầu báo giá
          </span>

          <div className="flex gap-2 text-xs">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg font-semibold transition"
            >
              <FileSpreadsheet size={14} /> XLSX / Excel
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg font-semibold transition"
            >
              <Share2 size={14} /> CSV
            </button>
            {permissions.canImport && (
              <button
                onClick={() => setOpenImportModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold border border-indigo-100/50 transition"
              >
                <CloudUpload size={14} /> Nhập Excel/CSV
              </button>
            )}
            {permissions.canAdd && (
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow-3xs"
              >
                <Plus size={14} /> Thêm báo giá mới
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-slate-500">
                <th className="px-4 py-3 font-semibold text-[10px] uppercase w-10 text-center">STT</th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase cursor-pointer select-none min-w-[150px]" onClick={() => requestSort('device')}>
                  Thiết bị <ArrowUpDown size={11} className="inline ml-1" />
                </th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase cursor-pointer select-none" onClick={() => requestSort('model')}>
                  Model <ArrowUpDown size={11} className="inline ml-1" />
                </th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase">Thương hiệu</th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase cursor-pointer select-none min-w-[120px]" onClick={() => requestSort('supplier')}>
                  Nhà cung cấp <ArrowUpDown size={11} className="inline ml-1" />
                </th>
                {permissions.seeCost ? (
                  <th className="px-4 py-3 font-semibold text-[10px] uppercase bg-amber-50/20 text-amber-900 cursor-pointer select-none" onClick={() => requestSort('price')}>
                    Giá nhập (Mua) <ArrowUpDown size={11} className="inline ml-1" />
                  </th>
                ) : (
                  <th className="px-4 py-3 font-semibold text-[10px] uppercase bg-amber-50/10 text-amber-900/40">Цена Mua</th>
                )}
                {permissions.seeSell ? (
                  <th className="px-4 py-3 font-semibold text-[10px] uppercase bg-blue-50/20 text-blue-900 cursor-pointer select-none" onClick={() => requestSort('sellPrice')}>
                    Giá bán thầu <ArrowUpDown size={11} className="inline ml-1" />
                  </th>
                ) : (
                  <th className="px-4 py-3 font-semibold text-[10px] uppercase bg-blue-50/10 text-blue-900/40">Цена Bán</th>
                )}
                {permissions.seeProfit ? (
                  <th className="px-4 py-3 font-semibold text-[10px] uppercase bg-green-50/25 text-green-900 cursor-pointer select-none" onClick={() => requestSort('profit')}>
                    Lợi nhuận gộp <ArrowUpDown size={11} className="inline ml-1" />
                  </th>
                ) : null}
                <th className="px-3 py-3 font-semibold text-[10px] uppercase text-center w-12">SL</th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase min-w-[110px]">Thành tiền mua</th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase text-center">Trạng thái</th>
                <th className="px-4 py-3 font-semibold text-[10px] uppercase text-center">Quản lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {filteredQuotes.map((q, idx) => {
                const totalBuy = q.price * q.qty;
                const devLower = q.device.toLowerCase().trim();
                const isBestPrice = q.price === bestPrices[devLower];
                const unitProfit = (q.sellPrice || 0) - q.price;
                const marginPct = q.sellPrice ? (unitProfit / q.sellPrice) * 100 : 0;

                return (
                  <tr key={q.id} className={`hover:bg-blue-50/20 transition ${isBestPrice ? 'bg-green-50/10' : ''}`}>
                    <td className="px-4 py-3 text-center text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-950 text-xs md:text-sm">{q.device}</div>
                      {q.project && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 text-[9px] font-semibold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100/50">
                          {q.project}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] font-medium text-slate-600">{q.model || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 text-[9px] font-black bg-slate-100 text-slate-600 uppercase rounded-md">
                        {q.brand || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-800 font-medium">{q.supplier}</span>
                      <div className="text-[10px] text-gray-400 mt-0.5">{q.cat}</div>
                    </td>

                    {/* Cost Unit buy price */}
                    <td className="px-4 py-3 whitespace-nowrap bg-amber-50/10 border-x border-amber-50/10">
                      {permissions.seeCost ? (
                        <div>
                          <span className="font-mono font-bold text-amber-700">{formatCurrency(q.price)}</span>
                          {isBestPrice && (
                            <div className="flex items-center gap-0.5 text-[9px] font-bold text-green-600 whitespace-nowrap mt-0.5">
                              <Star size={10} className="fill-green-600 stroke-[3]" /> Giá mua tốt nhất
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="font-semibold text-gray-400 filter blur-xs select-none">******đ</span>
                      )}
                    </td>

                    {/* Cost Unit sell price */}
                    <td className="px-4 py-3 whitespace-nowrap bg-blue-50/10 border-r border-blue-50/10">
                      {permissions.seeSell ? (
                        q.sellPrice > 0 ? (
                          <span className="font-mono font-bold text-blue-700">{formatCurrency(q.sellPrice)}</span>
                        ) : (
                          <span className="text-gray-400 text-[10px] italic">Chưa chào giá</span>
                        )
                      ) : (
                        <span className="font-semibold text-gray-400 filter blur-xs select-none">******đ</span>
                      )}
                    </td>

                    {/* Gross Profit column */}
                    {permissions.seeProfit && (
                      <td className="px-4 py-3 bg-green-50/10 border-r border-green-50/10">
                        {q.sellPrice > 0 ? (
                          <div className="space-y-1">
                            <span className={`font-mono font-bold ${unitProfit >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                              {formatCurrency(unitProfit * q.qty)}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.1 rounded-md
                                ${marginPct >= 20 ? 'bg-green-100 text-green-800' : ''}
                                ${marginPct >= 10 && marginPct < 20 ? 'bg-amber-100 text-amber-800' : ''}
                                ${marginPct < 10 ? 'bg-red-100 text-red-800' : ''}
                              `}>
                                +{marginPct.toFixed(1)}% Biên
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-[10px]">—</span>
                        )}
                      </td>
                    )}

                    <td className="px-3 py-3 text-center font-bold text-slate-800">{q.qty}</td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {permissions.seeCost ? (
                        <div>
                          <span className="font-mono font-bold text-slate-900">{formatCurrency(totalBuy)}</span>
                          <p className="text-[9px] text-gray-400 mt-0.5">Có VAT: {formatCurrency(totalBuy * (1 + q.vat / 100))}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase leading-relaxed
                        ${q.status === 'Đã duyệt' ? 'bg-green-100 text-green-700' : ''}
                        ${q.status === 'Chờ duyệt' ? 'bg-amber-100 text-amber-700' : ''}
                        ${q.status === 'Hết hạn' ? 'bg-rose-100 text-rose-700' : ''}
                        ${q.status === 'Mới' ? 'bg-slate-150 text-slate-600 bg-slate-100' : ''}
                      `}>
                        {q.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(q)}
                          className="p-1 hover:bg-blue-50 text-blue-600 rounded-md transition"
                          title="Xem thông số đầy đủ"
                        >
                          <Eye size={14} />
                        </button>
                        {permissions.canEdit && (
                          <button
                            onClick={() => handleOpenEdit(q)}
                            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-700 rounded-md transition"
                            title="Sửa báo giá"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                        {permissions.canDelete && (
                          <button
                            onClick={() => {
                              setDeleteTargetId(q.id);
                              setDeleteTargetName(q.device);
                            }}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition"
                            title="Xoá báo giá"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-gray-400">
                    <SlidersHorizontal size={36} className="mx-auto text-gray-200 mb-2" />
                    <h4 className="font-semibold text-gray-650">Không kết hợp được bộ lọc kết quả nào</h4>
                    <p className="text-xs text-gray-400 mt-1">Vui lòng thay đổi thông tin lọc tìm kiếm hoặc từ khoá.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Modal to CRUD Quotes */}
      {openModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-155 shadow-xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150-out">
            <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Sparkles size={20} className="text-blue-600" />
                  {fId ? 'Hiệu chỉnh báo giá thầu thiết bị' : 'Tạo mới bản báo giá thầu'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Vui lòng điền thông số chính xác giúp phục vụ đối chiếu</p>
              </div>
              <button
                onClick={() => setOpenModal(false)}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-md transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="text-left">
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {!fId && permissions.canImport && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex justify-between items-center">
                    <span>Bạn có danh sách gồm nhiều thiết bị báo giá?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenModal(false);
                        setOpenImportModal(true);
                      }}
                      className="text-indigo-750 hover:text-indigo-900 font-bold underline cursor-pointer"
                    >
                      Nhập nhanh từ Excel/CSV
                    </button>
                  </div>
                )}

                {formError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle size={14} /> {formError}
                  </div>
                )}

                {/* Section Device spec */}
                <div className="border-l-2 border-blue-600 pl-3 py-0.5">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-widest block">1. Thông tin thiết bị kỹ thuật</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tên thiết bị <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={fDevice}
                      onChange={(e) => setFDevice(e.target.value)}
                      placeholder="VD: UPS Online 10KVA"
                      className="w-full text-xs md:text-sm border border-gray-350 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mã Model (Ký hiệu)</label>
                    <input
                      type="text"
                      value={fModel}
                      onChange={(e) => setFModel(e.target.value)}
                      placeholder="VD: SRT10KXLI"
                      className="w-full text-xs md:text-sm border border-gray-350 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Thương hiệu</label>
                    <input
                      type="text"
                      value={fBrandVal}
                      onChange={(e) => setFBrandVal(e.target.value)}
                      placeholder="VD: APC, Cisco"
                      className="w-full text-xs md:text-sm border border-gray-350 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Xuất xứ</label>
                    <input
                      type="text"
                      value={fOrigin}
                      onChange={(e) => setFOrigin(e.target.value)}
                      placeholder="VD: Mỹ, Nhật Bản"
                      className="w-full text-xs md:text-sm border border-gray-350 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phân loại danh mục</label>
                    <input
                      type="text"
                      list="f-cat-list"
                      value={fCatVal}
                      onChange={(e) => setFCatVal(e.target.value)}
                      placeholder="Chọn hoặc tự nhập danh mục..."
                      className="w-full text-xs md:text-sm border border-gray-350 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition bg-white"
                    />
                    <datalist id="f-cat-list">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Thông số chi tiết kỹ thuật</label>
                  <textarea
                    value={fSpec}
                    onChange={(e) => setFSpec(e.target.value)}
                    placeholder="Nêu rõ công suất, tiêu chuẩn, cổng kết nối..."
                    rows={2}
                    className="w-full text-xs md:text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition resize-none"
                  />
                </div>

                {/* Section Supplier / Projects */}
                <div className="border-l-2 border-indigo-600 pl-3 py-0.5 mt-6">
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-widest block">2. Liên đới Đối tác & Dự án</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nhà cung cấp cung ứng <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      list="f-supplier-list"
                      required
                      value={fSupplierVal}
                      onChange={(e) => setFSupplierVal(e.target.value)}
                      placeholder="Chọn hoặc tự nhập nhà cung cấp..."
                      className="w-full text-xs md:text-sm border border-gray-350 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition bg-white"
                    />
                    <datalist id="f-supplier-list">
                      {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </datalist>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Chi nhánh Dự án đi kèm</label>
                    <input
                      type="text"
                      value={fProjectVal}
                      onChange={(e) => setFProjectVal(e.target.value)}
                      placeholder="VD: Trụ sở HCM 2026"
                      className="w-full text-xs md:text-sm border border-gray-350 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
                    />
                  </div>
                </div>

                {/* Section Money and values */}
                <div className="border-l-2 border-emerald-600 pl-3 py-0.5 mt-6">
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-widest block">3. Định biên Tài chính (Chi phí/Bán thầu)</span>
                </div>

                <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-gray-150">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Đơn giá hợp đồng mua (đ/Cái) <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={fPrice ? fPrice.toLocaleString('vi-VN') : ''}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      placeholder="VD: 45,000,000"
                      className="w-full text-xs md:text-sm border border-gray-350 bg-white rounded-lg px-3 py-2 outline-none focus:border-blue-600 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Số lượng mua bán</label>
                    <input
                      type="number"
                      min={1}
                      value={fQty}
                      onChange={(e) => setFQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-xs md:text-sm border border-gray-350 bg-white rounded-lg px-3 py-2 outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Thuế suất VAT (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={fVat}
                      onChange={(e) => setFVat(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-xs md:text-sm border border-gray-350 bg-white rounded-lg px-3 py-2 outline-none focus:border-blue-600 font-mono"
                    />
                  </div>

                  {/* Pricing dynamic formulas */}
                  <div className="col-span-3 grid grid-cols-2 gap-4 mt-2 pt-3 border-t border-gray-200">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">Đơn giá chào bán (Phương án đầu ra)</label>
                      <input
                        type="text"
                        value={fSellPrice ? fSellPrice.toLocaleString('vi-VN') : ''}
                        onChange={(e) => handleSellPriceChange(e.target.value)}
                        placeholder="VD: 55,000,000"
                        className="w-full text-xs md:text-sm border border-green-300 rounded-lg px-3 py-2 outline-none focus:border-green-600 bg-white font-mono font-bold text-green-700"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-950 uppercase tracking-wider">Xác lập % Lợi nhuận (Biên gộp mục tiêu)</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            step="0.1"
                            value={fMarginPct}
                            onChange={(e) => onMarginPctChange(e.target.value)}
                            placeholder="VD: 20"
                            className="w-full text-xs md:text-sm border border-gray-300 rounded-lg pl-3 pr-7 py-2 outline-none focus:border-blue-600 bg-white"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCalcSellPriceFromMargin}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 hover:scale-103 active:scale-97 text-white text-xs font-bold rounded-lg transition"
                          title="Tính đơn giá bán theo công thức Biên gộp: Giá mua ÷ (1 − % Biên)"
                        >
                          Điền tự động
                        </button>
                      </div>
                    </div>

                    <div className="col-span-2 text-[10px] text-gray-400 bg-emerald-50 text-emerald-800 p-2 rounded-lg leading-relaxed">
                      💡 <strong>Mẹo tính biên gộp thương mại:</strong> Công thức chuẩn hóa: <code className="font-mono bg-white px-1 border rounded font-semibold text-emerald-900 shadow-3xs">Giá bán = Giá mua ÷ (1 − Biên%)</code>.
                      Sử dụng phím <strong>Điền tự động</strong> giúp khớp các phép thầu của dự thầu.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ngày báo giá</label>
                    <input
                      type="date"
                      value={fDate}
                      onChange={(e) => setFDate(e.target.value)}
                      className="w-full text-xs md:text-sm border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hạn hết hiệu lực thầu</label>
                    <input
                      type="date"
                      value={fExpiry}
                      onChange={(e) => setFExpiry(e.target.value)}
                      className="w-full text-xs md:text-sm border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trạng thái hồ sơ</label>
                    <select
                      value={fStatusVal}
                      onChange={(e: any) => setFStatusVal(e.target.value)}
                      className="w-full text-xs md:text-sm border border-gray-350 rounded-lg px-2.5 py-2 bg-white"
                    >
                      <option value="Mới">Mới</option>
                      <option value="Chờ duyệt">Chờ duyệt</option>
                      <option value="Đã duyệt">Đã duyệt</option>
                      <option value="Hết hạn">Hết hạn</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Các điều khoản ràng buộc / Ghi chú</label>
                  <textarea
                    value={fNote}
                    onChange={(e) => setFNote(e.target.value)}
                    placeholder="VD: Điều khoản thanh toán trả chậm 30 ngày, bảo hành mở rộng chính hãng..."
                    rows={2}
                    className="w-full text-xs md:text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/70 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs md:text-sm font-semibold hover:bg-gray-100 text-gray-700 transition"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs md:text-sm font-bold transition shadow-xs"
                >
                  Lưu hồ sơ báo giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Quote Modal */}
      {openDetailModal && selectedQuote && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150-out">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-md border border-blue-100 uppercase tracking-wide">
                  Chi Tiết Thầu Hồ Sơ
                </span>
                <h3 className="font-bold text-gray-900 text-lg mt-1">{selectedQuote.device}</h3>
              </div>
              <button
                onClick={() => setOpenDetailModal(false)}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-md transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs md:text-sm">
              <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
                <div>
                  <span className="text-gray-400 block mb-0.5 text-[10px] uppercase font-bold tracking-wider">Model hiệu</span>
                  <span className="font-mono font-semibold text-gray-900">{selectedQuote.model || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5 text-[10px] uppercase font-bold tracking-wider">Thương hiệu</span>
                  <span className="font-semibold text-gray-900">{selectedQuote.brand || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5 text-[10px] uppercase font-bold tracking-wider">Xuất xứ</span>
                  <span className="font-semibold text-gray-900">{selectedQuote.origin || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5 text-[10px] uppercase font-bold tracking-wider">Nhà cung cấp</span>
                  <span className="font-semibold text-blue-600">{selectedQuote.supplier}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Thông số kỹ thuật</span>
                <div className="p-3 bg-gray-50 border border-gray-150 rounded-lg text-gray-750 leading-relaxed font-mono text-xs">
                  {selectedQuote.spec || 'Chưa cập nhật cụ thể thông số.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-3 bg-slate-50 border border-gray-150 p-4 rounded-xl text-xs">
                {permissions.seeCost ? (
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wide">Giá thầu mua (chưa VAT)</span>
                    <span className="font-mono font-bold text-amber-700 text-sm md:text-base">{formatCurrency(selectedQuote.price)}</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wide">Giá thầu mua</span>
                    <span className="font-semibold text-gray-300 filter blur-xs selection:hidden">******đ</span>
                  </div>
                )}

                {permissions.seeSell ? (
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wide">Giá bán thầu và chào thầu</span>
                    <span className="font-mono font-bold text-blue-700 text-sm md:text-base">{selectedQuote.sellPrice > 0 ? formatCurrency(selectedQuote.sellPrice) : 'Chưa chào'}</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wide">Giá bán thầu</span>
                    <span className="font-semibold text-gray-300 filter blur-xs selection:hidden">******đ</span>
                  </div>
                )}

                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wide">Số lượng hàng hóa</span>
                  <span className="font-bold text-gray-800">{selectedQuote.qty} cái</span>
                </div>

                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wide">Thuế suất gia tăng VAT</span>
                  <span className="font-bold text-gray-800">{selectedQuote.vat}%</span>
                </div>
              </div>

              {permissions.seeProfit && selectedQuote.sellPrice > 0 && (
                <div className="p-4 bg-emerald-50 text-emerald-950 border border-emerald-200 rounded-xl flex items-center justify-between text-xs md:text-sm">
                  <div>
                    <span className="text-emerald-800 font-bold block text-[10px] uppercase tracking-wide">Lợi Nhuận Gộp Tổng SL</span>
                    <span className="font-mono font-black text-emerald-700 text-lg">
                      {formatCurrency((selectedQuote.sellPrice - selectedQuote.price) * selectedQuote.qty)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-emerald-800 font-bold block text-[10px] uppercase tracking-wide">Tỷ lệ Biên gộp</span>
                    <span className="font-black text-blue-700 text-base">
                      {(((selectedQuote.sellPrice - selectedQuote.price) / selectedQuote.sellPrice) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {selectedQuote.note && (
                <div className="p-3 bg-yellow-50 text-yellow-905 border border-yellow-100 rounded-xl text-xs flex gap-2">
                  <Info size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-[10px] uppercase text-yellow-800 mb-0.5">Ràng buộc hợp đồng và bảo hành</span>
                    <span>{selectedQuote.note}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setOpenDetailModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-100 text-gray-700"
              >
                Đóng
              </button>
              {permissions.canEdit && (
                <button
                  onClick={() => {
                    setOpenDetailModal(false);
                    handleOpenEdit(selectedQuote);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Sửa báo giá
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Excel template upload popup */}
      {openImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-md w-full overflow-hidden p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <CloudUpload size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Nhập khối dữ liệu từ Excel / CSV</h3>
              <p className="text-xs text-slate-500 mt-1">Tải lên danh sách báo giá thầu nhanh chóng để so so sánh giá.</p>
            </div>

            {/* Instruction container */}
            <div className="text-left bg-slate-50 p-3.5 rounded-xl border border-slate-150 text-[11px] space-y-2">
              <p className="font-bold text-slate-700">Cấu trúc các cột của tệp tải lên:</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-500 font-mono text-[10px]">
                <div>• Cột 2 (B): Tên thiết bị *</div>
                <div>• Cột 3 (C): Model</div>
                <div>• Cột 4 (D): Thương hiệu</div>
                <div>• Cột 5 (E): Xuất xứ</div>
                <div>• Cột 6 (F): Thông số KT</div>
                <div>• Cột 7 (G): Nhà cung cấp</div>
                <div>• Cột 8 (H): Phân loại</div>
                <div>• Cột 9 (I): Dự án</div>
                <div>• Cột 10 (J): Đơn giá mua</div>
                <div>• Cột 11 (K): Đơn giá bán</div>
                <div>• Cột 12 (L): Số lượng</div>
                <div>• Cột 13 (M): Thuế VAT (%)</div>
                <div>• Cột 16 (P): Ngày báo</div>
                <div>• Cột 17 (Q): Hạn thầu</div>
                <div className="col-span-2">• Cột 18 (R): Ràng buộc thầu</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    const headers = [
                      'STT', 'Thiết bị', 'Model', 'Thương hiệu', 'Xuất xứ', 'Thông số KT', 
                      'Nhà cung cấp', 'Phân loại', 'Dự án', 'Đơn giá mua', 'Đơn giá bán', 
                      'Số lượng', 'VAT', 'Ngày báo', 'Hết hạn', 'Ghi chú'
                    ];
                    const sampleRows = [
                      [1, 'UPS APC Online SRM 10KVA', 'SRM10K', 'APC', 'Mỹ', '10kVA, 230V, rackmount', 'TID CO', 'Cơ khí', 'Trụ sở HCM 2026', 45000000, 52000000, 2, 10, '2026-05-26', '2026-12-31', 'Giao hàng tận nơi'],
                      [2, 'Switch Cisco Catalyst 24 Port', 'C9200L-24T-4G', 'Cisco', 'Trung Quốc', '24x 10/100/1000, 4x 1G', 'Đối tác thầu 2', 'Mạng', 'Dự án Toà nhà', 22000000, 27500000, 5, 10, '2026-05-26', '2026-09-30', 'Bảo hành chính hãng 12 tháng']
                    ];
                    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Bao_Gia');
                    XLSX.writeFile(wb, 'mau_danh_sach_bao_gia.xlsx');
                  } catch (err: any) {
                    alert('Lỗi tạo tệp mẫu: ' + err.message);
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold underline focus:outline-none flex items-center gap-1 cursor-pointer pt-1"
              >
                📥 Tải File Excel Mẫu Chuẩn (.xlsx)
              </button>
            </div>

            <label
              htmlFor="excel-upload-file"
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-5 cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 transition group"
            >
              <FileSpreadsheet size={28} className="text-gray-300 group-hover:text-blue-500 mb-1.5" />
              <span className="text-xs font-semibold text-gray-650 group-hover:text-blue-900">Chọn tệp đính kèm thầu</span>
              <span className="text-[10px] text-gray-400 mt-0.5">Hỗ trợ .xlsx hoặc .csv dưới 5MB</span>
              <input
                id="excel-upload-file"
                type="file"
                accept=".xlsx, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="flex justify-end gap-2 text-xs pt-2">
              <button
                type="button"
                onClick={() => setOpenImportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-100 text-gray-700 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom confirmation modal for deleting quote */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-xl max-w-sm w-full overflow-hidden p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-50 text-red-650 rounded-full flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900 text-base">Xác nhận xóa báo giá</h3>
              <p className="text-xs text-slate-500">
                Bạn chắc chắn muốn xóa vĩnh viễn báo giá thiết bị thầu <strong className="text-gray-900 font-bold">"{deleteTargetName}"</strong>? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetId(null);
                  setDeleteTargetName('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-100 text-gray-700 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteQuote(deleteTargetId);
                  setDeleteTargetId(null);
                  setDeleteTargetName('');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition shadow-3xs hover:scale-[1.01] active:scale-95"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
