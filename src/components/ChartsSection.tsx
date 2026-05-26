import React from 'react';
import { Quote, RolePerms } from '../types';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Trophy, TrendingUp, Presentation, AlertCircle, EyeOff } from 'lucide-react';

interface ChartsSectionProps {
  quotes: Quote[];
  permissions: RolePerms;
}

const COLORS = ['#1e6bdc', '#0fa968', '#e8940a', '#e03e3e', '#6c63ff', '#06b6d4', '#d97706', '#8b5cf6'];

export default function ChartsSection({ quotes, permissions }: ChartsSectionProps) {

  // 1. So sánh đơn giá theo thiết bị & nhà cung cấp (chỉ chọn thiết bị có nhiều hơn 1 NCC báo giá)
  const deviceCounts = quotes.reduce((acc, q) => {
    acc[q.device] = (acc[q.device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deviceMulti = Object.keys(deviceCounts).filter(dev => deviceCounts[dev] > 1);

  // Collect unique suppliers
  const suppliers = Array.from(new Set(quotes.map(q => q.supplier))).sort();

  // Map data to structure: { device: string, [supplier1_price]: number, [supplier2_price]: number }
  const comparePriceData = deviceMulti.map(dev => {
    const item: Record<string, any> = { device: dev };
    suppliers.forEach(sup => {
      const match = quotes.find(q => q.device === dev && q.supplier === sup);
      if (match) {
        // Price in million VND
        item[sup] = Math.round(match.price / 1_000_000);
      }
    });
    return item;
  });

  // 2. Tổng giá trị thầu mua theo nhà cung cấp (triệu VND)
  const supplierTotalBuy = suppliers.map(sup => {
    const supQuotes = quotes.filter(q => q.supplier === sup);
    const sum = supQuotes.reduce((s, q) => s + q.price * q.qty, 0);
    return {
      name: sup.length > 20 ? sup.slice(0, 20) + '...' : sup,
      'Tổng mua': Math.round(sum / 1_000_000)
    };
  }).sort((a, b) => b['Tổng mua'] - a['Tổng mua']);

  // 3. Phân bổ báo giá theo danh mục (quy về số lượng mục)
  const catDistributionObject = quotes.reduce((acc, q) => {
    acc[q.cat] = (acc[q.cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const catData = Object.entries(catDistributionObject).map(([catName, count]) => ({
    name: catName,
    value: count
  }));

  // 4. Lợi nhuận gộp thực tế theo dự án (triệu VND)
  const projects = Array.from(new Set(quotes.map(q => q.project).filter(Boolean)));
  const projectProfits = projects.map(proj => {
    const projQuotes = quotes.filter(q => q.project === proj);
    const profit = projQuotes.reduce((sum, q) => sum + ((q.sellPrice || 0) * q.qty - q.price * q.qty), 0);
    return {
      name: proj.length > 20 ? proj.slice(0, 20) + '...' : proj,
      'Lợi nhuận': Math.round(profit / 1_000_000)
    };
  }).sort((a, b) => b['Lợi nhuận'] - a['Lợi nhuận']);

  // 5. Phân bổ thương hiệu
  const brandCounter = quotes.reduce((acc, q) => {
    const b = q.brand || 'Khác';
    acc[b] = (acc[b] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const brandData = Object.entries(brandCounter).map(([brandName, count]) => ({
    name: brandName,
    value: count
  })).sort((a,b) => b.value - a.value).slice(0, 8); // Top 8 brands

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="text-blue-600" size={24} />
          Biểu đồ phân tích cấu trúc báo giá
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Trực quan hóa sự cạnh tranh giữa các nhà cung cấp, biên giá trị dự án và mật độ phân loại thiết bị
        </p>
      </div>

      {permissions.seeCost ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Chart: Device unit price comparisons among various suppliers */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs lg:col-span-2 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-gray-800">So sánh đơn giá thiết bị giữa các Nhà cung cấp</h3>
              <p className="text-[11px] text-gray-400">Đơn vị: Triệu đồng (Tr.đ/Cái) · Chỉ hiển thị thiết bị có từ 2 báo giá trở lên</p>
            </div>
            {comparePriceData.length > 0 ? (
              <div className="h-80 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparePriceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="device" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis tickFormatter={(val) => `${val}M`} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`${value}M VNĐ`, 'Giá thầu']} labelClassName="font-semibold text-xs" />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    {suppliers.map((sup, idx) => (
                      <Bar
                        key={sup}
                        dataKey={sup}
                        name={sup}
                        fill={COLORS[idx % COLORS.length]}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={45}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-gray-200">
                <Trophy size={36} className="text-gray-300 mb-2" />
                <h4 className="text-xs font-semibold text-gray-500">Chưa đủ dữ liệu biểu mẫu so sánh</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Cần thêm tối thiểu 2 báo giá khác nhau cho cùng một sản phẩm/thiết bị.</p>
              </div>
            )}
          </div>

          {/* Chart 2: Total Buying value per Supplier */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs space-y-3">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Tổng giá trị thầu (giá mua) theo Nhà cung cấp</h3>
              <p className="text-[11px] text-gray-400">Đơn vị: Triệu đồng / Khảo sát thị phần báo cáo</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supplierTotalBuy} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(v) => `${v}M`} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} width={110} />
                  <Tooltip formatter={(v) => [`${v}M VNĐ`, 'Tổng giá mua']} />
                  <Bar dataKey="Tổng mua" fill="#1e6bdc" radius={[0, 4, 4, 0]}>
                    {supplierTotalBuy.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Category proportions */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs space-y-3">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Phân bổ báo giá theo Danh mục thầu</h3>
              <p className="text-[11px] text-gray-400">Quy mô theo tần suất sản phẩm yêu cầu</p>
            </div>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={catData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={75}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {catData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} thiết bị`, 'Số lượng']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Net profit by project (Safeguarded by permissions.seeProfit) */}
          {permissions.seeProfit && permissions.seeSell ? (
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs space-y-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Dự phỏng lợi nhuận gộp theo Dự án</h3>
                <p className="text-[11px] text-gray-400">Đơn vị: Triệu đồng · (Giá bán - Giá nhập) × Số lượng</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectProfits} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `${v}M`} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`${v}M VNĐ`, 'LN thực tính']} />
                    <Area type="monotone" dataKey="Lợi nhuận" stroke="#10b981" fillOpacity={1} fill="url(#profitGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col items-center justify-center text-center">
              <EyeOff size={28} className="text-gray-300 mb-2" />
              <h4 className="text-xs font-semibold text-gray-400">Ẩn phân tích tài chính lợi nhuận</h4>
              <p className="text-[10px] text-gray-400 max-w-xs mt-0.5">
                Vai trò hiện hữu không sở hữu quyền xem giá bán / thông số biên tương hỗ lợi nhuận phục vụ dự toán.
              </p>
            </div>
          )}

          {/* Chart 5: Brand Distribution */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs space-y-3">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Thương hiệu Thiết bị phổ dụng</h3>
              <p className="text-[11px] text-gray-400">Tỷ lệ thương hiệu cấu thành trong rổ hàng hoá báo giá</p>
            </div>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={brandData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name }) => name}
                  >
                    {brandData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} thiết bị`, 'Số lượng']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-white border border-gray-100 rounded-2xl shadow-sm text-center max-w-md mx-auto my-12">
          <AlertCircle size={32} className="text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900 mb-1">Ẩn phân tích thông số giá</h3>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            Cấu hình phân quyền hệ thống của bạn không khả dụng tính năng xem giá thầu tổng quan. Hãy nâng cấp vai trò hoặc liên hệ Admin.
          </p>
        </div>
      )}
    </div>
  );
}
