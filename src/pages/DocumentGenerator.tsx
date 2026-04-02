import { useState, useMemo } from 'react';
import {
  Printer,
  Search,
  Users,
  HeartHandshake,
  FileText,
  Check,
  Eye,
  Settings,
  ArrowRight
} from 'lucide-react';
import { useAppStore } from '../store';
import { format } from 'date-fns';

type DocTemplate = 'waiver' | 'solicitation' | 'blank';

export default function DocumentGenerator() {
  const { registrants, solicitations, appSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<DocTemplate>('waiver');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Branding Fallbacks
  const branding = {
    campName: appSettings?.campName || 'LAKBAY 2026',
    churchName: appSettings?.churchName || 'JESUS ALLIANCE MISSION',
    campDate: appSettings?.campDate || 'APRIL 8-11, 2026',
    campLocation: appSettings?.campLocation || 'Lipit-Tomeeng, San Fabian, Pangasinan',
    campSignatory: appSettings?.campSignatory || 'CHAROMAE QUIRIMIT'
  };

  // Data Filtering
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (activeTab === 'waiver') {
      return registrants.filter(r => r.fullName.toLowerCase().includes(q) || r.church.toLowerCase().includes(q));
    } else if (activeTab === 'solicitation') {
      return solicitations.filter(s => s.sourceName.toLowerCase().includes(q));
    }
    return [];
  }, [registrants, solicitations, activeTab, searchQuery]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map(d => d.id || (d as any)._id)));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // RENDER DOCUMENT PREVIEW
  const renderDocument = (item: any, type: DocTemplate) => {
    const dateStr = format(new Date(), 'MMMM dd, yyyy');

    return (
      <div className="bg-white p-12 md:p-16 min-h-[1122px] w-[794px] shadow-2xl mx-auto border border-gray-100 flex flex-col font-serif relative overflow-hidden print:shadow-none print:border-none print:m-0 print:w-full print:min-h-0 print:h-auto">

        {/* OFFICIAL HEADER */}
        <div className="text-center border-b-2 border-brand-brown pb-6 mb-8 shrink-0">
          <h2 className="text-xl font-bold uppercase tracking-[0.2em] text-gray-900 mb-0.5">{branding.churchName}</h2>
          <h1 className="text-3xl font-bold text-brand-brown tracking-widest mb-1">{branding.campName}</h1>
          <p className="text-xs font-sans font-black uppercase tracking-[0.3em] text-gray-400">Official Camp Registry & Operations</p>
          <div className="mt-4 flex justify-center gap-6 text-[10px] font-sans font-bold uppercase tracking-widest text-gray-500">
            <span className="flex items-center gap-1.5"><Clock /> {branding.campDate}</span>
            <span className="flex items-center gap-1.5"><Map /> {branding.campLocation}</span>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 text-gray-800 leading-relaxed text-sm md:text-base space-y-6">

          {type === 'waiver' && (
            <>
              <div className="text-center mb-10">
                <h3 className="text-2xl font-bold underline decoration-brand-sand underline-offset-8 uppercase tracking-widest">REGISTRATION WAIVER & CONSENT</h3>
              </div>

              <p className="indent-12">
                I, <span className="font-bold border-b border-gray-400 px-4 inline-block min-w-[250px] text-center">{item?.fullName || '__________________________'}</span>,
                of legal age / with guardian consent, and a member of <span className="font-bold">{item?.church || '__________________________'}</span>,
                hereby voluntarily participate in the <span className="font-bold">{branding.campName}</span>.
              </p>

              <p>
                I understand that this event involves various physical activities, spiritual sessions, and communal living.
                By signing this document, I acknowledge the following:
              </p>

              <ul className="list-disc pl-8 space-y-4 font-sans text-sm">
                <li><strong>Health Declaration:</strong> I am physically fit to participate and have declared any pre-existing medical conditions to the organizers.</li>
                <li><strong>Media Release:</strong> I grant permission for photos/videos of me to be used in church publications and social media for documentation purposes.</li>
                <li><strong>Liability:</strong> I release the organizers and the {branding.churchName} from any liability for unforeseen accidents or loss of personal property.</li>
              </ul>

              <div className="pt-20 grid grid-cols-2 gap-20">
                <div className="text-center">
                  <div className="border-b-2 border-gray-900 pb-2 mb-2"></div>
                  <p className="text-xs font-sans font-black uppercase tracking-widest text-gray-500">Participant Signature</p>
                </div>
                <div className="text-center">
                  <div className="border-b-2 border-gray-900 pb-2 mb-2"></div>
                  <p className="text-xs font-sans font-black uppercase tracking-widest text-gray-500">Date Signed</p>
                </div>
              </div>
            </>
          )}

          {type === 'solicitation' && (
            <>
              <div className="text-right mb-10 font-sans font-bold text-sm">
                <p>{dateStr}</p>
              </div>

              <div className="mb-10 font-bold">
                <p className="uppercase tracking-widest text-gray-500 text-xs mb-1">To our valued sponsor:</p>
                <h3 className="text-xl text-gray-900">{item?.sourceName || '__________________________'}</h3>
              </div>

              <p className="indent-12">
                Greetings in the matchless name of our Lord Jesus Christ!
              </p>

              <p>
                We are writing to you in anticipation of our upcoming <span className="font-bold">{branding.campName}</span>,
                themed around spiritual growth and youth empowerment. This year, we expect over 300 delegates
                representing various churches across the region.
              </p>

              <p>
                To make this event a success, we are seeking partners who share our vision for the next generation.
                Your previous donation/pledge of <span className="font-bold">₱{item?.amount?.toLocaleString() || '_______'}</span> has been
                duly noted in our records, and we would like to formally request your continued support for the camp's
                logistics, food, and facilities.
              </p>

              <p>
                Every contribution goes directly towards subsidized registration fees and quality camp materials
                for underprivileged youth. We look forward to your favorable response.
              </p>

              <div className="pt-20 flex flex-col items-start">
                <p className="mb-12 font-sans font-bold">In His Service,</p>
                <div className="border-b-2 border-gray-900 w-64 pb-2 mb-1 font-bold uppercase tracking-widest text-center">
                  {branding.campSignatory}
                </div>
                <p className="text-xs font-sans font-black uppercase tracking-widest text-gray-400">Camp Coordinator / Authorized Signatory</p>
              </div>
            </>
          )}

          {type === 'blank' && (
            <div className="h-full border-2 border-dashed border-gray-100 rounded-[2.5rem] flex items-center justify-center bg-gray-50/20 group">
              <FileText size={48} className="text-gray-200 group-hover:scale-110 transition-transform duration-700" />
              <p className="absolute bottom-10 text-[9px] font-sans font-black text-gray-300 uppercase tracking-[0.3em]">Official Letterhead Only</p>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="mt-8 pt-6 border-t border-gray-100 shrink-0 flex justify-between items-end font-sans">
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-gray-300 mb-1">Official LAKBAY Document</p>
            <p className="text-[10px] font-bold text-gray-400">Generated on {format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
          </div>
          <p className="text-[10px] font-black text-brand-brown tracking-tighter">LAKBAY 2026 Core Operations v3.0</p>
        </div>

      </div>
    );
  };

  return (
    <div className="min-h-screen print:min-h-0">
      {/* UI Mode (Display: not print) */}
      <div className="print:hidden space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-display text-brand-brown tracking-tight">Docs & Printing</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1">Automatic Transaction Facilitation</p>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white border border-brand-sand rounded-2xl shadow-sm">
            <button
              onClick={() => { setActiveTab('waiver'); setSelectedIds(new Set()); setSearchQuery(''); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[0.9rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'waiver' ? 'bg-brand-brown text-white shadow-md' : 'text-gray-400 hover:text-brand-brown'}`}
            >
              <Users size={16} /> Waivers
            </button>
            <button
              onClick={() => { setActiveTab('solicitation'); setSelectedIds(new Set()); setSearchQuery(''); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[0.9rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'solicitation' ? 'bg-brand-brown text-white shadow-md' : 'text-gray-400 hover:text-brand-brown'}`}
            >
              <HeartHandshake size={16} /> Letters
            </button>
            <button
              onClick={() => { setActiveTab('blank'); setSelectedIds(new Set()); setSearchQuery(''); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[0.9rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'blank' ? 'bg-brand-brown text-white shadow-md' : 'text-gray-400 hover:text-brand-brown'}`}
            >
              <FileText size={16} /> Blank
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

          {/* LEFT: Selection Console */}
          <div className="xl:col-span-5 space-y-4 order-2 xl:order-1">
            {activeTab !== 'blank' && (
              <div className="bg-white rounded-[2rem] border border-brand-sand shadow-sm overflow-hidden flex flex-col h-[600px]">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={`Search ${activeTab === 'waiver' ? 'Campers' : 'Sponsors'}...`}
                      className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-brand-sand/50 shadow-inner focus:outline-none focus:border-brand-brown font-bold text-brand-brown placeholder:text-gray-300"
                    />
                  </div>
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Showing {filteredData.length} records
                    </span>
                    <button
                      onClick={selectAll}
                      className="text-[10px] font-black text-brand-brown hover:underline uppercase tracking-widest"
                    >
                      {selectedIds.size === filteredData.length ? 'Deselect All' : 'Select All Filtered'}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                  {filteredData.map((item: any) => {
                    const id = item.id || item._id;
                    const isSelected = selectedIds.has(id);
                    return (
                      <div
                        key={id}
                        onClick={() => toggleSelect(id)}
                        className={`p-4 rounded-2xl mb-1 cursor-pointer transition-all flex items-center justify-between border-2 ${isSelected ? 'bg-brand-brown text-white border-brand-brown shadow-md scale-[1.02]' : 'bg-white border-transparent hover:bg-brand-cream/20 text-gray-700'}`}
                      >
                        <div className="min-w-0">
                          <h4 className="font-bold uppercase tracking-tight truncate text-sm">
                            {activeTab === 'waiver' ? item.fullName : item.sourceName}
                          </h4>
                          <p className={`text-[10px] font-bold opacity-60 uppercase truncate`}>
                            {activeTab === 'waiver' ? item.church : item.type}
                          </p>
                        </div>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-white text-brand-brown border-white' : 'border-brand-sand'}`}>
                          {isSelected && <Check size={14} className="stroke-[4]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Batch Size</span>
                      <span className="text-2xl font-display text-brand-brown">{selectedIds.size} Page(s)</span>
                    </div>
                    <button
                      onClick={handlePrint}
                      disabled={selectedIds.size === 0}
                      className="flex items-center gap-3 bg-brand-brown text-white px-8 py-4 rounded-2xl shadow-xl hover:bg-brand-light-brown active:scale-95 transition-all font-black uppercase text-xs tracking-widest disabled:opacity-50"
                    >
                      <Printer size={18} /> Print Now
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5 leading-tight">
                    <ArrowRight size={10} /> Instantly generate PDF/Print on selection
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'blank' && (
              <div className="bg-white rounded-[2rem] border border-brand-sand shadow-sm p-10 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-brand-cream rounded-3xl flex items-center justify-center text-brand-brown shadow-inner">
                  <FileText size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-display text-brand-brown">Official Letterhead</h3>
                  <p className="text-xs text-gray-500 font-medium px-4 mt-2">Generate a blank document featuring only the official camp branding for manual notes, announcements, or custom letters.</p>
                </div>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-3 bg-brand-brown text-white px-10 py-5 rounded-2xl shadow-xl hover:bg-brand-light-brown active:scale-95 transition-all font-black uppercase text-xs tracking-widest w-full justify-center"
                >
                  <Printer size={20} /> Print Blank Hub
                </button>
              </div>
            )}

            <div className="bg-brand-sand/10 border border-brand-sand/30 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-1.5 bg-brand-sand/20 rounded shadow-sm">
                <Settings size={14} className="text-brand-brown" />
              </div>
              <div>
                <span className="text-[10px] font-black text-brand-brown uppercase tracking-widest leading-none block mb-1">Header Branding</span>
                <p className="text-[10px] font-bold text-gray-400 leading-tight">Details are pulled from your System Settings. Update them there to refresh headers instantly.</p>
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE PREVIEW */}
          <div className="xl:col-span-7 space-y-4 order-1 xl:order-2">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-brand-brown" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Visual Print Preview</span>
              </div>
              <div className="bg-brand-cream px-3 py-1 rounded-full border border-brand-sand/40">
                <span className="text-[9px] font-black text-brand-brown uppercase tracking-widest">A4 Layout Optimized</span>
              </div>
            </div>

            <div className="bg-gray-200/50 rounded-[3rem] p-8 md:p-12 overflow-x-auto custom-scrollbar shadow-inner border-4 border-white/50">
              {/* This wrapper holds the visual preview ONLY (not for printing) */}
              <div className="preview-container scale-[0.6] md:scale-[0.85] lg:scale-100 origin-top transform-gpu">
                {activeTab === 'blank' ? (
                  renderDocument({}, 'blank')
                ) : (
                  selectedIds.size > 0 ? (
                    renderDocument(
                      activeTab === 'waiver'
                        ? registrants.find(r => (r.id || (r as any)._id) === Array.from(selectedIds)[0])
                        : solicitations.find(s => (s.id || (s as any)._id) === Array.from(selectedIds)[0]),
                      activeTab
                    )
                  ) : (
                    <div className="bg-white p-16 min-h-[1122px] w-[794px] shadow-2xl mx-auto flex flex-col items-center justify-center text-center opacity-30">
                      <Printer size={80} className="mb-6 text-brand-sand" />
                      <h3 className="text-3xl font-display text-brand-brown">Select Records</h3>
                      <p className="text-sm font-bold uppercase tracking-widest text-gray-400 mt-2">A preview will appear here</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* PRINT-ONLY CONTAINER (Invisible in UI) */}
      <div className="hidden print:block w-full font-serif">
        {activeTab === 'blank' ? (
          renderDocument({}, 'blank')
        ) : (
          Array.from(selectedIds).map((id, index) => {
            const item = activeTab === 'waiver'
              ? registrants.find(r => (r.id || (r as any)._id) === id)
              : solicitations.find(s => (s.id || (s as any)._id) === id);
            return (
              <div key={id} className={index > 0 ? "page-break-before-always" : ""}>
                {renderDocument(item, activeTab)}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @media print {
          @page { size: portrait; margin: 0; }
        }
        .page-break-before-always {
          page-break-before: always;
        }
      `}</style>
    </div>
  );
}

// Sub-components as local SVG icons for layout
const Clock = () => <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const Map = () => <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
