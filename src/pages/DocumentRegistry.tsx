import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Printer, 
  Search, 
  Users, 
  HeartHandshake, 
  Check, 
  Edit3,
  FileDown,
  Loader2,
  Image as ImageIcon,
  Save
} from 'lucide-react';
import { useAppStore } from '../store';
import api from '../api/axios';

// @ts-ignore - Loaded via CDN script in index.html
declare const html2pdf: any;

type DocTemplate = 'waiver' | 'solicitation';

export default function DocumentRegistry() {
  const { registrants, solicitations, appSettings, fetchGlobalSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<DocTemplate>('waiver');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [manualSponsorName, setManualSponsorName] = useState('');
  const [isManualExporting, setIsManualExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const manualPrintRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Content States (Local overrides)
  const [customWaiver, setCustomWaiver] = useState('');
  const [customSolicitation, setCustomSolicitation] = useState('');

  // Branding States (Local Overrides)
  const [localCampName, setLocalCampName] = useState('LAKBAY 2026');
  const [localChurchName, setLocalChurchName] = useState('UNITED PENTECOSTAL CHURCH PHILIPPINES');
  const [localDate, setLocalDate] = useState('MAY 20-23, 2026');
  const [localLocation, setLocalLocation] = useState('SUMMER CAMP VENUE');
  const [localSignatory, setLocalSignatory] = useState('CAMP DIRECTOR');
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(null);

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

    if (appSettings?.campName) setLocalCampName(appSettings.campName);
    if (appSettings?.churchName) setLocalChurchName(appSettings.churchName);
    if (appSettings?.campDate) setLocalDate(appSettings.campDate);
    if (appSettings?.campLocation) setLocalLocation(appSettings.campLocation);
    if (appSettings?.campSignatory) setLocalSignatory(appSettings.campSignatory);
    if (appSettings?.logoUrl) setLocalLogoUrl(appSettings.logoUrl);
  }, [appSettings]);

  // Derived Effective Branding
  const branding = {
    campName: localCampName,
    churchName: localChurchName,
    campDate: localDate,
    campLocation: localLocation,
    campSignatory: localSignatory,
    logoUrl: localLogoUrl
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setLocalLogoUrl(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePermanently = async () => {
    setIsSaving(true);
    try {
      await api.patch('/api/settings', {
        campName: localCampName,
        churchName: localChurchName,
        campDate: localDate,
        campLocation: localLocation,
        campSignatory: localSignatory,
        logoUrl: localLogoUrl,
        waiverTemplate: customWaiver,
        solicitationTemplate: customSolicitation
      });
      await fetchGlobalSettings(true);
      alert('System-wide branding saved permanently!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualExport = async () => {
    if (!manualSponsorName.trim() || !manualPrintRef.current) return;
    setIsManualExporting(true);
    try {
      const element = manualPrintRef.current;
      const safeName = manualSponsorName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const opt = {
        margin: [0, 0, 0, 0],
        filename: `LAKBAY_SOLICITATION_${safeName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      element.style.display = 'block';
      // @ts-ignore
      await html2pdf().from(element).set(opt).save();
      element.style.display = '';
      setManualSponsorName('');
    } catch (err) {
      console.error('Manual Export Failed:', err);
    } finally {
      setIsManualExporting(false);
    }
  };

  const handleManualPrint = () => {
    if (!manualSponsorName.trim() || !manualPrintRef.current) return;
    
    // TEMPORARILY swap the batch selection for printing
    // We use a small timeout to ensure the manualPrintRef is updated with the current name
    setTimeout(() => {
       window.print();
    }, 100);
  };

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

  const handleDownloadPDF = async () => {
    if (selectedIds.size === 0 || !printRef.current) return;
    setIsExporting(true);

    try {
      const element = printRef.current;
      const ids = Array.from(selectedIds);
      
      let fileName = 'LAKBAY_Batch_Export.pdf';
      
      if (ids.length === 1) {
        const item: any = activeTab === 'waiver' 
          ? registrants.find(r => (r.id || (r as any)._id) === ids[0])
          : solicitations.find(s => (s.id || (s as any)._id) === ids[0]);
        
        const rawName = activeTab === 'waiver' ? item?.fullName : item?.sourceName;
        const safeName = (rawName || 'Document').toUpperCase().replace(/[^A-Z0-9]/g, '_');
        fileName = `LAKBAY_${safeName}-${activeTab === 'waiver' ? 'WAIVER' : 'LETTER'}.pdf`;
      }

      const opt = {
        margin: [0, 0, 0, 0],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      // Ensure the print element is visible to the generator but still off-screen for UI
      element.style.display = 'block';
      // @ts-ignore
      await html2pdf().from(element).set(opt).save();
      element.style.display = ''; // Revert to initial state (handled by CSS)
    } catch (err) {
      console.error('PDF Generation Failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const renderDocument = (item: any, type: DocTemplate) => {
    const content = type === 'waiver' ? customWaiver : customSolicitation;
    
    return (
      <div key={item?.id || item?._id} className="bg-white shadow-none mx-auto border border-gray-100 flex flex-col page-break-after-always overflow-hidden w-[816px] h-[1056px] p-16">
        
        {/* HEADER */}
        <div className="border-b-2 border-brand-brown pb-8 mb-10 shrink-0 flex items-center justify-between">
           <div className="flex items-center gap-4">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
              ) : (
                <div className="bg-brand-brown w-14 h-14 flex items-center justify-center font-display text-white text-3xl">L</div>
              )}
              <div>
                 <h1 className="font-display text-brand-brown tracking-tighter text-4xl mb-1">{branding.campName}</h1>
                 <p className="font-sans font-black uppercase text-gray-400 tracking-[0.25em] text-[11px]">{branding.churchName}</p>
              </div>
           </div>
           <div className="text-right">
              <div className="flex items-center justify-end gap-2 text-brand-brown font-black mb-1">
                 <Clock size={14} />
                 <span className="text-[11px] uppercase tracking-widest">{branding.campDate}</span>
              </div>
              <div className="flex items-center justify-end gap-2 text-gray-400 font-black">
                 <Map size={14} />
                 <span className="text-[11px] uppercase tracking-widest">{branding.campLocation}</span>
              </div>
           </div>
        </div>

        <div className="flex-1 min-h-0 relative">
            <h2 className="font-display text-brand-brown text-center uppercase tracking-[0.3em] border-b border-brand-sand/20 text-3xl mb-10 pb-6">
              Official {type === 'waiver' ? 'Participant Waiver' : 'Solicitation Letter'}
            </h2>
            
            <div className="font-serif text-gray-800 text-justify leading-relaxed whitespace-pre-wrap text-base">
              {replaceTags(content, item)}
            </div>

            {type === 'solicitation' && (
              <div className="flex flex-col items-end mt-16">
                 <p className="font-serif italic text-gray-600 mb-6 text-base">Sincerely in His Service,</p>
                 <div className="font-display text-brand-brown border-b-2 border-brand-brown pb-1 min-w-[200px] text-center text-2xl">
                   {branding.campSignatory}
                 </div>
                 <p className="font-sans font-black uppercase tracking-[0.2em] text-gray-400 text-[10px] mt-2">Camp Coordinator / Official Signatory</p>
              </div>
            )}

            {type === 'waiver' && (
              <div className="flex flex-col items-start mt-16">
                 <p className="font-serif italic text-gray-600 mb-6 text-base">Signed and Conformed,</p>
                 <div className="font-display text-brand-brown border-b-2 border-brand-brown pb-1 min-w-[280px] text-center text-2xl">
                   {item?.fullName || '_________________________'}
                 </div>
                 <p className="font-sans font-black uppercase tracking-[0.2em] text-gray-400 text-[10px] mt-2">Participant / Registered Delegate</p>
              </div>
            )}
         </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <div className="print:hidden space-y-4 max-w-xl mx-auto pb-10 px-4 animate-in fade-in duration-500">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-brand-sand/20">
           <div>
              <h2 className="text-2xl font-display text-brand-brown tracking-tight">PDF Export Hub</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-0.5">Automated Documentation</p>
           </div>

           <div className="flex items-center gap-1.5 p-1 bg-white border border-brand-sand/50 rounded-xl shadow-sm">
              <button 
                onClick={() => { setActiveTab('waiver'); setSelectedIds(new Set()); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'waiver' ? 'bg-brand-brown text-white shadow-sm' : 'text-gray-400 hover:text-brand-brown'}`}
              >
                <Users size={14} /> Waivers
              </button>
              <button 
                 onClick={() => { setActiveTab('solicitation'); setSelectedIds(new Set()); setSearchQuery(''); }}
                 className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'solicitation' ? 'bg-brand-brown text-white shadow-sm' : 'text-gray-400 hover:text-brand-brown'}`}
              >
                <HeartHandshake size={14} /> Letters
              </button>
           </div>
        </div>

        <div className="space-y-4">
           {/* EDITOR TOGGLE */}
           <div className="flex gap-2">
             <button 
                onClick={() => setShowEditor(!showEditor)}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all font-black uppercase text-[10px] tracking-widest ${showEditor ? 'bg-brand-sand/10 text-brand-brown border-brand-brown/40 shadow-sm' : 'bg-white text-gray-400 border-brand-sand hover:border-brand-brown hover:text-brand-brown'}`}
             >
                <Edit3 size={14} />
                {showEditor ? 'Hide Template Editor' : 'Modify Global Content'}
             </button>
             {showEditor && (
                <button 
                  onClick={handleSavePermanently}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-brand-brown text-white px-6 py-3 rounded-2xl shadow-xl hover:bg-brand-light-brown font-black uppercase text-[10px] tracking-widest transition-all disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Permanently
                </button>
             )}
           </div>

           {showEditor && (
             <div className="bg-white border border-brand-sand rounded-3xl p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 shadow-xl">
                
                {/* LOGO & FOOTER SECTION */}
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black text-brand-brown uppercase tracking-[0.25em]">Visual Assets</span>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Official Logo</label>
                        <div className="flex items-center gap-3">
                           <div className="w-12 h-12 rounded-xl bg-brand-cream/10 border border-brand-sand/40 flex items-center justify-center overflow-hidden shrink-0">
                             {localLogoUrl ? <img src={localLogoUrl} className="w-10 h-10 object-contain" /> : <ImageIcon size={20} className="opacity-20" />}
                           </div>
                           <input 
                              type="file" 
                              ref={logoInputRef}
                              className="hidden" 
                              accept="image/*"
                              onChange={handleLogoUpload}
                           />
                           <button 
                             onClick={() => logoInputRef.current?.click()}
                             className="text-[9px] font-black uppercase bg-brand-sand/10 hover:bg-brand-sand/20 text-brand-brown px-3 py-2 rounded-lg transition-all"
                           >
                             Update Image
                           </button>
                           {localLogoUrl && (
                             <button 
                               onClick={() => setLocalLogoUrl(null)}
                               className="text-[9px] font-black uppercase bg-red-50 hover:bg-red-100 text-red-500 px-3 py-2 rounded-lg transition-all"
                             >
                               Remove
                             </button>
                           )}
                        </div>
                      </div>

                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Signatory / Coordinator</label>
                         <input 
                           type="text"
                           value={localSignatory}
                           onChange={e => setLocalSignatory(e.target.value)}
                           className="w-full bg-brand-cream/5 rounded-xl border border-brand-sand/40 p-3 text-[11px] font-bold focus:outline-none focus:border-brand-brown text-gray-800 shadow-sm"
                         />
                      </div>
                   </div>
                </div>

                {/* HEADER BRANDING GRID */}
                <div className="space-y-3 pt-6 border-t border-brand-sand/20">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black text-brand-brown uppercase tracking-[0.25em]">Event Details</span>
                     <span className="text-[9px] font-black text-brand-brown/40 uppercase tracking-widest bg-brand-cream/30 px-2 py-0.5 rounded-md italic">Header Overrides</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Camp Name</label>
                      <input 
                         type="text"
                         value={localCampName}
                         onChange={e => setLocalCampName(e.target.value)}
                         className="w-full bg-brand-cream/5 rounded-xl border border-brand-sand/40 p-3 text-[11px] font-bold focus:outline-none focus:border-brand-brown text-gray-800 shadow-sm"
                         placeholder="e.g. LAKBAY 2026"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Church / Organization</label>
                      <input 
                        type="text"
                        value={localChurchName}
                        onChange={e => setLocalChurchName(e.target.value)}
                        className="w-full bg-brand-cream/5 rounded-xl border border-brand-sand/40 p-3 text-[11px] font-bold focus:outline-none focus:border-brand-brown text-gray-800 shadow-sm"
                        placeholder="Organization Name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Date</label>
                      <input 
                        type="text"
                        value={localDate}
                        onChange={e => setLocalDate(e.target.value)}
                        className="w-full bg-brand-cream/5 rounded-xl border border-brand-sand/40 p-3 text-[11px] font-bold focus:outline-none focus:border-brand-brown text-gray-800 shadow-sm"
                        placeholder="e.g. May 20-23, 2026"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Event Location</label>
                      <input 
                        type="text"
                        value={localLocation}
                        onChange={e => setLocalLocation(e.target.value)}
                        className="w-full bg-brand-cream/5 rounded-xl border border-brand-sand/40 p-3 text-[11px] font-bold focus:outline-none focus:border-brand-brown text-gray-800 shadow-sm"
                        placeholder="Venue Name"
                      />
                    </div>
                  </div>
                </div>

                {/* CONTENT BLUEPRINT */}
                <div className="space-y-3 pt-6 border-t border-brand-sand/20">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black text-brand-brown uppercase tracking-[0.25em]">Content Blueprint</span>
                     <span className="text-[9px] font-black text-green-500 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-md">Template Locked</span>
                  </div>
                  <textarea 
                     value={activeTab === 'waiver' ? customWaiver : customSolicitation}
                     onChange={e => activeTab === 'waiver' ? setCustomWaiver(e.target.value) : setCustomSolicitation(e.target.value)}
                     rows={6}
                     className="w-full bg-brand-cream/10 rounded-2xl border border-brand-sand/50 p-4 text-[12px] font-serif leading-relaxed focus:outline-none focus:border-brand-brown shadow-inner resize-none text-gray-800"
                     placeholder="Template content here..."
                  />
                </div>
             </div>
           )}

           {/* REGISTRY LIST (Ultra-Compact Peak) */}
           <div className="bg-white rounded-3xl md:rounded-[2.5rem] border-2 border-brand-sand shadow-2xl overflow-hidden flex flex-col">
              
              {/* QUICK MANUAL ENTRY (Solicitation Only) */}
              {activeTab === 'solicitation' && (
                <div className="p-4 md:p-8 border-b border-gray-100 bg-brand-cream/5 animate-in slide-in-from-top-2 duration-500">
                   <div className="flex items-center justify-between mb-3 md:mb-4 px-1">
                      <div className="space-y-0.5 md:space-y-1">
                         <span className="text-[10px] font-black text-brand-brown/60 uppercase tracking-[0.25em]">Quick Manual Entry</span>
                         <h3 className="text-lg md:text-xl font-display text-brand-brown tracking-tight">On-the-Fly Outreach</h3>
                      </div>
                      <div className="text-right hidden md:block">
                         <span className="text-[9px] font-black text-brand-brown/40 uppercase tracking-widest bg-brand-cream/30 px-2 py-0.5 rounded-md italic">Outreach Mode</span>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <input 
                         type="text" 
                         value={manualSponsorName}
                         onChange={e => setManualSponsorName(e.target.value)}
                         placeholder="Name or Org..."
                         className="flex-1 px-4 md:px-5 py-3 md:py-4 bg-white rounded-xl md:rounded-2xl border-2 border-brand-sand/40 focus:border-brand-brown focus:outline-none font-bold text-gray-800 text-xs md:text-sm shadow-sm transition-all min-w-0"
                      />
                      <button 
                        onClick={handleManualExport}
                        disabled={!manualSponsorName.trim() || isManualExporting}
                        className="bg-brand-brown text-white p-3 md:px-5 md:py-4 rounded-xl md:rounded-2xl shadow-xl hover:bg-brand-light-brown disabled:opacity-50 transition-all flex items-center justify-center"
                      >
                         {isManualExporting ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                      </button>
                      <button 
                        onClick={handleManualPrint}
                        disabled={!manualSponsorName.trim() || isManualExporting}
                        className="bg-white border-2 border-brand-brown text-brand-brown p-3 md:px-5 md:py-4 rounded-xl md:rounded-2xl shadow-md hover:bg-brand-cream disabled:opacity-50 transition-all flex items-center justify-center min-w-[44px] md:min-w-[48px]"
                      >
                         <Printer size={18} />
                      </button>
                   </div>
                   <p className="mt-3 md:mt-4 text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center italic opacity-60">
                      * This generates an instant, branded letter without a permanent record.
                   </p>
                </div>
              )}

              {activeTab === 'waiver' && (
                <>
                  <div className="p-5 border-b border-gray-100 bg-brand-cream/10">
                    <div className="relative mb-3">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-brown/40" size={16} />
                      <input 
                          type="text" 
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Find Recorded Campers..."
                          className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border-2 border-brand-sand/20 focus:border-brand-brown focus:outline-none font-bold text-brand-brown placeholder:text-gray-300 text-sm shadow-sm transition-all"
                      />
                    </div>
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {filteredData.length} TOTAL CAMPER RECORDS
                        </span>
                        <button 
                          onClick={selectAll}
                          className="text-[10px] font-black text-brand-brown hover:text-brand-light-brown transition-colors uppercase tracking-widest"
                        >
                          {selectedIds.size === filteredData.length ? '[ DESELECT ALL ]' : '[ SELECT ALL ]'}
                        </button>
                    </div>
                  </div>

                  {/* LIST PANE (SHRUNKEN TO EXACTLY 5 ITEMS) */}
                  <div className="max-h-[290px] overflow-y-auto p-4 custom-scrollbar bg-white/50">
                    {filteredData.length > 0 ? filteredData.map((item: any) => {
                      const id = item.id || item._id;
                      const isSelected = selectedIds.has(id);
                      return (
                        <div 
                          key={id} 
                          onClick={() => toggleSelect(id)}
                          className={`p-3 rounded-2xl mb-2 cursor-pointer transition-all flex items-center justify-between border-2 ${isSelected ? 'bg-brand-brown text-white border-brand-brown shadow-lg -translate-y-0.5' : 'bg-white border-brand-cream/40 hover:border-brand-sand text-gray-700'}`}
                        >
                            <div className="min-w-0">
                              <h4 className="font-display uppercase tracking-tight truncate text-sm">
                                {item.fullName}
                              </h4>
                              <p className={`text-[10px] font-bold opacity-60 uppercase truncate tracking-widest`}>
                                {item.church}
                              </p>
                            </div>
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-white text-brand-brown border-white' : 'border-brand-sand/30 bg-brand-cream/10'}`}>
                              {isSelected && <Check size={14} className="stroke-[4]" />}
                            </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-10 opacity-20">
                          <Search size={48} className="mx-auto mb-4" />
                          <p className="font-display text-xl uppercase italic">No Matches Found</p>
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-brand-cream/20 border-t-2 border-brand-sand/50 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-brand-brown text-white flex items-center justify-center font-display text-xl shadow-lg">
                              {selectedIds.size}
                          </div>
                          <div className="flex flex-col">
                              <span className="text-[10px] font-black text-brand-brown/40 uppercase tracking-[0.2em] leading-none">Selected</span>
                              <span className="text-xs font-black text-brand-brown uppercase">Batch Queue</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={handlePrint}
                            disabled={selectedIds.size === 0 || isExporting}
                            className="flex items-center gap-2 bg-white border-2 border-brand-brown text-brand-brown px-6 py-3 rounded-2xl shadow-sm hover:bg-brand-cream transition-all font-black uppercase text-[11px] tracking-widest disabled:opacity-30"
                          >
                              <Printer size={18} />
                          </button>
                        </div>
                    </div>

                    <button 
                        onClick={handleDownloadPDF}
                        disabled={selectedIds.size === 0 || isExporting}
                        className="w-full flex items-center justify-center gap-3 bg-brand-brown text-white py-4 rounded-2xl shadow-xl hover:bg-brand-light-brown active:scale-[0.98] transition-all font-black uppercase text-xs tracking-[0.25em] disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 className="animate-spin" size={20} /> : <FileDown size={20} />}
                        {isExporting ? 'PREPARING BATCH...' : 'DOWNLOAD PDFs'}
                    </button>
                  </div>
                </>
              )}
           </div>
        </div>
      </div>

      <div 
        ref={printRef}
        className="print-area fixed top-0 left-0 w-full opacity-0 pointer-events-none z-[-1] font-serif"
      >
          {Array.from(selectedIds).map(id => {
            const item = activeTab === 'waiver' 
              ? registrants.find(r => (r.id || (r as any)._id) === id)
              : solicitations.find(s => (s.id || (s as any)._id) === id);
            return renderDocument(item, activeTab);
          })}
      </div>

      {/* MANUAL HIDDEN PRINT AREA */}
      <div 
        ref={manualPrintRef} 
        className="print-area fixed top-0 left-0 w-full opacity-0 pointer-events-none z-[-1] font-serif text-gray-800"
      >
         {renderDocument({ sourceName: manualSponsorName, amount: 0 }, 'solicitation')}
      </div>

      <style>{`
        @media print {
          body > div { display: none !important; }
          .print-area { 
            display: block !important; 
            opacity: 1 !important; 
            pointer-events: auto !important;
            position: absolute !important; 
            top: 0 !important; 
            left: 0 !important; 
            width: 100% !important; 
            visibility: visible !important;
            z-index: 9999 !important;
          }
          .print-area * { visibility: visible !important; }
          @page { size: portrait; margin: 0; }
        }
        .page-break-after-always {
          page-break-after: always;
        }
      `}</style>
    </div>
  );
}

const Clock = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const Map = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);
