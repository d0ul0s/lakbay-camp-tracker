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
  details: any;
  timestamp: string;
}

export default function ActivityLogs() {
  const { currentUser, globalError } = useAppStore();
  const [logs, setLogs] = useState<Log[]>([]);
  
  const [filterAction, setFilterAction] = useState('All');
  const [filterRole, setFilterRole] = useState('All');
  const [filterDate, setFilterDate] = useState('');

  const fetchLogs = async () => {
    if (currentUser?.role === 'coordinator') return; // Not allowed
    try {
      const params = new URLSearchParams();
      if (filterAction !== 'All') params.append('action', filterAction);
      if (filterRole !== 'All') params.append('role', filterRole);
      if (filterDate) params.append('date', filterDate);

      const res = await api.get(`/api/activity-logs?${params.toString()}`);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAction, filterRole, filterDate]);

  if (currentUser?.role === 'coordinator') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-brand-beige max-w-md w-full">
          <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-display text-brand-brown mb-2">Restricted Access</h2>
          <p className="text-gray-500">Audit logs are exclusively accessible to Camp Administrators and Treasurers.</p>
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
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const parseDetails = (details: any) => {
    if (!details) return '';
    if (typeof details === 'string') return details;
    if (details.name) return details.name;
    if (details.sourceName) return details.sourceName;
    if (details.description) return details.description;
    return JSON.stringify(details);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-beige pb-4">
        <div>
          <h2 className="text-3xl font-display text-brand-brown tracking-wide flex items-center gap-3">
            <Activity className="shrink-0" /> Activity Logs
          </h2>
          <p className="text-gray-500 text-sm mt-1">Immutable audit trail of system modifications.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-beige overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 bg-gray-50/50">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <Filter size={18} className="text-gray-400 hidden lg:block mr-2" />
            
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1 font-bold">Action</label>
              <select 
                value={filterAction} 
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full py-2 pl-3 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
              >
                <option value="All">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="VERIFY">VERIFY</option>
                <option value="UNVERIFY">UNVERIFY</option>
              </select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1 font-bold">User Role</label>
              <select 
                value={filterRole} 
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full py-2 pl-3 pr-8 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
              >
                <option value="All">All Roles</option>
                <option value="admin">Admin</option>
                <option value="treasurer">Treasurer</option>
                <option value="coordinator">Coordinator</option>
              </select>
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1 font-bold">Date</label>
              <input 
                type="date" 
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full py-1.5 px-3 rounded-lg border border-gray-200 focus:outline-none focus:border-brand-brown"
              />
            </div>
            
            {(filterAction !== 'All' || filterRole !== 'All' || filterDate) && (
              <div className="flex items-end">
                <button 
                  onClick={() => { setFilterAction('All'); setFilterRole('All'); setFilterDate(''); }}
                  className="mt-5 text-sm font-medium text-brand-brown hover:underline"
                >
                  Clear Filters
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
            <tbody className="divide-y divide-gray-100">
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
                  <td className="px-6 py-4 text-gray-600 truncate max-w-sm" title={parseDetails(log.details)}>{parseDetails(log.details)}</td>
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
        <div className="md:hidden divide-y divide-gray-100">
          {logs.map((log) => (
            <div key={log._id} className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shrink-0 ${getActionColor(log.action)}`}>
                  {log.action}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 border-l-2 border-brand-brown pl-2 ml-1 my-1">
                  [{log.entityType}] {parseDetails(log.details)}
                </p>
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="capitalize font-bold text-gray-700">{log.userRole}</span>
                  {log.userChurch && <span>• {log.userChurch}</span>}
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">No activity logs found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
