import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Users, DollarSign, ShoppingBag, PlusCircle, HeartHandshake, Loader2, Zap, Trophy, Plus, Activity, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api/axios';

export default function Dashboard() {
  const currentUser = useAppStore(s => s.currentUser);
  const registrants = useAppStore(s => s.registrants);
  const expenses = useAppStore(s => s.expenses);
  const solicitations = useAppStore(s => s.solicitations);
  const pointLogs = useAppStore(s => s.pointLogs);
  const hasBooted = useAppStore(s => s.hasBooted);
  const hasSyncedLive = useAppStore(s => s.hasSyncedLive);

  const [tribeList, setTribeList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.get('/api/org/groups').then(res => {
      if (Array.isArray(res.data)) {
        setTribeList(res.data.map((g: any) => ({
          id: g.id || g._id,
          name: g.name
        })));
      }
    }).catch(err => console.error("Failed to fetch tribes for dashboard", err));
  }, []);

  const isAdmin = currentUser?.role?.toLowerCase().trim() === 'admin';
  const roleKey = currentUser?.role?.toLowerCase().trim();
  const rolePerms = currentUser?.permissionMatrix?.[roleKey || ''];
  const canAddSolicitations = isAdmin || rolePerms?.solicitations?.add === true;
  const canLogExpenses = isAdmin || rolePerms?.expenses?.add === true;
  const canAddRegistrants = isAdmin || rolePerms?.registrants?.add === true;

  // Tribe Scores Calculation
  const tribes = useMemo(() => {
    const map: Record<string, number> = {};
    pointLogs.filter(p => p.verified).forEach(p => {
      const gId = p.groupId?.id || p.groupId?._id;
      if (!gId) return;
      map[gId] = (map[gId] || 0) + p.points;
    });

    return tribeList.map(t => ({
      ...t,
      score: map[t.id] || 0
    })).sort((a, b) => b.score - a.score);
  }, [tribeList, pointLogs]);


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
      registrantsExcludeJam: registrants.filter(r => (r.church || '').toUpperCase().trim() !== 'JAM').length,
      jamRegistrants: registrants.filter(r => (r.church || '').toUpperCase().trim() === 'JAM').length,
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
    registrantsExcludeJam,
    jamRegistrants,
    totalRegRecorded,
    verifiedReg,
    totalSolRecorded,
    verifiedSol,
    totalItemsExpected,
    totalItemsClaimed,
    totalIncomeVerified,
    totalExpensesVerified,
    totalIncomeRecorded,
    totalExpensesRecorded,
    netBalance
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
        {/* Main Participants (Excluding JAM) */}
        <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-brand-beige flex items-start gap-3 hover:shadow-md transition-shadow">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Participants (Campers)</p>
            <h3 className="text-2xl font-bold text-gray-800 leading-tight">{registrantsExcludeJam}</h3>
          </div>
        </div>

        {/* JAM Registrants Only */}
        <div className="bg-white p-3 md:p-6 rounded-2xl shadow-sm border border-brand-beige flex items-start gap-3 hover:shadow-md transition-shadow">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <HeartHandshake size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Total STAFF</p>
            <h3 className="text-2xl font-bold text-gray-800 leading-tight">{jamRegistrants}</h3>
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
            <p className={`text-[9px] italic mt-0.5 ${(totalRegRecorded - verifiedReg) > 0 ? 'text-orange-400 font-bold' : 'text-gray-300'}`}>
              {(totalRegRecorded - verifiedReg) > 0 ? `₱${(totalRegRecorded - verifiedReg).toLocaleString()} pending` : 'Verified'}
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
            <p className={`text-[9px] italic mt-0.5 ${(totalSolRecorded - verifiedSol) > 0 ? 'text-orange-400 font-bold' : 'text-gray-300'}`}>
              {(totalSolRecorded - verifiedSol) > 0 ? `₱${(totalSolRecorded - verifiedSol).toLocaleString()} pending` : 'Verified'}
            </p>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-beige flex items-start gap-3 hover:shadow-md transition-shadow">
          <div className="p-2.5 bg-green-50 text-green-700 rounded-lg">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Total Income (Net)</p>
            <h3 className="text-2xl font-bold text-green-700 leading-tight">₱{totalIncomeVerified.toLocaleString()}</h3>
            <p className={`text-[9px] italic mt-0.5 ${(totalIncomeRecorded - totalIncomeVerified) > 0 ? 'text-orange-400 font-bold' : 'text-gray-300'}`}>
               {(totalIncomeRecorded - totalIncomeVerified) > 0 ? `₱${(totalIncomeRecorded - totalIncomeVerified).toLocaleString()} pending` : 'Verified'}
            </p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-brand-beige flex items-start gap-3 hover:shadow-md transition-shadow outline outline-1 outline-red-50">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
            <ShoppingBag size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Total Expenses</p>
            <h3 className="text-2xl font-bold text-red-600 leading-tight">₱{totalExpensesVerified.toLocaleString()}</h3>
            <p className={`text-[9px] italic mt-0.5 ${(totalExpensesRecorded - totalExpensesVerified) > 0 ? 'text-orange-400 font-bold' : 'text-gray-300'}`}>
              {(totalExpensesRecorded - totalExpensesVerified) > 0 ? `₱${(totalExpensesRecorded - totalExpensesVerified).toLocaleString()} pending` : 'Verified'}
            </p>
          </div>
        </div>

        {/* Total Balance */}
        <div className={`bg-white p-4 rounded-xl shadow-sm border border-brand-beige flex items-start gap-3 hover:shadow-md transition-shadow ring-1 ${netBalance >= 0 ? 'ring-brand-sand/20' : 'ring-red-100'}`}>
          <div className={`p-2.5 rounded-lg ${netBalance >= 0 ? 'bg-brand-sand/30 text-brand-brown' : 'bg-red-50 text-red-500'}`}>
            <Zap size={20} fill={netBalance >= 0 ? 'currentColor' : 'none'} opacity={netBalance >= 0 ? 0.3 : 1} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Net Balance (LIVE)</p>
            <h3 className={`text-2xl font-bold leading-tight ${netBalance >= 0 ? 'text-brand-brown' : 'text-red-500'}`}>₱{netBalance.toLocaleString()}</h3>
            <p className="text-[9px] text-gray-400 italic mt-0.5 font-medium tracking-tight">Verified Snapshot</p>
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

      {/* Tribe Standings (Integrated Leaderboard) */}
      {(isAdmin || rolePerms?.points?.view) && (
        <Link to="/points" className="block group mb-6">
          <div className="bg-white rounded-2xl border border-brand-sand shadow-sm overflow-hidden hover:shadow-md transition-all">
            <div className="p-3 border-b border-gray-50 flex items-center justify-between bg-brand-cream/10">
               <div className="flex items-center gap-2">
                  <Trophy size={14} className="text-brand-sand group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-brand-brown uppercase tracking-widest">Live Tribe Standings</span>
               </div>
               <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                 View Ops Center <Plus size={10} />
               </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 divide-x divide-y divide-gray-50">
               {tribes.map((tribe, idx) => (
                 <div key={idx} className="p-3 flex flex-col items-center justify-center text-center hover:bg-brand-cream/5 transition-colors">
                    <span className={`text-[9px] font-black mb-0.5 ${
                        idx === 0 ? 'text-amber-600' :
                        idx === 1 ? 'text-gray-400' :
                        idx === 2 ? 'text-orange-600' :
                        'text-gray-300'
                    }`}>#{idx + 1}</span>
                    <span className="text-[10px] font-bold text-gray-700 truncate w-full mb-0.5">{tribe.name}</span>
                    <span className={`text-xl font-display tracking-tight leading-none ${tribe.score >= 0 ? 'text-brand-brown font-bold' : 'text-red-500 font-bold'}`}>
                      {tribe.score}
                    </span>
                 </div>
               ))}
               {tribes.length === 0 && <div className="col-span-full py-8 text-center text-[10px] text-gray-300 font-bold uppercase tracking-widest">Awaiting Scoring Data</div>}
            </div>
          </div>
        </Link>
      )}

      {/* Recent Activity Feed (Capped 1-5) */}
      {(isAdmin || rolePerms?.points?.view) && (
        <div className="bg-white rounded-2xl border border-brand-sand shadow-sm overflow-hidden mb-6">
          <div className="p-3 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
             <div className="flex items-center gap-2">
                <Activity size={14} className="text-brand-brown" />
                <span className="text-[10px] font-black text-brand-brown uppercase tracking-widest">Recent Activity Journal</span>
             </div>
             <Link to="/points" className="text-[9px] font-bold text-gray-400 hover:text-brand-brown transition-colors uppercase tracking-widest flex items-center gap-1">
               Full History <ChevronRight size={10} />
             </Link>
          </div>
          <div className="divide-y divide-gray-50">
             {pointLogs.slice(0, 5).map((log: any) => (
               <div key={log.id || log._id} className="p-3 flex items-center justify-between gap-4 hover:bg-brand-cream/5 transition-colors group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                       log.type === 'merit' ? 'bg-green-50 border-green-100 text-green-500' : 'bg-red-50 border-red-100 text-red-500'
                     }`}>
                        {log.type === 'merit' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                     </div>
                     <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                           <span className="text-[11px] font-bold text-gray-700 truncate">{log.groupId?.name}</span>
                           {!log.verified && <span className="bg-amber-100 text-amber-700 text-[8px] px-1 rounded font-black uppercase">Pending</span>}
                        </div>
                        <p className="text-[10px] text-gray-400 truncate leading-tight">{log.reason}</p>
                     </div>
                  </div>
                  <div className="text-right shrink-0">
                     <span className={`text-base font-display block leading-none ${log.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {log.points > 0 ? `+${log.points}` : log.points}
                     </span>
                     <span className="text-[8px] text-gray-300 font-bold uppercase tracking-tighter">
                        {log.createdBy?.church}
                     </span>
                  </div>
               </div>
             ))}
             {pointLogs.length === 0 && <div className="py-10 text-center text-[10px] text-gray-300 uppercase font-black tracking-widest">Awaiting First Entry</div>}
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



    </div>
  );
}
