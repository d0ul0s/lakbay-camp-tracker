import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';
import { Activity, Filter, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

interface Log {
  _id: string;
  userId: any;
  userRole: string;
  userChurch?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: any;
  timestamp: string;
}

export default function ActivityLogs() {
  const { currentUser, globalError } = useAppStore();
  const [logs, setLogs] = useState<Log[]>([]);
  const [filterAction, setFilterAction] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [totalLogs, setTotalLogs] = useState(0);
  const [itemsPerPage] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);

  const fetchLogs = async () => {
    const rolePerms = currentUser?.permissionMatrix?.[currentUser.role]?.activitylogs;
    if (currentUser?.role !== 'admin' && !rolePerms?.view) return; // Not allowed
    try {
      setIsFetching(true);
      const params = new URLSearchParams();
      if (filterAction !== 'All') params.append('action', filterAction);
      if (filterRole !== 'All') params.append('role', filterRole);
      if (filterDate) params.append('date', filterDate);
      params.append('page', String(currentPage));
      params.append('itemsPerPage', String(itemsPerPage));

      const res = await api.get(`/api/activity-logs?${params.toString()}`);
      setLogs(res.data.logs || []);
      setTotalLogs(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAction, filterRole, filterDate, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterAction, filterRole, filterDate]);

  const rolePerms = currentUser?.permissionMatrix?.[currentUser.role]?.activitylogs;
  if (currentUser?.role !== 'admin' && !rolePerms?.view) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-brand-beige max-w-md w-full">
          <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-display text-brand-brown mb-2">Restricted Access</h2>
          <p className="text-gray-500">You do not have permission to view Activity Logs.</p>
        </div>
      </div>
    );
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-700';
      case 'UPDATE': return 'bg-blue-100 text-blue-700';
      case 'DELETE': return 'bg-red-100 text-red-700';
      case 'VERIFY': return 'bg-purple-100 text-purple-700';
      case 'UNVERIFY': return 'bg-orange-100 text-orange-700';
      case 'CLAIM_MERCH': return 'bg-green-50 text-green-600 border-green-200';
      case 'UNCLAIM_MERCH': return 'bg-red-50 text-red-600 border-red-200';
      case 'MERCH_UPDATE': return 'bg-brand-sand/20 text-brand-brown border-brand-sand';
      case 'LOGIN': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'VISIT': return 'bg-brand-beige text-brand-brown border-brand-sand';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const parseDetails = (log: Log) => {
    const { details, action } = log;
    if (action === 'VISIT') {
      return `Page View: ${details?.path || '/'} (${details?.userAgent?.split(' ')[0] || 'Unknown'})`;
    }
    if (action === 'LOGIN') {
      return details?.message || 'Authenticated successfully';
    }

    if (!details) return '';
    if (typeof details === 'string') return details;
    
    let summary = details.name || details.sourceName || details.description || '';
    
    if (details.items) {
      const parts = Object.entries(details.items).map(([key, val]) => {
        const name = key.charAt(0).toUpperCase() + key.slice(1);
        return `${val ? '+' : '-'}${name}`;
      });
      const itemsStr = parts.join(', ');
      return summary ? `${summary} (${itemsStr})` : itemsStr;
    }
    
    if (details.item) {
       const name = details.item.charAt(0).toUpperCase() + details.item.slice(1);
       return summary ? `${summary} (${name})` : name;
    }

    const { changes, ...rest } = details;
    return summary || (Object.keys(rest).length ? JSON.stringify(rest) : 'Updated fields');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-brand-beige pb-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-display text-brand-brown tracking-wide flex items-center gap-2">
            <Activity className="shrink-0" size={20} /> Activity Logs
          </h2>
          <p className="text-gray-400 text-[10px] md:text-sm mt-0.5">Immutable audit trail of system modifications.</p>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-1.5 text-[9px] md:text-xs">
          {[['CREATE','bg-green-100 text-green-700'],['UPDATE','bg-blue-100 text-blue-700'],['DELETE','bg-red-100 text-red-700'],['VERIFY','bg-purple-100 text-purple-700'],['VISIT','bg-brand-beige text-brand-brown'],['LOGIN','bg-indigo-100 text-indigo-700']].map(([label, cls]) => (
            <span key={label} className={`px-1.5 py-0.5 rounded font-black uppercase tracking-tighter ${cls}`}>{label}</span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden">
        {/* Filters */}
        <div className="p-3 border-b border-gray-100 flex flex-col md:flex-row gap-3 bg-gray-50/50">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <Filter size={16} className="text-gray-400 hidden lg:block mr-1" />
            
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[9px] text-gray-400 uppercase tracking-widest mb-0.5 font-black">Action</label>
              <select 
                value={filterAction} 
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full py-1.5 pl-2 pr-6 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown text-[11px] font-bold"
              >
                <option value="All">All Actions</option>
                <option value="VISIT">VISIT</option>
                <option value="LOGIN">LOGIN</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="MERCH_UPDATE">MERCH</option>
                <option value="DELETE">DELETE</option>
                <option value="VERIFY">VERIFY</option>
                <option value="UNVERIFY">UNVERIFY</option>
              </select>
            </div>
 
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[9px] text-gray-400 uppercase tracking-widest mb-0.5 font-black">User Role</label>
              <select 
                value={filterRole} 
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full py-1.5 pl-2 pr-6 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown text-[11px] font-bold"
              >
                <option value="All">All Roles</option>
                <option value="admin">Admin</option>
                <option value="treasurer">Treasurer</option>
                <option value="coordinator">Coordinator</option>
                <option value="anonymous">Anonymous</option>
              </select>
            </div>
 
            <div className="flex-1 min-w-[120px]">
              <label className="block text-[9px] text-gray-400 uppercase tracking-widest mb-0.5 font-black">Date</label>
              <input 
                type="date" 
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full py-1 px-2 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown text-[11px] font-bold"
              />
            </div>
            
            {(filterAction !== 'All' || filterRole !== 'All' || filterDate) && (
              <div className="flex items-end">
                <button 
                  onClick={() => { setFilterAction('All'); setFilterRole('All'); setFilterDate(''); }}
                  className="text-[10px] font-black text-brand-brown hover:underline mb-1 whitespace-nowrap"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="text-xs text-gray-400 uppercase bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Timestamp</th>
                <th className="px-6 py-4 font-medium tracking-wider">User</th>
                <th className="px-6 py-4 font-medium tracking-wider">Action</th>
                <th className="px-6 py-4 font-medium tracking-wider">Entity</th>
                <th className="px-6 py-4 font-medium tracking-wider w-1/3">Target Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 relative">
              {isFetching && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 transition-opacity">
                  <div className="flex flex-col items-center gap-2">
                    <Activity className="animate-pulse text-brand-brown" size={32} />
                    <span className="text-[10px] font-black uppercase text-brand-brown tracking-widest">Loading Logs...</span>
                  </div>
                </div>
              )}
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-brand-cream/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-500 whitespace-nowrap">
                    {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900 capitalize block">{log.userRole}</span>
                    {log.userChurch && <span className="text-xs text-gray-400 mt-0.5 max-w-[180px] truncate block" title={log.userChurch}>{log.userChurch}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-700">{log.entityType}</td>
                  <td className="px-6 py-4 text-gray-600">
                    <div className="font-medium text-brand-brown">{parseDetails(log)}</div>
                    {log.details?.amount !== undefined && (
                      <div className="text-xs text-gray-400 mt-0.5">₱{Number(log.details.amount).toLocaleString()}</div>
                    )}
                    {log.details?.amountPaid !== undefined && (
                      <div className="text-xs text-gray-400 mt-0.5">Paid: ₱{Number(log.details.amountPaid).toLocaleString()}</div>
                    )}
                    {log.details?.changes && Array.isArray(log.details.changes) && (
                      <ul className="text-xs space-y-0.5 text-gray-500 bg-gray-50 p-2 mt-2 rounded border border-gray-100 max-h-32 overflow-y-auto">
                        {log.details.changes.map((change: string, idx: number) => (
                          <li key={idx}>• {change}</li>
                        ))}
                      </ul>
                    )}
                    {log.entityId && (
                      <div className="text-[10px] text-gray-300 font-mono mt-1" title={String(log.entityId)}>ID: {String(log.entityId).slice(-8)}</div>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    {globalError ? 'Failed to fetch logs.' : 'No activity logs match your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-2 px-1 relative min-h-[200px]">
          {isFetching && (
             <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 transition-opacity">
                <Activity className="animate-pulse text-brand-brown" size={24} />
             </div>
          )}
          {logs.map((log) => (
            <div key={log._id} className="mobile-card flex flex-col gap-2">
              <div className="flex justify-between items-center bg-gray-50/50 -mx-1 px-2 py-1 rounded-t-lg border-b border-gray-100/50">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter shrink-0 border ${getActionColor(log.action)}`}>
                  {log.action}
                </span>
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                  {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                </span>
              </div>
              
              <div className="flex flex-col gap-1 px-1">
                <p className="text-[13px] font-black text-brand-brown leading-tight">
                  <span className="text-gray-300 font-black mr-1.5 text-[10px] uppercase">[{log.entityType}]</span> 
                  {parseDetails(log)}
                </p>
                
                {log.details?.changes && Array.isArray(log.details.changes) && (
                  <div className="bg-gray-50/80 p-1.5 rounded-lg border border-gray-100 mt-0.5">
                    <ul className="text-[10px] space-y-0.5 text-gray-500 font-medium">
                      {log.details.changes.slice(0, 3).map((change: string, idx: number) => (
                        <li key={idx} className="flex gap-1 items-start">
                          <span className="text-brand-brown/30 font-black">•</span>
                          <span className="truncate">{change}</span>
                        </li>
                      ))}
                      {log.details.changes.length > 3 && <li className="text-[9px] italic text-gray-400 pl-2">+{log.details.changes.length - 3} more changes...</li>}
                    </ul>
                  </div>
                )}
                
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-brand-sand/50 flex items-center justify-center text-[8px] font-black text-brand-brown">
                      {log.userRole.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{log.userRole}</span>
                  </div>
                  {log.userChurch && (
                    <span className="text-[9px] font-bold text-gray-300 truncate max-w-[120px]">{log.userChurch}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="mobile-card py-12 text-center text-gray-400">
              <Activity size={48} className="mx-auto opacity-10 mb-2" />
              <p className="text-sm">No activity logs found.</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {Math.ceil(totalLogs / itemsPerPage) > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
            <span className="text-[10px] md:text-sm text-gray-500 font-bold uppercase tracking-tight">
              Page {currentPage} of {Math.ceil(totalLogs / itemsPerPage)} <span className="text-gray-300 mx-1">|</span> {totalLogs.toLocaleString()} Total Logs
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isFetching}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] md:text-sm font-black uppercase tracking-tighter disabled:opacity-30 active:scale-95 transition-all"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalLogs / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(totalLogs / itemsPerPage) || isFetching}
                className="px-3 py-1.5 rounded-lg border-2 border-brand-brown text-brand-brown text-[10px] md:text-sm font-black uppercase tracking-tighter disabled:opacity-30 active:scale-95 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
