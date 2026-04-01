import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Printer,
  Search,
  Users,
  HeartHandshake,
  Check,
  FileDown,
  Loader2,
  Image,
  ShieldCheck,
} from 'lucide-react';
import { useAppStore } from '../store';
import api from '../api/axios';
import _html2pdf from 'html2pdf.js';

// Handle potential module bundling variations
const html2pdf = _html2pdf;

type DocTemplate = 'waiver' | 'solicitation';

const getDefaultSolicitation = () => {
  return `Greetings of peace in Jesus Christ name!
 
  The Jesus Alliance Mission (JAM), a body of Jesus Christ, will conduct a YOUTH CAMP for Christian youth on {{camp_date}}, at {{camp_location}}. This youth camp will surely help us to have strengthen our faith in the Lord, our relationship to our brothers and sisters in Christ, and spread the Good News of Jesus Christ.
 
In connection with this, we would like to ask for your support in our upcoming event through financial assistance to have enough funds for our needs. Any amount that you will give is highly appreciated. Rest assured that your support is an investment in the spiritual growth of the household of the next generation of believers.
 
We firmly believe God will never forget your labor of love. We are looking forward to your favorable response on this matter. Thank you, and God bless.

Respectfully yours,`;
};

export default function DocumentRegistry() {
  const { registrants, solicitations, appSettings, fetchGlobalSettings, currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<DocTemplate>('waiver');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [manualSponsorName, setManualSponsorName] = useState('');
  const [manualSignatoryName, setManualSignatoryName] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isManualExporting, setIsManualExporting] = useState(false);
  const [detectedYL, setDetectedYL] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);
  const manualPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGlobalSettings();
  }, []);

  useEffect(() => {
    if (appSettings) {
      const fetchYL = async () => {
        if (currentUser?.role === 'coordinator' && currentUser?.church) {
          try {
            const res = await api.get('/api/org/leaders');
            const leaders = res.data || [];
            // Find YL for this church
            const churchYL = leaders.find((l: any) =>
              (l.categories?.includes('Youth Leader') || l.category === 'Youth Leader') &&
              l.churchRef === currentUser.church
            );
            if (churchYL) {
              setDetectedYL(churchYL.name);
              setManualSignatoryName(prev => prev || churchYL.name);
              return;
            }
          } catch (err) {
            console.error("Failed to fetch YL signature", err);
          }
        }

        // Fallback to global camp coordinator if not coordinator or no YL found
        if (appSettings.campSignatory && !manualSignatoryName) {
          setManualSignatoryName(appSettings.campSignatory);
        }
      };

      fetchYL();
    }
  }, [appSettings, currentUser]);

  // Effective Branding
  const branding = {
    campName: appSettings?.campName || 'LAKBAY 2026',
    churchName: appSettings?.churchName || 'UNITED PENTECOSTAL CHURCH PHILIPPINES',
    campDate: appSettings?.campDate || 'MAY 20-23, 2026',
    campLocation: appSettings?.campLocation || 'SUMMER CAMP VENUE',
    campSignatory: (currentUser?.role === 'coordinator' && detectedYL)
      ? detectedYL
      : (appSettings?.campSignatory || 'CAMP DIRECTOR'),
    logoUrl: appSettings?.logoUrl || null
  };

  const handleManualExport = async () => {
    if (!manualPrintRef.current) return;
    setIsManualExporting(true);
    try {
      // 1. Give React a moment to sync DOM with current state (name/signature)
      await new Promise(resolve => setTimeout(resolve, 200));

      const element = manualPrintRef.current;
      const rawName = manualSponsorName || 'BLANK_RECIPIENT';
      const safeName = rawName.toUpperCase().replace(/[^A-Z0-9]/g, '_');

      const opt = {
        margin: 0,
        filename: `LAKBAY_SOLICITATION_${safeName}_${new Date().getTime()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true, logging: false, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
      };

      // @ts-ignore
      const exporter = typeof html2pdf === 'function' ? html2pdf : (html2pdf as any).default;
      
      if (exporter) {
        await exporter().from(element).set(opt).save();
      } else {
        throw new Error('PDF Engine not found.');
      }

      setManualSponsorName('');
    } catch (err) {
      console.error('Manual Export Failed:', err);
      alert("PDF Generation Failed. Please try again or use the Print button.");
    } finally {
      setIsManualExporting(false);
    }
  };

  const handleManualPrint = () => {
    if (!manualPrintRef.current) return;
    // Brief delay to ensure any recent state changes (like signature) are in DOM
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const replaceTags = (text: string, item: any) => {
    if (!text) return '';
    let result = text;
    const data = {
      name: item?.fullName || item?.sourceName || '________________',
      church: item?.church || (currentUser?.role === 'coordinator' ? currentUser.church : '________________'),
      amount: item?.amount?.toLocaleString() || '_______',
      camp_name: branding.campName,
      camp_date: branding.campDate,
      date: branding.campDate,
      camp_location: branding.campLocation,
      location: branding.campLocation,
      signatory: item?.manualSignatory || branding.campSignatory
    };

    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'gi');
      result = result.replace(regex, (value || '') as string);
    });
    return result;
  };

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (activeTab === 'waiver') {
      let list = registrants;
      if (currentUser?.role === 'coordinator' && currentUser?.church) {
        list = list.filter(r => r.church === currentUser.church);
      }
      return list.filter(r => r.fullName.toLowerCase().includes(q) || r.church.toLowerCase().includes(q));
    } else if (activeTab === 'solicitation') {
      return solicitations.filter(s => s.sourceName.toLowerCase().includes(q));
    }
    return [];
  }, [registrants, solicitations, activeTab, searchQuery, currentUser]);

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
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true, logging: false, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
      };

      // @ts-ignore
      const exporter = typeof html2pdf === 'function' ? html2pdf : (html2pdf as any).default;
      
      if (exporter) {
        await exporter().from(element).set(opt).save();
      } else {
        throw new Error('PDF Engine not found.');
      }
    } catch (err) {
      console.error('PDF Generation Failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const renderDocument = (item: any, type: DocTemplate) => {
    const content = type === 'waiver'
      ? (appSettings?.waiverTemplate || `I, _________________________, the parent/legal guardian of {{name}}, a member of {{church}}, hereby give my full consent for my child to participate in the {{camp_name}} at {{camp_location}}.

I understand that this event involves various physical activities, spiritual sessions, and communal living. By signing this document, I acknowledge the following on behalf of my child:

• Health Declaration: My child is physically fit to participate. I have disclosed any medical conditions or allergies to the organizers.
• Media Release: I grant permission for photos/videos of my child to be used in church publications and social media for documentation purposes.
• Liability: I release the organizers and the church from any liability for unforeseen accidents, illnesses, or loss of personal property during the event.
• Safety: I understand that my child must follow all camp rules and safety guidelines.`)
      : (appSettings?.solicitationTemplate || getDefaultSolicitation());

    return (
      <div key={item?.id || item?._id} className="bg-white shadow-none mx-auto border border-gray-100 flex flex-col page-break-after-always overflow-hidden w-[816px] h-[1056px] p-16">

        {/* HEADER */}
        <div className="border-b-2 border-brand-brown pb-8 mb-10 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <div className="bg-brand-brown w-14 h-14 flex items-center justify-center font-display text-white text-3xl">J</div>
            )}
            <div>
              <h1 className="font-display text-brand-brown tracking-tighter text-4xl mb-1">
                JESUS ALLIANCE MISSION
              </h1>
              <p className="font-sans font-black uppercase text-gray-400 tracking-[0.25em] text-[11px]">
                LIPIT-TOMEENG, SAN FABIAN, PANGASINAN
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          {type === 'waiver' && (
            <h2 className="font-display text-brand-brown text-center uppercase tracking-[0.3em] border-b border-brand-sand/20 text-3xl mb-6 pb-6">
              Official Parent Consent
            </h2>
          )}

          {type === 'solicitation' && (
            <div className="flex justify-between items-end mb-8 font-serif text-[13px] border-b border-brand-sand/10 pb-4 min-h-[60px]">
              <div className="space-y-1">
                {(item?.fullName || item?.sourceName) ? (
                  <>
                    <p className="font-black text-brand-brown uppercase tracking-widest text-[9px]">RECIPIENT:</p>
                    <p className="text-xl font-bold uppercase text-gray-800">{replaceTags('{{name}}', item)}</p>
                  </>
                ) : (
                  <div className="h-full" />
                )}
              </div>
              <div className="text-right space-y-1">
                <p className="font-black text-brand-brown uppercase tracking-widest text-[9px]">DATE ISSUED:</p>
                <p className="text-lg font-bold uppercase text-gray-800">
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}

          <div className="font-serif text-gray-800 text-justify leading-relaxed whitespace-pre-wrap text-base">
            {replaceTags(content, item)}
          </div>

          {type === 'solicitation' && (
            <div className="flex flex-col items-start mt-12 px-4">
              <div className="w-full max-w-[320px]">
                {/* E-Signature Image (Placed above) */}
                {(item?.eSignatureUrl || currentUser?.eSignatureUrl) && (
                  <div className="h-14 flex items-center justify-start ml-6 mb-[-1rem] relative z-20 overflow-visible">
                    <img
                      src={item?.eSignatureUrl || currentUser?.eSignatureUrl}
                      alt="Signature"
                      className="h-full w-auto object-contain mix-blend-multiply opacity-95 filter contrast-125"
                    />
                  </div>
                )}

                <div className="border-b-2 border-brand-brown pb-1 text-xl font-display text-brand-brown relative z-10 text-left">
                  {item?.manualSignatory || branding.campSignatory}
                </div>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Youth Leader Representative</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{branding.churchName}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 font-mono">Contact: +63 962 526 9054</p>
                </div>
              </div>
            </div>
          )}

          {type === 'waiver' && (
            <div className="flex flex-col items-start mt-12 gap-8 w-full max-w-sm">
              <div className="w-full">
                <p className="font-serif italic text-gray-600 mb-4 text-sm">Camper's Name:</p>
                <div className="font-display text-brand-brown border-b-2 border-brand-brown/30 pb-1 text-left text-xl">
                  {item?.fullName || '_________________________'}
                </div>
                <p className="font-sans font-black uppercase tracking-[0.2em] text-gray-400 text-[8px] mt-1">Registered Delegate</p>
              </div>

              <div className="w-full">
                <p className="font-serif italic text-gray-600 mb-4 text-sm">Parent/Guardian Signature:</p>
                <div className="border-b-2 border-brand-brown pb-1 min-w-[280px] h-12">
                  {/* Space for parent signature */}
                </div>
                <p className="font-sans font-black uppercase tracking-[0.2em] text-brand-brown text-[9px] mt-2">Parent / Legal Guardian Name & Signature</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen">
        <div className="print:hidden space-y-4 max-w-4xl mx-auto pb-10 px-4 animate-in fade-in duration-500">

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
                <ShieldCheck size={14} /> Parent Consent
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
            {/* REGISTRY LIST (Ultra-Compact Peak) */}
            <div className="bg-white rounded-3xl md:rounded-[2.5rem] border-2 border-brand-sand shadow-2xl overflow-hidden flex flex-col">

              {/* OFFICIAL DOCUMENT HUB (Solicitation Only) */}
              {activeTab === 'solicitation' && (
                <div className="p-4 md:p-6 border-b border-gray-100 bg-brand-cream/5 animate-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center justify-between mb-4 md:mb-6 px-1">
                    <div className="space-y-0.5 md:space-y-1">
                      <span className="text-[10px] font-black text-brand-brown/60 uppercase tracking-[0.25em]">Executive Document Suite</span>
                      <h3 className="text-xl md:text-2xl font-display text-brand-brown tracking-tighter leading-none">Official Document Hub</h3>
                    </div>
                    <div className="text-right hidden md:block">
                      <span className="text-[8px] font-black text-brand-brown/40 uppercase tracking-widest bg-brand-brown/5 px-2 py-1 rounded-full border border-brand-brown/10 italic">Authorized</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
                    {/* LEFT COLUMN: RECIPIENT */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-brand-brown/5 flex items-center justify-center text-brand-brown shrink-0 border border-brand-brown/5">
                          <Users size={14} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-brand-brown uppercase tracking-widest leading-none">Recipient</h4>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-[1.5rem] border border-brand-sand/30 shadow-sm space-y-3">
                        <div>
                          <label className="text-[9px] font-black text-brand-brown/40 uppercase tracking-widest ml-1 mb-1 block">Recipient Name / Organization</label>
                          <input
                            id="manual_sponsor_name"
                            type="text"
                            value={manualSponsorName}
                            onChange={e => setManualSponsorName(e.target.value)}
                            placeholder="e.g. ABC Corporation"
                            className="w-full px-4 py-3 border-2 border-brand-sand/10 rounded-xl focus:border-brand-brown outline-none font-bold text-gray-700 bg-brand-cream/5 transition-all placeholder:text-gray-200 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: SIGNATORY */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-brand-brown/5 flex items-center justify-center text-brand-brown shrink-0 border border-brand-brown/5">
                          <Check size={14} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-brand-brown uppercase tracking-widest leading-none">Authorized Signatory</h4>
                        </div>
                      </div>
                      <div className="bg-white p-6 rounded-[2rem] shadow-inner space-y-6">
                        <div>
                          <label className="text-[10px] font-black text-brand-brown/50 uppercase tracking-[0.2em] ml-2 mb-2 block">Authorized Signature Name</label>
                          <input
                            id="manual_signatory_name"
                            type="text"
                            value={manualSignatoryName}
                            onChange={e => setManualSignatoryName(e.target.value)}
                            placeholder="Name of Signatory..."
                            className="w-full px-6 py-4 border-2 border-brand-sand/10 rounded-2xl focus:border-brand-brown outline-none font-bold text-gray-700 bg-brand-cream/5 transition-all placeholder:text-gray-200 text-sm"
                          />
                        </div>

                        {/* E-SIGNATURE UPLOAD */}
                        <div className="p-4 rounded-2xl border-2 border-dashed border-brand-sand/20 bg-brand-cream/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-brand-brown/50 uppercase tracking-[0.15em] flex items-center gap-2">
                              <Image size={14} className="text-brand-light-brown" /> Electronic Signature
                            </span>
                            {currentUser?.eSignatureUrl && (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Authenticated</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="w-28 h-14 bg-white border-2 border-brand-sand/10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg group relative">
                              {currentUser?.eSignatureUrl ? (
                                <img src={currentUser.eSignatureUrl} alt="E-Signature" className="max-w-[85%] max-h-[85%] object-contain" />
                              ) : (
                                <div className="text-[8px] text-gray-300 uppercase font-black text-center px-2">No Signature Uploaded</div>
                              )}
                              <div className="absolute inset-0 bg-brand-brown/0 group-hover:bg-brand-brown/5 transition-colors pointer-events-none" />
                            </div>
                            <div className="flex flex-col flex-1 gap-2">
                              <label className="w-full flex items-center justify-center px-4 py-2.5 bg-brand-brown text-white rounded-xl cursor-pointer hover:bg-brand-light-brown transition-all text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-brown/10 active:translate-y-0.5">
                                {isManualExporting ? 'Applying...' : (currentUser?.eSignatureUrl ? 'Change' : 'Upload Signature')}
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    const reader = new FileReader();
                                    reader.onloadend = async () => {
                                      try {
                                        const base64 = reader.result as string;
                                        const res = await api.put('/api/auth/profile', { eSignatureUrl: base64 });
                                        if (res.data.user) {
                                          // @ts-ignore
                                          const updated = { ...currentUser, ...res.data.user };
                                          useAppStore.setState({ currentUser: updated });
                                          sessionStorage.setItem('lakbay_auth', JSON.stringify(updated));
                                        }
                                      } catch (err) {
                                        console.error("Signature upload failed", err);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                />
                              </label>
                              {currentUser?.eSignatureUrl && (
                                <button
                                  onClick={() => setShowClearConfirm(true)}
                                  className="w-full py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-all text-[8px] font-black uppercase tracking-widest active:scale-95"
                                >
                                  Clear Signature
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 items-center justify-between pt-4 border-t border-brand-sand/10 px-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest italic opacity-60">
                      * Generates an official solicitation letter.
                    </p>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button
                        onClick={handleManualExport}
                        disabled={isManualExporting}
                        className="flex-1 md:flex-none md:min-w-[140px] bg-brand-brown text-white px-6 py-3 rounded-xl shadow-xl hover:bg-brand-light-brown hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all flex items-center justify-center gap-2 group"
                      >
                        {isManualExporting ? <Loader2 size={16} className="animate-spin" /> : (
                          <>
                            <FileDown size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Export PDF</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleManualPrint}
                        disabled={isManualExporting}
                        className="bg-white border-2 border-brand-brown text-brand-brown px-4 py-3 rounded-xl shadow-md hover:bg-brand-cream hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all flex items-center justify-center"
                      >
                        <Printer size={16} />
                      </button>
                    </div>
                  </div>
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
      </div>

      {/* BATCH PRINT AREA */}
      {(selectedIds.size > 0) && (
        <div
          ref={printRef}
          style={{ position: 'absolute', left: '-9999px', top: '0', width: '210mm' }}
          className="print-area font-serif bg-white"
        >
          {Array.from(selectedIds).map((id, index) => {
            const item = activeTab === 'waiver'
              ? registrants.find(r => (r.id || (r as any)._id) === id)
              : solicitations.find(s => (s.id || (s as any)._id) === id);
            return (
              <div key={id} className={index > 0 ? "page-break-after-always" : ""}>
                {renderDocument(item, activeTab)}
              </div>
            );
          })}
        </div>
      )}

      {/* MANUAL HIDDEN PRINT AREA */}
      {activeTab === 'solicitation' && (
        <div
          ref={manualPrintRef}
          style={{ position: 'absolute', left: '-9999px', top: '0', width: '210mm' }}
          className="print-area font-serif text-gray-800 bg-white"
        >
          {renderDocument({
            sourceName: manualSponsorName,
            amount: 0,
            manualSignatory: manualSignatoryName
          }, 'solicitation')}
        </div>
      )}

      {/* CUSTOM CONFIRMATION POP-UP */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-brand-brown/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowClearConfirm(false)}
          />
          <div className="relative bg-white rounded-[2rem] shadow-2xl border-2 border-brand-sand/30 p-8 max-w-sm w-full animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
              <span className="text-2xl font-bold">!</span>
            </div>
            <h4 className="text-xl font-display text-brand-brown text-center mb-2">Clear Signature?</h4>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center mb-8 leading-relaxed">
              This will permanently remove your e-signature from your profile.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-4 border-2 border-brand-sand/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-brand-cream/50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await api.put('/api/auth/profile', { eSignatureUrl: '' });
                    if (res.data.user) {
                      // @ts-ignore
                      const updated = { ...currentUser, ...res.data.user };
                      useAppStore.setState({ currentUser: updated });
                      sessionStorage.setItem('lakbay_auth', JSON.stringify(updated));
                    }
                    setShowClearConfirm(false);
                  } catch (err) {
                    console.error("Remove failed", err);
                  }
                }}
                className="flex-1 px-4 py-4 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body { visibility: hidden !important; }
          .print-area, .print-area * { 
            visibility: visible !important; 
          }
          .print-area { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            display: block !important;
            opacity: 1 !important;
            z-index: 9999 !important;
          }
          @page { size: auto; margin: 0mm; }
        }
        .page-break-after-always {
          page-break-after: always;
        }
      `}</style>
    </>
  );
}


