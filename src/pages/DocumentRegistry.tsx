import { useState, useMemo, useEffect } from 'react';
import { 
  Printer, 
  Search, 
  Users, 
  HeartHandshake, 
  Check, 
  Eye,
  Edit3
} from 'lucide-react';
import { useAppStore } from '../store';
import { format } from 'date-fns';

type DocTemplate = 'waiver' | 'solicitation';

export default function DocumentRegistry() {
  const { registrants, solicitations, appSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<DocTemplate>('waiver');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const isCompact = true; // Permanent Paper-Saving Standard

  // Content States (Local overrides)
  const [customWaiver, setCustomWaiver] = useState('');
  const [customSolicitation, setCustomSolicitation] = useState('');

  // Branding Fallbacks
  const branding = {
    campName: appSettings?.campName || 'LAKBAY 2026',
    churchName: appSettings?.churchName || 'UNITED PENTECOSTAL CHURCH PHILIPPINES',
    campDate: appSettings?.campDate || 'MAY 20-23, 2026',
    campLocation: appSettings?.campLocation || 'SUMMER CAMP VENUE',
    campSignatory: appSettings?.campSignatory || 'CAMP DIRECTOR'
  };

  // Initialize content from settings
  useEffect(() => {
    if (appSettings?.waiverTemplate) setCustomWaiver(appSettings.waiverTemplate);
    else setCustomWaiver(`I, {{name}}, of legal age / with guardian consent, and a member of {{church}}, hereby voluntarily participate in the {{camp_name}}.

I understand that this event involves various physical activities, spiritual sessions, and communal living. By signing this document, I acknowledge the following:

• Health Declaration: I am physically fit to participate and have declared any pre-existing medical conditions to the organizers.
• Media Release: I grant permission for photos/videos of me to be used in church publications and social media for documentation purposes.
• Liability: I release the organizers and the church from any liability for unforeseen accidents or loss of personal property.`);

    if (appSettings?.solicitationTemplate) setCustomSolicitation(appSettings.solicitationTemplate);
    else setCustomSolicitation(`Greetings in the matchless name of our Lord Jesus Christ!

We are writing to you in anticipation of our upcoming {{camp_name}}, themed around spiritual growth and youth empowerment. This year, we expect over 300 delegates representing various churches across the region.

To make this event a success, we are seeking partners who share our vision for the next generation. Your previous donation/pledge of ₱{{amount}} has been duly noted in our records, and we would like to formally request your continued support for the camp's logistics, food, and facilities.

Every contribution goes directly towards subsidized registration fees and quality camp materials for underprivileged youth. We look forward to your favorable response.`);
  }, [appSettings]);

  // Tag Replacement Engine
  const replaceTags = (text: string, item: any) => {
    if (!text) return '';
    let result = text;
    const data = {
      name: item?.fullName || item?.sourceName || '________________',
      church: item?.church || '________________',
      amount: item?.amount?.toLocaleString() || '_______',
      camp_name: branding.campName,
      location: branding.campLocation,
      date: branding.campDate,
      signatory: branding.campSignatory
    };

    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value as string);
    });
    return result;
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
    const content = type === 'waiver' ? customWaiver : customSolicitation;
    
    return (
      <div key={item?.id || item?._id} className={`bg-white shadow-none mx-auto border border-gray-100 flex flex-col page-break-after-always overflow-hidden ${isCompact ? 'w-[816px] h-[528px] p-6' : 'w-[816px] h-[1056px] p-12'}`}>
        
        {/* HEADER */}
        <div className={`border-b border-gray-100 shrink-0 flex items-center justify-between transition-all ${isCompact ? 'pb-2 mb-2' : 'pb-8 mb-8'}`}>
           <div className="flex items-center gap-4">
              <div className="bg-brand-brown w-9 h-9 flex items-center justify-center font-display text-white text-lg">L</div>
              <div>
                 <h1 className={`font-display text-brand-brown tracking-tighter transition-all ${isCompact ? 'text-md leading-none mb-0.5' : 'text-3xl'}`}>{branding.campName}</h1>
                 <p className={`font-sans font-black uppercase text-gray-400 tracking-[0.2em] transition-all ${isCompact ? 'text-[6px]' : 'text-[9px]'}`}>{branding.churchName}</p>
              </div>
           </div>
           <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-brand-brown font-black transition-all mb-0.5">
                 <Clock />
                 <span className={`${isCompact ? 'text-[7px]' : 'text-[9px]'}`}>{branding.campDate}</span>
              </div>
              <div className="flex items-center justify-end gap-1 text-gray-400 font-black">
                 <Map />
                 <span className={`${isCompact ? 'text-[7px]' : 'text-[9px]'}`}>{branding.campLocation}</span>
              </div>
           </div>
        </div>

        {/* BODY */}
        <div className="flex-1 min-h-0 relative">
            <h2 className={`font-display text-brand-brown text-center uppercase tracking-widest border-b border-brand-sand/10 transition-all ${isCompact ? 'text-xs mb-2 pb-1.5' : 'text-2xl mb-6 pb-4'}`}>
              Official {type === 'waiver' ? 'Participant Waiver' : 'Solicitation Letter'}
            </h2>
            
            <div className={`font-serif text-gray-800 text-justify leading-snug transition-all whitespace-pre-wrap ${isCompact ? 'text-[10px]' : 'text-sm'}`}>
              {replaceTags(content, item)}
            </div>

            {/* SIGNATORY */}
            {type === 'solicitation' && (
              <>
                <div className={`flex flex-col items-end transition-all ${isCompact ? 'mt-3' : 'mt-12'}`}>
                   <p className={`font-serif italic text-gray-600 mb-4 transition-all ${isCompact ? 'text-[9px]' : 'text-sm'}`}>Sincerely in His Service,</p>
                   <div className={`font-display text-brand-brown border-b border-brand-brown pb-1 min-w-[120px] text-center transition-all ${isCompact ? 'text-[10px]' : 'text-xl'}`}>
                     {branding.campSignatory}
                   </div>
                   <p className={`font-sans font-black uppercase tracking-widest text-gray-400 transition-all ${isCompact ? 'text-[6px]' : 'text-[9px]'} mt-0.5`}>Camp Coordinator / Signatory</p>
                </div>
              </>
            )}

            {type === 'waiver' && (
              <>
                <div className={`flex flex-col items-start transition-all ${isCompact ? 'mt-3' : 'mt-12'}`}>
                   <p className={`font-serif italic text-gray-600 mb-4 transition-all ${isCompact ? 'text-[9px]' : 'text-sm'}`}>Signed and Conformed,</p>
                   <div className={`font-display text-brand-brown border-b border-brand-brown pb-1 min-w-[180px] text-center transition-all ${isCompact ? 'text-[10px]' : 'text-xl'}`}>
                     {item?.fullName || '_________________________'}
                   </div>
                   <p className={`font-sans font-black uppercase tracking-widest text-gray-400 transition-all ${isCompact ? 'text-[6px]' : 'text-[9px]'} mt-0.5`}>Participant / Registered Delegate</p>
                </div>
              </>
            )}

         </div>

         {/* FOOTER */}
         <div className={`border-t border-gray-100 shrink-0 flex justify-between items-end font-sans transition-all ${isCompact ? 'mt-2 pt-1.5' : 'mt-8 pt-6'}`}>
            <div>
               <p className="text-[6px] font-black uppercase tracking-widest text-gray-300 mb-0.5">Official LAKBAY Document</p>
               <p className="text-[8px] font-bold text-gray-400">Generated on {format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
            </div>
            <p className={`font-black text-brand-brown tracking-tighter transition-all ${isCompact ? 'text-[7px]' : 'text-[9px]'}`}>LAKBAY 2026 Core Operations v3.1</p>
         </div>

      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* UI Mode (Display: not print) */}
      <div className="print:hidden space-y-4 max-w-7xl mx-auto pb-10 px-4 md:px-0 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
           <div>
              <h2 className="text-xl font-display text-brand-brown tracking-tight">Document Registry</h2>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-0.5">Automated Operations</p>
           </div>

           <div className="flex items-center gap-1.5 p-1 bg-white border border-brand-sand/50 rounded-xl shadow-sm w-full sm:w-auto">
              <button 
                onClick={() => { setActiveTab('waiver'); setSelectedIds(new Set()); setSearchQuery(''); }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'waiver' ? 'bg-brand-brown text-white shadow-sm' : 'text-gray-400 hover:text-brand-brown'}`}
              >
                <Users size={14} /> Waivers
              </button>
              <button 
                 onClick={() => { setActiveTab('solicitation'); setSelectedIds(new Set()); setSearchQuery(''); }}
                 className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'solicitation' ? 'bg-brand-brown text-white shadow-sm' : 'text-gray-400 hover:text-brand-brown'}`}
              >
                <HeartHandshake size={14} /> Letters
              </button>
           </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
           
           {/* LEFT: Selection & Editor Console */}
           <div className="xl:col-span-5 space-y-4 order-2 xl:order-1 w-full overflow-hidden">
              
              {/* EDITOR TICKET */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                 <button 
                    onClick={() => setShowEditor(!showEditor)}
                    className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border transition-all font-black uppercase text-[9px] tracking-widest ${showEditor ? 'bg-brand-sand/10 text-brand-brown border-brand-brown/40 shadow-sm' : 'bg-white text-gray-400 border-brand-sand hover:border-brand-brown hover:text-brand-brown'}`}
                 >
                    <Edit3 size={12} />
                    {showEditor ? 'Hide Editor' : 'Edit Live Template'}
                 </button>
                 <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-brand-cream/10 border border-brand-sand/20 rounded-xl whitespace-nowrap">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[8px] font-black text-brand-brown uppercase tracking-widest">Efficiency Mode Locked</span>
                 </div>
              </div>

              {/* TEMPLATE EDITOR */}
              {showEditor && (
                <div className="bg-brand-cream/10 border border-brand-brown/10 rounded-xl p-4 space-y-2 animate-in fade-in slide-in-from-top-1">
                   <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-brand-brown uppercase tracking-widest">Global Session Tone</span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Supports System Tags</span>
                   </div>
                   <textarea 
                      value={activeTab === 'waiver' ? customWaiver : customSolicitation}
                      onChange={e => activeTab === 'waiver' ? setCustomWaiver(e.target.value) : setCustomSolicitation(e.target.value)}
                      rows={5}
                      className="w-full bg-white rounded-xl border border-brand-sand/50 p-3 text-xs font-serif leading-relaxed focus:outline-none focus:border-brand-brown shadow-inner resize-none"
                      placeholder={`Type your custom ${activeTab} message here...`}
                   />
                </div>
              )}

              {/* SELECTION LIST */}
              <div className="bg-white rounded-xl border border-brand-sand shadow-sm overflow-hidden flex flex-col h-[400px] md:h-[450px]">
                 <div className="p-4 border-b border-gray-100 bg-gray-50/30">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input 
                         type="text" 
                         value={searchQuery}
                         onChange={e => setSearchQuery(e.target.value)}
                         placeholder={`Search ${activeTab === 'waiver' ? 'Campers' : 'Sponsors'}...`}
                         className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-brand-sand/30 shadow-inner focus:outline-none focus:border-brand-brown font-bold text-brand-brown placeholder:text-gray-300 text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-between px-1">
                       <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                          {filteredData.length} records found
                       </span>
                       <button 
                         onClick={selectAll}
                         className="text-[8px] font-black text-brand-brown hover:underline uppercase tracking-widest"
                       >
                          {selectedIds.size === filteredData.length ? 'Deselect All' : 'Select All'}
                       </button>
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
                    {filteredData.map((item: any) => {
                      const id = item.id || item._id;
                      const isSelected = selectedIds.has(id);
                      return (
                        <div 
                          key={id} 
                          onClick={() => toggleSelect(id)}
                          className={`p-3 rounded-lg mb-1 cursor-pointer transition-all flex items-center justify-between border ${isSelected ? 'bg-brand-brown text-white border-brand-brown shadow-sm' : 'bg-white border-transparent hover:bg-brand-cream/10 text-gray-700'}`}
                        >
                           <div className="min-w-0">
                              <h4 className="font-bold uppercase tracking-tight truncate text-[11px]">
                                {activeTab === 'waiver' ? item.fullName : item.sourceName}
                              </h4>
                              <p className={`text-[9px] font-bold opacity-60 uppercase truncate`}>
                                {activeTab === 'waiver' ? item.church : item.type}
                              </p>
                           </div>
                           <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isSelected ? 'bg-white text-brand-brown border-white' : 'border-brand-sand/50'}`}>
                              {isSelected && <Check size={12} className="stroke-[4]" />}
                           </div>
                        </div>
                      );
                    })}
                 </div>

                 <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="w-9 h-9 rounded-full bg-brand-cream/20 border border-brand-sand/30 flex items-center justify-center text-brand-brown font-display text-sm">
                          {selectedIds.size}
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Ready</span>
                          <span className="text-[9px] font-bold text-brand-brown uppercase">Batch Out</span>
                       </div>
                    </div>
                    <button 
                      onClick={handlePrint}
                      disabled={selectedIds.size === 0}
                      className="flex items-center gap-2 bg-brand-brown text-white px-6 py-2.5 rounded-xl shadow-md hover:bg-brand-light-brown active:scale-95 transition-all font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
                    >
                       <Printer size={16} /> Print
                    </button>
                 </div>
              </div>

           </div>

           {/* RIGHT: LIVE PREVIEW */}
           <div className="xl:col-span-7 space-y-3 order-1 xl:order-2 w-full overflow-hidden">
              <div className="flex items-center justify-between px-1">
                 <div className="flex items-center gap-2">
                    <Eye size={14} className="text-brand-brown" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">High-Fidelity Preview</span>
                 </div>
                 <div className="flex gap-2">
                    <div className="bg-brand-cream/50 px-2.5 py-0.5 rounded-full border border-brand-sand/20">
                       <span className="text-[8px] font-black text-brand-brown uppercase tracking-widest leading-none">A4 scaled</span>
                    </div>
                 </div>
              </div>

              <div className="bg-gray-100/50 rounded-2xl p-2 md:p-4 overflow-hidden shadow-inner border border-white min-h-[350px] md:min-h-[600px] flex items-start justify-center">
                 <div className="preview-container scale-[0.35] min-[400px]:scale-[0.42] sm:scale-[0.6] md:scale-[0.75] lg:scale-[0.7] xl:scale-[0.8] 2xl:scale-100 origin-top transform-gpu">
                    {selectedIds.size > 0 ? (
                      renderDocument(
                        activeTab === 'waiver' 
                          ? registrants.find(r => (r.id || (r as any)._id) === Array.from(selectedIds)[0])
                          : solicitations.find(s => (s.id || (s as any)._id) === Array.from(selectedIds)[0]),
                        activeTab
                      )
                    ) : (
                      <div className="bg-white p-12 min-h-[528px] w-[816px] max-w-[90vw] shadow-lg mx-auto flex flex-col items-center justify-center text-center opacity-30">
                         <div className="bg-brand-cream/20 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                            <Printer size={28} className="text-brand-sand" />
                         </div>
                         <h3 className="text-xl font-display text-brand-brown tracking-tight">System Idle</h3>
                         <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Select record to preview</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>

        </div>
      </div>

      {/* PRINT-ONLY CONTAINER (Invisible in UI) */}
      <div className="hidden print:block absolute top-0 left-0 w-full font-serif">
          {Array.from(selectedIds).map(id => {
            const item = activeTab === 'waiver' 
              ? registrants.find(r => (r.id || (r as any)._id) === id)
              : solicitations.find(s => (s.id || (s as any)._id) === id);
            return renderDocument(item, activeTab);
          })}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
          @page { size: portrait; margin: 0; }
        }
        .page-break-after-always {
          page-break-after: always;
        }
      `}</style>
    </div>
  );
}

// Sub-components as local SVG icons for layout
const Clock = () => <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const Map = () => <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
