import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAppStore } from '../store';
import { Users, DollarSign, ShoppingBag, PlusCircle, ArrowRight, HeartHandshake, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Registrant, Expense, AppSettings, Solicitation } from '../types';

export default function Dashboard() {
  const { currentUser } = useAppStore();
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [solicitations, setSolicitations] = useState<Solicitation[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ churches: [], merchCosts: { tshirt: 0, bag: 0, notebook: 0, pen: 0 } } as any);

  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      try {
        const token = currentUser?.token;

        const [regRes, expRes, setRes, solRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/registrants`, {

          }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/expenses`, {

          }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL}/api/settings`, {

          }),
          axios.get(`${import.meta.env.VITE_API_URL}/api/solicitations`, {

          }).catch(() => ({ data: [] }))
        ]);

        setRegistrants(regRes.data);
        setExpenses(expRes.data);
        setSolicitations(solRes.data);

        if (setRes.data) {
          setSettings({
            ...setRes.data,
            churches: setRes.data.churchList || [],
            merchCosts: setRes.data.merchCosts || {
              tshirt: 0,
              bag: 0,
              notebook: 0,
              pen: 0
            }
          });
        }

      } catch (err) {
        console.error("Dashboard fetch error", err);
      }
    };

    fetchData();
  }, [currentUser?._id]);

  const isAdmin = currentUser?.role === 'admin';
  const isTreasurer = currentUser?.role === 'treasurer';
  const canViewFinancials = isAdmin || isTreasurer;

  // Filter data based on role
  // All roles now see global stats on dashboard
  const visibleRegistrants = registrants;
  const totalRegistrants = visibleRegistrants.length;
  // Financial stats
  const expectedCollection = visibleRegistrants.reduce((sum, r) => sum + (r.feeType === 'Early Bird' ? 350 : 500), 0);
  const totalCollected = visibleRegistrants.reduce((sum, r) => sum + r.amountPaid, 0);

  // Merch stats
  const totalItemsExpected = totalRegistrants * 4;
  const totalItemsClaimed = visibleRegistrants.reduce((sum, r) => {
    let claimed = 0;
    if (r.merchClaims.tshirt) claimed++;
    if (r.merchClaims.bag) claimed++;
    if (r.merchClaims.notebook) claimed++;
    if (r.merchClaims.pen) claimed++;
    return sum + claimed;
  }, 0);

  const totalMerchProductionCost =
    ((settings.merchCosts?.tshirt || 0) * totalRegistrants) +
    ((settings.merchCosts?.bag || 0) * totalRegistrants) +
    ((settings.merchCosts?.notebook || 0) * totalRegistrants) +
    ((settings.merchCosts?.pen || 0) * totalRegistrants);

  // Expenses stats
  const campExpenses = expenses.reduce((sum, e) => sum + e.amount, 0) + totalMerchProductionCost;

  // Pie Chart Data
  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    if (totalMerchProductionCost > 0) {
      map.set('Merch Production', (map.get('Merch Production') || 0) + totalMerchProductionCost);
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [expenses, totalMerchProductionCost]);

  const COLORS = ['#8b5c40', '#d4a373', '#e9edc9', '#ccd5ae', '#faedcd', '#fefae0', '#e3d5ca', '#ddbea9'];

  // Solicitations stats
  const totalSolicitations = solicitations.reduce((sum, s) => sum + s.amount, 0);
  const verifiedSolicitations = solicitations.filter(s => s.verifiedByTreasurer).reduce((sum, s) => sum + s.amount, 0);
  const solicitationGap = totalSolicitations - verifiedSolicitations;

  // Registration verified gap
  const verifiedRegistrants = visibleRegistrants.filter(r => r.verifiedByTreasurer).reduce((sum, r) => sum + r.amountPaid, 0);
  const registrantGap = totalCollected - verifiedRegistrants;

  // Refined Income Logic
  const totalIncome = totalCollected + totalSolicitations;
  const verifiedIncome = verifiedRegistrants + verifiedSolicitations;
  const unverifiedGap = totalIncome - verifiedIncome;

  const totalExpensesAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const verifiedExpenses = expenses.filter(e => e.verifiedByTreasurer).reduce((sum, e) => sum + e.amount, 0);
  const expenseGap = totalExpensesAmount - verifiedExpenses;

  // Pie Chart Data - Income Breakdown uses TOTAL data
  const incomeBreakdown = useMemo(() => [
    { name: 'Registration Fees', value: totalCollected },
    { name: 'Solicitations', value: totalSolicitations }
  ].filter(d => d.value > 0), [totalCollected, totalSolicitations]);
  const INCOME_COLORS = ['#4ade80', '#34d399'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-display text-brand-brown tracking-wide mb-2 md:mb-0">
          Dashboard Overview
        </h2>

        <div className="flex flex-wrap gap-3">
          <Link to="/registrants" className="flex items-center gap-2 bg-brand-brown text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-light-brown transition-colors">
            <PlusCircle size={18} /> Add Registrant
          </Link>
          <Link to="/expenses" className="flex items-center gap-2 bg-brand-sand text-brand-brown px-4 py-2 rounded-lg font-bold hover:bg-opacity-80 transition-colors">
            <PlusCircle size={18} /> Log Expense
          </Link>
          {canViewFinancials && (
            <Link to="/solicitations" className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold hover:bg-green-200 transition-colors">
              <HeartHandshake size={18} /> Add Solicitation
            </Link>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Registrants */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-beige flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Registrants</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{totalRegistrants}</h3>
          </div>
        </div>

        {/* Registration Income */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-beige flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Registration Income</p>
            <div className="flex items-end gap-2 mt-1">
              <h3 className="text-3xl font-bold text-gray-800">₱{totalCollected.toLocaleString()}</h3>
            </div>
            <p className="text-xs text-gray-400 mt-1">Expected: ₱{expectedCollection.toLocaleString()}</p>
          </div>
        </div>

        {/* Solicitation Income */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-beige flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-brand-sand/30 text-brand-brown rounded-xl">
            <HeartHandshake size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Solicitation Income</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">₱{totalSolicitations.toLocaleString()}</h3>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-beige flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-brand-brown/10 text-brand-brown rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Total Income</p>
            <h3 className="text-3xl font-bold text-brand-brown mt-1">₱{totalIncome.toLocaleString()}</h3>
            <p className="text-xs text-gray-400 mt-1">Reg + Solicitations</p>
          </div>
        </div>

        {/* Merch Claims */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-beige flex items-start gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <ShoppingBag size={24} />
          </div>
          <div className="w-full">
            <p className="text-sm text-gray-500 font-medium">Delegates Completed</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">{totalItemsClaimed} <span className="text-lg text-gray-400 font-normal">/ {totalItemsExpected}</span></h3>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
              <div
                className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: totalItemsExpected ? `${(totalItemsClaimed / totalItemsExpected) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary & Breakdown (Admin/Treasurer) */}
      <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-display text-2xl text-brand-brown tracking-wide">Camp Financial Summary</h3>
          <Link to="/reports" className="text-sm text-brand-light-brown hover:underline flex items-center gap-1 font-medium">
            View full report <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 h-full">
          <div className="p-8 text-center bg-white flex flex-col justify-center">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Income</p>
            <p className="text-4xl font-bold text-green-600 mt-3">₱{totalIncome.toLocaleString()}</p>
          </div>
          <div className="p-8 text-center bg-white flex flex-col justify-center">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Expenses</p>
            <p className="text-4xl font-bold text-red-500 mt-3">₱{campExpenses.toLocaleString()}</p>
          </div>
          <div className="p-8 text-center bg-white flex flex-col justify-center">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">Net Balance</p>
            <p className={`text-4xl font-bold mt-3 ${(totalIncome - campExpenses) >= 0 ? 'text-brand-brown' : 'text-red-500'}`}>
              ₱{(totalIncome - campExpenses).toLocaleString()}
            </p>
          </div>
        </div>
      </div>


      {/* Financial Charts (All Roles) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-display text-xl text-brand-brown tracking-wide">Income Breakdown</h3>
          </div>
          <div className="p-6 flex-1 flex items-center justify-center min-h-[260px]">
            {incomeBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={incomeBreakdown} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="value">
                    {incomeBreakdown.map((_entry, index) => (
                      <Cell key={`ic-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 italic text-sm">No income recorded yet</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-display text-xl text-brand-brown tracking-wide">Expense Breakdown</h3>
          </div>
          <div className="p-6 flex-1 flex items-center justify-center min-h-[260px]">
            {expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={expenseBreakdown} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="value">
                    {expenseBreakdown.map((_entry: any, index: number) => (
                      <Cell key={`ec-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 italic text-sm">No expenses logged yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Verified Gap Table (Admin/Treasurer) */}
      {canViewFinancials && (
        <div className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <ShieldCheck size={20} className="text-brand-brown" />
            <h3 className="font-display text-xl text-brand-brown tracking-wide">Treasurer Verification Gap</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 font-medium text-left">Category</th>
                  <th className="px-6 py-3 font-medium text-right">Total Recorded</th>
                  <th className="px-6 py-3 font-medium text-right">Verified (₱)</th>
                  <th className="px-6 py-3 font-medium text-right">Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { label: 'Registration Fees', total: totalCollected, verified: verifiedRegistrants, gap: registrantGap },
                  { label: 'Solicitations', total: totalSolicitations, verified: verifiedSolicitations, gap: solicitationGap },
                  { label: 'TOTAL INCOME', total: totalIncome, verified: verifiedIncome, gap: unverifiedGap, isMain: true },
                  { label: 'Manual Expenses', total: totalExpensesAmount, verified: verifiedExpenses, gap: expenseGap },
                  { label: 'Merch Production', total: totalMerchProductionCost, verified: totalMerchProductionCost, gap: 0 },
                  { label: 'TOTAL EXPENSES', total: campExpenses, verified: verifiedExpenses + totalMerchProductionCost, gap: expenseGap, isMain: true }
                ].map(row => (
                  <tr key={row.label} className={`${row.gap > 0 ? 'bg-orange-50/50' : ''} ${(row as any).isMain ? 'bg-gray-50 border-y border-gray-100 font-bold' : ''}`}>
                    <td className="px-6 py-3 font-medium text-gray-800">{(row as any).isMain ? <span className="text-brand-brown">{row.label}</span> : row.label}</td>
                    <td className="px-6 py-3 text-right text-gray-700">₱{row.total.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-green-700 font-medium">₱{row.verified.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right">
                      {row.gap > 0 ? (
                        <span className="font-bold text-orange-600">₱{row.gap.toLocaleString()} ⚠️</span>
                      ) : (
                        <span className="text-green-600 font-bold">✔ Fully Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


    </div>
  );
}
