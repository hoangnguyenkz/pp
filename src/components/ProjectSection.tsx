import React from 'react';
import { Quote, RolePerms } from '../types';
import { Target, FileBadge2, Briefcase, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ProjectSectionProps {
  quotes: Quote[];
  permissions: RolePerms;
}

export default function ProjectSection({ quotes, permissions }: ProjectSectionProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatMillions = (val: number) => {
    return (val / 1_000_000).toFixed(1) + 'M';
  };

  // Group quotes by distinct projects (excluding empty project names)
  const projects = Array.from(new Set(quotes.map(q => q.project).filter(Boolean))).sort();

  if (projects.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white rounded-2xl border border-gray-100 max-w-md mx-auto my-12 shadow-sm">
        <Target size={44} className="mx-auto text-gray-300 mb-3" />
        <h3 className="text-base font-bold text-gray-900 mb-1">Chưa có dự án nào</h3>
        <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
          Báo giá hiện hành chưa liên kết tới các mã dự án thầu cụ thể. Vui lòng thêm/sửa báo giá thầu và chọn tên dự án tương ứng.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="text-blue-600" size={24} />
          Theo dõi báo giá theo Dự án ({projects.length})
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Tổng hợp chi phí mua sắm vật tư, doanh số bán thầu dự trù và biên lợi nhuận thương mại thầu theo từng công trình
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((proj, idx) => {
          const projQuotes = quotes.filter(q => q.project === proj);
          const totalItems = projQuotes.length;
          const suppliersNum = new Set(projQuotes.map(q => q.supplier)).size;

          const totalCost = projQuotes.reduce((sum, q) => sum + q.price * q.qty, 0);
          const totalSell = projQuotes.reduce((sum, q) => sum + (q.sellPrice || 0) * q.qty, 0);
          const netProfit = totalSell > 0 ? totalSell - totalCost : 0;
          const averageMargin = totalSell > 0 ? ((totalSell - totalCost) / totalSell * 100).toFixed(1) : '0';

          return (
            <div
              key={proj}
              className="bg-white rounded-xl border border-gray-200 shadow-3xs overflow-hidden hover:shadow-sm transition"
            >
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-950 text-sm md:text-base leading-tight">
                    {proj}
                  </h3>
                  <p className="text-[10px] md:text-xs text-indigo-700 font-bold mt-1 uppercase tracking-wider">
                    {totalItems} thiết bị thầu · {suppliersNum} Đối tác NCC
                  </p>
                </div>
                <div className="w-9 h-9 bg-indigo-50 text-indigo-700 rounded-lg flex items-center justify-center font-bold">
                  #{idx + 1}
                </div>
              </div>

              {/* Body table summarizing device items */}
              <div className="p-5 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse text-gray-700">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-bold">
                        <th className="pb-1.5 font-bold uppercase tracking-wider">Thiết bị</th>
                        <th className="pb-1.5 font-bold uppercase tracking-wider">Nhà cung cấp</th>
                        {permissions.seeCost && <th className="pb-1.5 font-bold uppercase tracking-wider">Giá mua</th>}
                        {permissions.seeSell && <th className="pb-1.5 font-bold uppercase tracking-wider">Giá bán</th>}
                        <th className="pb-1.5 font-bold uppercase tracking-wider text-center">SL</th>
                        <th className="pb-1.5 font-bold uppercase tracking-wider text-center">TT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {projQuotes.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50/50">
                          <td className="py-2 font-bold text-gray-900 max-w-[120px] truncate" title={q.device}>{q.device}</td>
                          <td className="py-2 text-slate-500 max-w-[100px] truncate" title={q.supplier}>{q.supplier}</td>
                          
                          {permissions.seeCost ? (
                            <td className="py-2 font-mono text-amber-700 font-bold">
                              {formatCurrency(q.price)}
                            </td>
                          ) : null}

                          {permissions.seeSell ? (
                            <td className="py-2 font-mono text-blue-700 font-bold">
                              {q.sellPrice > 0 ? formatCurrency(q.sellPrice) : '—'}
                            </td>
                          ) : null}

                          <td className="py-2 text-center text-slate-900 font-bold">{q.qty}</td>
                          <td className="py-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide
                              ${q.status === 'Đã duyệt' ? 'bg-green-50 text-green-700' : ''}
                              ${q.status === 'Chờ duyệt' ? 'bg-amber-50 text-amber-700' : ''}
                              ${q.status === 'Hết hạn' ? 'bg-rose-50 text-rose-700' : ''}
                              ${q.status === 'Mới' ? 'bg-slate-100 text-slate-600' : ''}
                            `}>
                              {q.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Aggregate project totals footer card */}
                <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-center">
                  {permissions.seeCost ? (
                    <div className="p-2 bg-indigo-50/20 border border-indigo-100/30 rounded-lg">
                      <p className="text-[9px] text-gray-400 uppercase font-black tracking-wider">Đầu tư mua thầu</p>
                      <p className="text-xs md:text-sm font-bold text-indigo-900 mt-0.5">{formatCurrency(totalCost)}</p>
                    </div>
                  ) : (
                    <div className="p-2 bg-gray-100 text-gray-300 rounded-lg">
                      <p className="text-[9px] uppercase tracking-wide font-black text-gray-400">Đầu tư</p>
                      <p className="text-xs filter blur-xs select-none">*******đ</p>
                    </div>
                  )}

                  {permissions.seeSell ? (
                    <div className="p-2 bg-blue-50/20 border border-blue-100/30 rounded-lg">
                      <p className="text-[9px] text-gray-400 uppercase font-black tracking-wider">Tổng giá bán thầu</p>
                      <p className="text-xs md:text-sm font-bold text-blue-900 mt-0.5">
                        {totalSell > 0 ? formatCurrency(totalSell) : 'Chưa chào'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 bg-gray-100 text-gray-300 rounded-lg">
                      <p className="text-[9px] uppercase tracking-wide font-black text-gray-400">Doanh thu thầu</p>
                      <p className="text-xs filter blur-xs select-none">*******đ</p>
                    </div>
                  )}

                  {permissions.seeProfit && totalSell > 0 ? (
                    <div className="col-span-2 p-2.5 bg-green-50/20 border border-green-150/50 rounded-lg flex items-center justify-between px-3 text-left">
                      <div>
                        <span className="text-[9px] text-green-800 uppercase font-black tracking-wider block">Dự tính Lợi nhuận gộp</span>
                        <span className="text-sm font-bold text-green-700">{formatCurrency(netProfit)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-blue-800 uppercase font-black tracking-wider block">Biên Lợi Nhuận Gộp</span>
                        <span className="text-sm font-bold text-blue-700">{averageMargin}%</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
