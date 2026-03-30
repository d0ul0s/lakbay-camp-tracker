import { useMemo } from 'react';
import { useAppStore } from '../store';
import { Users, DollarSign, ShoppingBag, PlusCircle, ArrowRight, HeartHandshake, ShieldCheck, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Dashboard() {
  const currentUser = useAppStore(s => s.currentUser);
  const registrants = useAppStore(s => s.registrants);
  const expenses = useAppStore(s => s.expenses);
  const solicitations = useAppStore(s => s.solicitations);
  const hasBooted = useAppStore(s => s.hasBooted);
  const hasSyncedLive = useAppStore(s => s.hasSyncedLive);

  const isAdmin = currentUser?.role?.toLowerCase().trim() === 'admin';
  const roleKey = currentUser?.role?.toLowerCase().trim();
  const rolePerms = currentUser?.permissionMatrix?.[roleKey || ''];
  const canAddSolicitations = isAdmin || rolePerms?.solicitations?.add === true;
  const canLogExpenses = isAdmin || rolePerms?.expenses?.add === true;
  const canAddRegistrants = isAdmin || rolePerms?.registrants?.add === true;
  const canViewFinancials = isAdmin || rolePerms?.reports?.view === true || rolePerms?.expenses?.viewAll === true;

  // Financial stats (Memoized)
  const stats = useMemo(() => {
    const totalRegRecorded = registrants.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
    const verifiedReg = registrants.filter(r => r.verifiedByTreasurer).reduce((sum, r) => sum + (r.amountPaid || 0), 0);
    const regGap = totalRegRecorded - verifiedReg;

    const totalSolRecorded = solicitations.reduce((sum, s) => sum + (s.amount || 0), 0);
    const verifiedSol = solicitations.filter(s => s.verifiedByTreasurer).reduce((sum, s) => sum + (s.amount || 0), 0);
    const solGap = totalSolRecorded - verifiedSol;

    const totalExpRecorded = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const verifiedExp = expenses.filter(e => e.verifiedByTreasurer).reduce((sum, e) => sum + (e.amount || 0), 0);
    const expGap = totalExpRecorded - verifiedExp;

    const totalItemsExpected = registrants.length * 4;
    const totalItemsClaimed = registrants.reduce((sum, r) => {
      let claimed = 0;
      if (r.merchClaims.tshirt) claimed++;
      if (r.merchClaims.bag) claimed++;
      if (r.merchClaims.notebook) claimed++;
      if (r.merchClaims.pen) claimed++;
      return sum + claimed;
    }, 0);

    const totalIncomeVerified = verifiedReg + verifiedSol;
    const totalExpensesVerified = verifiedExp;
    const netBalance = totalIncomeVerified - totalExpensesVerified;
    
    const totalIncomeRecorded = totalRegRecorded + totalSolRecorded;
    const totalExpensesRecorded = totalExpRecorded;

    return {
      totalRegistrants: registrants.length,
      totalRegRecorded,
      verifiedReg,
      regGap,
      totalSolRecorded,
      verifiedSol,
      solGap,
      totalExpRecorded,
      verifiedExp,
      expGap,
      totalItemsExpected,
      totalItemsClaimed,
      totalIncomeVerified,
      totalExpensesVerified,
      netBalance,
      totalIncomeRecorded,
      totalExpensesRecorded
    };
  }, [registrants, solicitations, expenses]);

  const {
    totalRegistrants,
    totalRegRecorded,
    verifiedReg,
    regGap,
    totalSolRecorded,
    verifiedSol,
    solGap,
    totalExpRecorded,
    verifiedExp,
    expGap,
    totalItemsExpected,
    totalItemsClaimed,
    totalIncomeVerified,
    totalExpensesVerified,
    netBalance,
    totalIncomeRecorded,
    totalExpensesRecorded
  } = stats;

  // Charts use TOTAL recorded for better visualization of progress
  const incomeBreakdown = useMemo(() => [
    { name: 'Registration Fees', value: totalRegRecorded },
    { name: 'Solicitations', value: totalSolRecorded }
  ].filter(d => d.value > 0), [totalRegRecorded, totalSolRecorded]);

  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const EXPENSE_COLORS = ['#8b5c40', '#d4a373', '#e9edc9', '#ccd5ae', '#faedcd', '#fefae0', '#e3d5ca', '#ddbea9'];
  const INCOME_COLORS = ['#4ade80', '#34d399'];

  const hasCachedData = registrants.length > 0 || expenses.length > 0;

  if (!hasBooted && !hasCachedData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-brand-brown animate-in fade-in duration-500">
        <Loader2 className="w-12 h-12 animate-spin mb-6 opacity-80" />
        <h2 className="text-xl font-display tracking-widest animate-pulse">SYNCING CAMP DATA</h2>
        <p className="text-sm text-gray-500 mt-2 font-medium">Establishing secure live connection...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h2 className="text-2xl md:text-3xl font-display text-brand-brown tracking-wide mb-1 md:mb-0 flex items-center gap-3">
          Dashboard Overview
          {!hasSyncedLive && (
            <span className="flex items-center gap-1.5 text-xs font-sans font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full animate-pulse">
              <Loader2 size={11} className="animate-spin" /> Syncing...
            </span>
          )}
        </h2>

        {/* Actions - Desktop Only */}
        <div className="hidden md:flex flex-wrap gap-3">
          {canAddRegistrants && (
            <Link 
              to="/registrants"
              className="flex items-center gap-2 bg-brand-brown text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-light-brown transition-colors shadow-sm"
            >
              <PlusCircle size={20} /> Add Registrant
            </Link>
          )}
          {canLogExpenses && (
            <Link 
              to="/expenses"
              className="flex items-center gap-2 bg-gray-800 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-gray-700 transition-colors shadow-sm"
            >
              <PlusCircle size={20} /> Log Expense
            </Link>
          )}
          {canAddSolicitations && (
            <Link 
              to="/solicitations"
              className="flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-green-800 transition-colors shadow-sm"
            >
              <HeartHandshake size={20} /> Add Solicitation
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-6">
        {/* Total Registrants */}
        <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-brand-beige flex items-start gap-3 hover:shadow-md transition-shadow">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Total Registrants</p>
            <h3 className="text-2xl font-bold text-gray-800 leading-tight">{totalRegistrants}</h3>
          </div>
        </div>

        {/* Registration Income */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-beige flex items-start gap-3 hover:shadow-md transition-shadow">
          <div className="p-2.5 bg-green-50 text-green-600 rounded-lg">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Reg. Income</p>
            <div className="flex items-end gap-1.5 leading-tight">
              <h3 className="text-2xl font-bold text-gray-800">₱{verifiedReg.toLocaleString()}</h3>
            </div>
            <p className={`text-[9px] italic mt-0.5 ${regGap > 0 ? 'text-orange-400 font-bold' : 'text-gray-300'}`}>
              ₱{regGap.toLocaleString()} pending
            </p>
          </div>
        </div>

        {/* Solicitation Income */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-beige flex items-start gap-3 hover:shadow-md transition-shadow">
          <div className="p-2.5 bg-brand-sand/30 text-brand-brown rounded-lg">
            <HeartHandshake size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Solicitations</p>
            <h3 className="text-2xl font-bold text-gray-800 leading-tight">₱{verifiedSol.toLocaleString()}</h3>
            <p className={`text-[9px] italic mt-0.5 ${solGap > 0 ? 'text-orange-400 font-bold' : 'text-gray-300'}`}>
              ₱{solGap.toLocaleString()} pending
            </p>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-beige flex items-start gap-3 hover:shadow-md transition-shadow">
          <div className="p-2.5 bg-brand-brown/10 text-brand-brown rounded-lg">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Total Income (Net)</p>
            <h3 className="text-2xl font-bold text-brand-brown leading-tight">₱{totalIncomeVerified.toLocaleString()}</h3>
            <p className={`text-[9px] italic mt-0.5 ${(totalIncomeRecorded - totalIncomeVerified) > 0 ? 'text-orange-400 font-bold' : 'text-gray-300'}`}>
              ₱{(totalIncomeRecorded - totalIncomeVerified).toLocaleString()} pending
            </p>
          </div>
        </div>

        {/* Merch Claims */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-beige flex items-start gap-3 hover:shadow-md transition-shadow">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
            <ShoppingBag size={20} />
          </div>
          <div className="w-full">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Claims Efficiency</p>
            <h3 className="text-2xl font-bold text-gray-800 leading-tight">{totalItemsClaimed} <span className="text-xs text-gray-400 font-normal">/ {totalItemsExpected}</span></h3>
            <div className="w-full bg-gray-100 h-1 rounded-full mt-1.5">
              <div
                className="bg-purple-500 h-1 rounded-full transition-all duration-500"
                style={{ width: totalItemsExpected ? `${(totalItemsClaimed / totalItemsExpected) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {canViewFinancials && (
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-brand-beige overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-display text-lg text-brand-brown tracking-wide">Camp Financial Summary</h3>
            <Link to="/reports" className="text-xs text-brand-light-brown hover:underline flex items-center gap-1 font-medium">
              Report Detail <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="p-4 text-center bg-white">
              <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Total Income</p>
              <p className="text-2xl font-black text-green-600">₱{totalIncomeVerified.toLocaleString()}</p>
            </div>
            <div className="p-4 text-center bg-white">
              <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Total Expenses</p>
              <p className="text-2xl font-black text-red-500">₱{totalExpensesVerified.toLocaleString()}</p>
            </div>
            <div className="p-4 text-center bg-white">
              <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Net Balance</p>
              <p className={`text-2xl font-black ${netBalance >= 0 ? 'text-brand-brown' : 'text-red-500'}`}>
                ₱{netBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Financial Charts (All Roles) */}
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-brand-beige overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-display text-sm text-brand-brown tracking-wide">Income Breakdown</h3>
          </div>
          <div className="p-2 flex-1 flex items-center justify-center min-h-[180px]">
            {incomeBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={incomeBreakdown} cx="50%" cy="50%" labelLine={false} outerRadius={35} dataKey="value">
                    {incomeBreakdown.map((_entry, index) => (
                      <Cell key={`ic-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={20} wrapperStyle={{ fontSize: '7px', paddingTop: '5px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 italic text-xs">No income yet</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-brand-beige overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-display text-sm text-brand-brown tracking-wide">Expense Breakdown</h3>
          </div>
          <div className="p-2 flex-1 flex items-center justify-center min-h-[180px]">
            {expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={expenseBreakdown} cx="50%" cy="50%" labelLine={false} outerRadius={35} dataKey="value">
                    {expenseBreakdown.map((_entry: any, index: number) => (
                      <Cell key={`ec-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₱${Number(value).toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={20} wrapperStyle={{ fontSize: '7px', paddingTop: '5px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 italic text-xs">No expenses yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Verified Gap Table (Admin) */}
      {canViewFinancials && (
        <div className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden col-span-1 lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <ShieldCheck size={20} className="text-brand-brown" />
            <h3 className="font-display text-xl text-brand-brown tracking-wide">Verification Gap</h3>
          </div>
          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-gray-100">
            {[
              { label: 'Registration Fees', total: totalRegRecorded, verified: verifiedReg, gap: regGap },
              { label: 'Solicitations', total: totalSolRecorded, verified: verifiedSol, gap: solGap },
              { label: 'TOTAL INCOME', total: totalIncomeRecorded, verified: totalIncomeVerified, gap: totalIncomeRecorded - totalIncomeVerified, isMain: true },
              { label: 'Manual Expenses', total: totalExpRecorded, verified: verifiedExp, gap: expGap },
              { label: 'TOTAL EXPENSES', total: totalExpensesRecorded, verified: totalExpensesVerified, gap: totalExpensesRecorded - totalExpensesVerified, isMain: true }
            ].map(row => (
              <div key={row.label} className={`p-3 ${row.gap > 0 ? 'bg-orange-50/30' : ''} ${row.isMain ? 'bg-gray-50' : ''}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold ${row.isMain ? 'text-brand-brown' : 'text-gray-700'}`}>{row.label}</span>
                  {row.gap > 0 ? (
                    <span className="text-[9px] font-black text-orange-600 px-1.5 py-0.5 bg-orange-100 rounded-full tracking-tighter">GAP: ₱{row.gap.toLocaleString()} ⚠️</span>
                  ) : (
                    <span className="text-[8px] font-black text-green-600 uppercase tracking-tighter">Verified ✔</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex justify-between border-r border-gray-100 pr-2">
                    <span className="text-gray-400 uppercase tracking-tighter">Recorded</span>
                    <span className="font-bold text-gray-700">₱{row.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pl-1">
                    <span className="text-gray-400 uppercase tracking-tighter">Verified</span>
                    <span className="font-bold text-green-700">₱{row.verified.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
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
                  { label: 'Registration Fees', total: totalRegRecorded, verified: verifiedReg, gap: regGap },
                  { label: 'Solicitations', total: totalSolRecorded, verified: verifiedSol, gap: solGap },
                  { label: 'TOTAL INCOME', total: totalIncomeRecorded, verified: totalIncomeVerified, gap: totalIncomeRecorded - totalIncomeVerified, isMain: true },
                  { label: 'Manual Expenses', total: totalExpRecorded, verified: verifiedExp, gap: expGap },
                  { label: 'TOTAL EXPENSES', total: totalExpensesRecorded, verified: totalExpensesVerified, gap: totalExpensesRecorded - totalExpensesVerified, isMain: true }
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
