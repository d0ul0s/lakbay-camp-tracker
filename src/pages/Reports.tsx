import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';
import Papa from 'papaparse';
import { Download, FileBox, Users, Receipt, HeartHandshake, Printer } from 'lucide-react';
import { format } from 'date-fns';
import type { Registrant, Expense, Solicitation } from '../types';

export default function Reports() {
  const { currentUser, setLoading } = useAppStore();
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [solicitations, setSolicitations] = useState<Solicitation[]>([]);
  
  const [printTarget, setPrintTarget] = useState<'merch' | 'registrants' | 'expenses' | 'solicitations' | null>(null);
  
  const isAdmin = currentUser?.role?.toLowerCase().trim() === 'admin';
  const rolePerms = currentUser?.permissionMatrix?.[currentUser.role!];
  const canViewExpenses = isAdmin || (rolePerms?.expenses?.view === true);
  const canViewSolicitations = isAdmin || (rolePerms?.solicitations?.view === true);

  useEffect(() => {
    // Standard data fetch on load
    const fetchData = async () => {
      try {
        const [regRes, expRes, solRes] = await Promise.all([
          api.get('/api/registrants', { params: { limit: 1000 } }),
          api.get('/api/expenses', { params: { limit: 1000 } }).catch(() => ({ data: { expenses: [] } })),
          api.get('/api/solicitations', { params: { limit: 1000 } }).catch(() => ({ data: { solicitations: [] } }))
        ]);
        setRegistrants(Array.isArray(regRes.data) ? regRes.data : (regRes.data.registrants || []));
        setExpenses(Array.isArray(expRes.data) ? expRes.data : (expRes.data.expenses || []));
        setSolicitations(Array.isArray(solRes.data) ? solRes.data : (solRes.data.solicitations || []));
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);
  
  const downloadCSV = (data: any[], filename: string) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const exportRegistrants = () => {
    const dataList = Array.isArray(registrants) ? registrants : [];
    const filtered = (isAdmin ? dataList : dataList.filter(r => r.church === currentUser?.church));
    const data = filtered.map(r => ({
      'Full Name': r.fullName,
      'Age': r.age,
      'Sex': r.sex || 'Male',
      'Ministry': r.ministry && r.ministry.length > 0 ? r.ministry.join(', ') : 'None',
      'Shirt Size': r.shirtSize,
      'Church': r.church,
      'Fee Type': r.feeType,
      'Payment Status': r.paymentStatus,
      'Payment Method': r.paymentMethod || 'N/A',
      'GCash Ref': r.gcRef || 'N/A',
      'Amount Paid': r.amountPaid,
      'Verified': r.verifiedByTreasurer ? 'Yes' : 'No',
      'Date Registered': r.dateRegistered ? format(new Date(r.dateRegistered), 'MMM d, yyyy') : 'N/A',
      'T-Shirt Claimed': r.merchClaims?.tshirt ? `Yes (${r.merchClaimDates?.tshirt ? format(new Date(r.merchClaimDates.tshirt), 'MMM d, h:mm a') : 'Legacy'})` : 'No',
      'Bag Claimed': r.merchClaims?.bag ? `Yes (${r.merchClaimDates?.bag ? format(new Date(r.merchClaimDates.bag), 'MMM d, h:mm a') : 'Legacy'})` : 'No',
      'Notebook Claimed': r.merchClaims?.notebook ? `Yes (${r.merchClaimDates?.notebook ? format(new Date(r.merchClaimDates.notebook), 'MMM d, h:mm a') : 'Legacy'})` : 'No',
      'Pen Claimed': r.merchClaims?.pen ? `Yes (${r.merchClaimDates?.pen ? format(new Date(r.merchClaimDates.pen), 'MMM d, h:mm a') : 'Legacy'})` : 'No',
    }));
    downloadCSV(data, `LAKBAY_Registrants_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportExpenses = () => {
    if (!canViewExpenses) return;
    const dataList = Array.isArray(expenses) ? expenses : [];
    const data = dataList.map(e => ({
      'Date': format(new Date(e.date), 'MMM d, yyyy'),
      'Description': e.description,
      'Category': e.category,
      'Amount': e.amount,
      'Paid By': e.paidBy,
      'Method': e.method,
      'Verified': e.verifiedByTreasurer ? 'Yes' : 'No'
    }));
    downloadCSV(data, `LAKBAY_Expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportSolicitations = () => {
    if (!canViewSolicitations) return;
    const dataList = Array.isArray(solicitations) ? solicitations : [];
    const data = dataList.map(s => ({
      'Source Name': s.sourceName,
      'Type': s.type,
      'Amount': s.amount,
      'Payment Method': s.paymentMethod,
      'Date Received': format(new Date(s.dateReceived), 'MMM d, yyyy'),
      'Notes': s.notes || '',
      'Verified': s.verifiedByTreasurer ? 'Yes' : 'No'
    }));
    downloadCSV(data, `LAKBAY_Solicitations_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const triggerPrint = (target: 'merch' | 'registrants' | 'expenses' | 'solicitations') => {
    setPrintTarget(target);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-display text-brand-brown tracking-wide">Reports & Export</h2>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-brand-sand/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-brown border border-brand-sand/20">
           Physical Auditing Enabled
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Registrants Card */}
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-brand-beige flex flex-col items-center text-center">
          <div className="p-4 bg-brand-cream text-brand-brown rounded-3xl mb-4">
            <Users size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1 leading-none">Registrants</h3>
          <p className="text-gray-400 text-[11px] md:text-xs mb-6 flex-1 px-4 leading-relaxed">Official spreadsheet of all participant details and payment status.</p>
          <div className="w-full grid grid-cols-2 gap-2 mt-auto">
            <button onClick={exportRegistrants} className="flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-all text-[11px] uppercase tracking-wider">
              <Download size={14} /> CSV
            </button>
            <button onClick={() => triggerPrint('registrants')} className="flex items-center justify-center gap-2 bg-brand-brown text-white py-3 rounded-2xl font-bold hover:bg-brand-light-brown transition-all text-[11px] uppercase tracking-wider shadow-lg shadow-brand-brown/10">
              <Printer size={14} /> Print
            </button>
          </div>
        </div>
        
        {/* Expenses Card */}
        {canViewExpenses && (
          <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-brand-beige flex flex-col items-center text-center">
            <div className="p-4 bg-gray-50 text-gray-600 rounded-3xl mb-4">
              <Receipt size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1 leading-none">Financials</h3>
            <p className="text-gray-400 text-[11px] md:text-xs mb-6 flex-1 px-4 leading-relaxed">Categorized ledger of camp expenses for accounting and audit.</p>
            <div className="w-full grid grid-cols-2 gap-2 mt-auto">
              <button onClick={exportExpenses} className="flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-all text-[11px] uppercase tracking-wider">
                <Download size={14} /> CSV
              </button>
              <button onClick={() => triggerPrint('expenses')} className="flex items-center justify-center gap-2 bg-gray-800 text-white py-3 rounded-2xl font-bold hover:bg-gray-900 transition-all text-[11px] uppercase tracking-wider shadow-lg shadow-gray-900/10">
                <Printer size={14} /> Print
              </button>
            </div>
          </div>
        )}

        {/* Solicitations Card */}
        {canViewSolicitations && (
          <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-brand-beige flex flex-col items-center text-center">
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-3xl mb-4">
              <HeartHandshake size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1 leading-none">Solicitations</h3>
            <p className="text-gray-400 text-[11px] md:text-xs mb-6 flex-1 px-4 leading-relaxed">Detailed records of donor contributions and resource gathering.</p>
            <div className="w-full grid grid-cols-2 gap-2 mt-auto">
              <button onClick={exportSolicitations} className="flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-all text-[11px] uppercase tracking-wider">
                <Download size={14} /> CSV
              </button>
              <button onClick={() => triggerPrint('solicitations')} className="flex items-center justify-center gap-2 bg-emerald-700 text-white py-3 rounded-2xl font-bold hover:bg-emerald-800 transition-all text-[11px] uppercase tracking-wider shadow-lg shadow-emerald-900/10">
                <Printer size={14} /> Print
              </button>
            </div>
          </div>
        )}
        
        {/* Merchandise Card */}
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-brand-beige flex flex-col items-center text-center">
          <div className="p-4 bg-brand-sand/20 text-brand-brown rounded-3xl mb-4">
            <FileBox size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1 leading-none">Claim Sheets</h3>
          <p className="text-gray-400 text-[11px] md:text-xs mb-6 flex-1 px-4 leading-relaxed">Simplified print-outs for t-shirt and gear distribution desks.</p>
          <button 
            onClick={() => triggerPrint('merch')}
            className="w-full flex items-center justify-center gap-2 bg-brand-sand text-brand-brown py-3 rounded-2xl font-black shadow-sm hover:opacity-90 transition-opacity uppercase tracking-widest text-[11px]"
          >
            <Printer size={16} /> Print Claim Sheet
          </button>
        </div>
      </div>
      
      {/* Dynamic Hidden Print Area */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; color: black !important; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background-color: #f5f5f5 !important; font-weight: bold; }
          @page { size: landscape; margin: 1cm; }
        }
      `}</style>

      <div id="print-area" className="hidden print:block p-8 bg-white">
        <div className="border-b-4 border-gray-900 pb-4 mb-4">
           <h1 className="text-2xl font-bold uppercase tracking-tight text-center">LAKBAY CAMP 2026 OFFICIAL AUDIT</h1>
           <p className="text-center text-sm font-medium text-gray-600 mt-1 uppercase tracking-widest">
             {printTarget === 'merch' ? 'Gear & Merchandise Distribution Sheet' : 
              printTarget === 'registrants' ? 'Master Registration Roster' :
              printTarget === 'expenses' ? 'Consolidated Expense Ledger' : 
              printTarget === 'solicitations' ? 'Solicitation & Donation Records' : 'Camp Report'}
           </p>
           <p className="text-[10px] text-gray-400 text-center mt-1">Generated: {format(new Date(), 'MMM d, yyyy h:mm a')}</p>
        </div>

        {/* REGISTRANTS TABLE */}
        {printTarget === 'registrants' && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Church</th>
                <th>Age</th>
                <th>Sex</th>
                <th>Fee Type</th>
                <th>Status</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Verified</th>
              </tr>
            </thead>
            <tbody>
              {registrants.filter(r => isAdmin || r.church === currentUser?.church).map((r, i) => (
                <tr key={i}>
                  <td className="font-bold">{r.fullName}</td>
                  <td>{r.church}</td>
                  <td>{r.age}</td>
                  <td>{r.sex}</td>
                  <td>{r.feeType}</td>
                  <td>{r.paymentStatus}</td>
                  <td className="text-[9px]">{r.paymentMethod || 'N/A'}</td>
                  <td className="font-mono">₱{r.amountPaid}</td>
                  <td>{r.verifiedByTreasurer ? 'YES' : 'NO'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* EXPENSES TABLE */}
        {printTarget === 'expenses' && (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Paid By</th>
                <th>Method</th>
                <th className="text-right">Amount</th>
                <th>Treasury</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e, i) => (
                <tr key={i}>
                  <td>{format(new Date(e.date), 'MM/dd/yy')}</td>
                  <td className="font-medium">{e.description}</td>
                  <td>{e.category}</td>
                  <td>{e.paidBy}</td>
                  <td>{e.method}</td>
                  <td className="text-right font-mono font-bold">₱{e.amount}</td>
                  <td>{e.verifiedByTreasurer ? 'VERIFIED' : 'PENDING'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* SOLICITATIONS TABLE */}
        {printTarget === 'solicitations' && (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Contributor / Source</th>
                <th>Type</th>
                <th>Method</th>
                <th className="text-right">Amount</th>
                <th>Notes</th>
                <th>Treasury</th>
              </tr>
            </thead>
            <tbody>
              {solicitations.map((s, i) => (
                <tr key={i}>
                  <td>{format(new Date(s.dateReceived), 'MM/dd/yy')}</td>
                  <td className="font-medium">{s.sourceName}</td>
                  <td>{s.type}</td>
                  <td>{s.paymentMethod}</td>
                  <td className="text-right font-mono font-bold">₱{s.amount}</td>
                  <td className="text-[9px] italic text-gray-500">{s.notes || '--'}</td>
                  <td>{s.verifiedByTreasurer ? 'VERIFIED' : 'PENDING'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* MERCH TABLE (Existing) */}
        {printTarget === 'merch' && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Church</th>
                <th className="text-center">Size</th>
                <th className="text-center">T-Shirt</th>
                <th className="text-center">Bag</th>
                <th className="text-center">Notebook</th>
                <th className="text-center">Pen</th>
              </tr>
            </thead>
            <tbody>
              {registrants.filter(r => isAdmin || r.church === currentUser?.church).map((r, i) => (
                <tr key={i}>
                  <td className="font-bold">{r.fullName}</td>
                  <td>{r.church}</td>
                  <td className="text-center">{r.shirtSize}</td>
                  <td className="text-center">{r.merchClaims?.tshirt ? '✓' : ''}</td>
                  <td className="text-center">{r.merchClaims?.bag ? '✓' : ''}</td>
                  <td className="text-center">{r.merchClaims?.notebook ? '✓' : ''}</td>
                  <td className="text-center">{r.merchClaims?.pen ? '✓' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
