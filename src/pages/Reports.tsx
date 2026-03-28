import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAppStore } from '../store';
import Papa from 'papaparse';
import { Download, FileBox, Users, Receipt, HeartHandshake } from 'lucide-react';
import { format } from 'date-fns';
import type { Registrant, Expense, Solicitation } from '../types';

export default function Reports() {
  const { currentUser, setLoading } = useAppStore();
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [solicitations, setSolicitations] = useState<Solicitation[]>([]);
  
  const isAdmin = currentUser?.role?.toLowerCase().trim() === 'admin';
  const isTreasurer = currentUser?.role?.toLowerCase().trim() === 'treasurer';
  const rolePerms = currentUser?.permissionMatrix?.[currentUser.role!];
  const canViewExpenses = isAdmin || isTreasurer || (rolePerms?.expenses?.view === true);
  const canViewSolicitations = isAdmin || isTreasurer || (rolePerms?.solicitations?.view === true);
  useEffect(() => {
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
  }, [setLoading]);
  
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
    const filtered = (isAdmin || isTreasurer ? dataList : dataList.filter(r => r.church === currentUser?.church));
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
      'Date Registered': format(new Date(r.dateRegistered), 'MMM d, yyyy'),
      'T-Shirt Claimed': r.merchClaims.tshirt ? `Yes (${r.merchClaimDates?.tshirt ? format(new Date(r.merchClaimDates.tshirt), 'MMM d, h:mm a') : 'Legacy'})` : 'No',
      'Bag Claimed': r.merchClaims.bag ? `Yes (${r.merchClaimDates?.bag ? format(new Date(r.merchClaimDates.bag), 'MMM d, h:mm a') : 'Legacy'})` : 'No',
      'Notebook Claimed': r.merchClaims.notebook ? `Yes (${r.merchClaimDates?.notebook ? format(new Date(r.merchClaimDates.notebook), 'MMM d, h:mm a') : 'Legacy'})` : 'No',
      'Pen Claimed': r.merchClaims.pen ? `Yes (${r.merchClaimDates?.pen ? format(new Date(r.merchClaimDates.pen), 'MMM d, h:mm a') : 'Legacy'})` : 'No',
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

  const printMerchSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-2xl md:text-3xl font-display text-brand-brown tracking-wide mb-1 md:mb-6">Reports & Export</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Registrants Export */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-brand-beige flex flex-col items-center text-center">
          <div className="p-3 md:p-4 bg-brand-cream text-brand-brown rounded-full mb-3 md:mb-4">
            <Users size={24} className="md:w-8 md:h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Registrants</h3>
          <p className="text-gray-400 text-[11px] md:text-sm mb-4 md:mb-6 flex-1">Complete spreadsheet of all registrants, payments, and claims.</p>
          <button 
            onClick={exportRegistrants}
            className="w-full flex items-center justify-center gap-2 bg-brand-brown text-white py-2.5 rounded-xl font-bold hover:bg-brand-light-brown transition-colors text-sm"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
        
        {/* Expenses Export */}
        {canViewExpenses && (
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-brand-beige flex flex-col items-center text-center">
            <div className="p-3 md:p-4 bg-gray-50 text-gray-600 rounded-full mb-3 md:mb-4">
              <Receipt size={24} className="md:w-8 md:h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Financials</h3>
            <p className="text-gray-400 text-[11px] md:text-sm mb-4 md:mb-6 flex-1">Camp-wide expenses and payment details for accounting.</p>
            <button 
              onClick={exportExpenses}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-2.5 rounded-xl font-bold hover:bg-gray-700 transition-colors text-sm"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        )}

        {/* Solicitations Export */}
        {canViewSolicitations && (
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-brand-beige flex flex-col items-center text-center">
            <div className="p-3 md:p-4 bg-green-50 text-green-700 rounded-full mb-3 md:mb-4">
              <HeartHandshake size={24} className="md:w-8 md:h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Solicitations</h3>
            <p className="text-gray-400 text-[11px] md:text-sm mb-4 md:mb-6 flex-1">Donor contributions and verification records.</p>
            <button 
              onClick={exportSolicitations}
              className="w-full flex items-center justify-center gap-2 bg-green-700 text-white py-2.5 rounded-xl font-bold hover:bg-green-800 transition-colors text-sm"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        )}
        
        {/* Printable Merch Sheet */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-brand-beige flex flex-col items-center text-center">
          <div className="p-3 md:p-4 bg-brand-sand/20 text-brand-brown rounded-full mb-3 md:mb-4">
            <FileBox size={24} className="md:w-8 md:h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Print Claim Sheet</h3>
          <p className="text-gray-400 text-[11px] md:text-sm mb-4 md:mb-6 flex-1">Generate a printable view for physical check-in desks.</p>
          <button 
            onClick={printMerchSheet}
            className="w-full flex items-center justify-center gap-2 bg-brand-sand text-brand-brown py-2.5 rounded-xl font-bold shadow-sm hover:opacity-90 transition-opacity print:hidden text-sm"
          >
            <FileBox size={16} /> Print View
          </button>
        </div>
      </div>
      
      {/* Hidden print payload that only shows during print */}
      <div className="hidden print:block absolute inset-0 bg-white p-8">
        <h1 className="text-3xl font-bold text-center mb-6 border-b pb-4">LAKBAY Camp 2026 - Merch Claim Sheet</h1>
        <table className="w-full text-left text-sm border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2">Name</th>
              <th className="border border-gray-300 p-2">Church</th>
              <th className="border border-gray-300 p-2 text-center w-12">Size</th>
              <th className="border border-gray-300 p-2 text-center w-16">T-Shirt</th>
              <th className="border border-gray-300 p-2 text-center w-16">Bag</th>
              <th className="border border-gray-300 p-2 text-center w-16">Note</th>
              <th className="border border-gray-300 p-2 text-center w-16">Pen</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const dataList = Array.isArray(registrants) ? registrants : [];
              const filtered = (isAdmin ? dataList : dataList.filter(r => r.church === currentUser?.church));
              return filtered.map(r => (
                <tr key={r.id || (r as any)._id}>
                <td className="border border-gray-300 p-2 font-medium">{r.fullName}</td>
                <td className="border border-gray-300 p-2">{r.church}</td>
                <td className="border border-gray-300 p-2 text-center">{r.shirtSize}</td>
                <td className="border border-gray-300 p-2 text-center">{r.merchClaims.tshirt ? '✓' : ''}</td>
                <td className="border border-gray-300 p-2 text-center">{r.merchClaims.bag ? '✓' : ''}</td>
                <td className="border border-gray-300 p-2 text-center">{r.merchClaims.notebook ? '✓' : ''}</td>
                <td className="border border-gray-300 p-2 text-center">{r.merchClaims.pen ? '✓' : ''}</td>
              </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
