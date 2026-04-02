import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Printer,
  Search,
  Users,
  HeartHandshake,
  Check,
  Loader2,
  Image,
  ShieldCheck,
  Download,
  Plus,
  XCircle,
  AlertCircle,
  Info,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { useAppStore } from '../store';
import api from '../api/axios';

// Loaded via local script tag in index.html for hardware-independent reliability
declare const html2pdf: any;


type DocTemplate = 'waiver' | 'solicitation';
type PopupType = 'alert' | 'confirm' | 'warning' | 'error';

interface PopupConfig {
  title: string;
  message: string;
  type: PopupType;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const getDefaultSolicitation = () => {
  return `Greetings of peace in Jesus Christ name!
 
  The Jesus Alliance Mission (JAM), a body of Jesus Christ, will conduct a YOUTH CAMP for Christian youth on {{camp_date}}, at {{camp_location}}. This youth camp will surely help us to have strengthen our faith in the Lord, our relationship to our brothers and sisters in Christ, and spread the Good News of Jesus Christ.
 
In connection with this, we would like to ask for your support in our upcoming event through financial assistance to have enough funds for our needs. Any amount that you will give is highly appreciated. Rest assured that your support is an investment in the spiritual growth of the household of the next generation of believers.
 
We firmly believe God will never forget your labor of love. We are looking forward to your favorable response on this matter. Thank you, and God bless.

Respectfully yours,`;
};

export default function DocumentRegistry() {
  const {
    registrants,
    solicitations,
    appSettings,
    fetchGlobalSettings,
    currentUser,
    startExport,
    activeExport
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<DocTemplate>('waiver');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [manualSponsorName, setManualSponsorName] = useState('');
  const [manualSignatoryName, setManualSignatoryName] = useState('');
  const [popup, setPopup] = useState<PopupConfig | null>(null);
  const [isManualExporting, setIsManualExporting] = useState(false);
  const [isPrintingSelected, setIsPrintingSelected] = useState(false);
  const [separateFiles, setSeparateFiles] = useState(false);
  const [manualRecipients, setManualRecipients] = useState<string[]>([]);
  const [detectedYL, setDetectedYL] = useState<string>('');

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

  const handleManualPrint = async () => {
    setIsManualExporting(true);
    // Wait for render
    setTimeout(() => {
      window.print();
      // Keep it active for 5s post-print so mobile Safari/Chrome can "grab" the content for preview
      setTimeout(() => setIsManualExporting(false), 5000);
    }, 2000);
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
      let list = registrants.filter(r => (r.church || '').toUpperCase().trim() !== 'JAM');
      if (currentUser?.role === 'coordinator' && currentUser?.church) {
        list = list.filter(r => r.church === currentUser.church);
      }
      return list.filter(r => r.fullName.toLowerCase().includes(q) || (r.church || '').toLowerCase().includes(q));
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

  const handlePrint = async () => {
    // Check for unsaved input
    if (manualSponsorName.trim() && manualRecipients.length > 0) {
      setPopup({
        title: 'Unsaved Recipient',
        message: `"${manualSponsorName.trim()}" is still in the input field but hasn't been added to your list yet. Print the others anyway?`,
        type: 'confirm',
        confirmText: 'Print Anyway',
        onConfirm: () => {
          setPopup(null);
          executePrint();
        }
      });
      return;
    }

    executePrint();
  };

  const executePrint = () => {
    setIsPrintingSelected(true);
    // Buffer for full document render in the hidden staging area
    setTimeout(() => {
      window.print();
      // Keep it active for 5s post-print so mobile Safari/Chrome can "grab" the content for preview
      setTimeout(() => setIsPrintingSelected(false), 5000);
    }, 2000);
  };

  const handleDownloadPDF = async () => {
    // Check for unsaved input
    if (manualSponsorName.trim() && manualRecipients.length > 0) {
      setPopup({
        title: 'Unsaved Recipient',
        message: `"${manualSponsorName.trim()}" is still in the input field but hasn't been added to your list yet. Process the others anyway?`,
        type: 'confirm',
        confirmText: 'Process Anyway',
        onConfirm: () => {
          setPopup(null);
          executeDownloadPDF();
        }
      });
      return;
    }

    executeDownloadPDF();
  };

  const executeDownloadPDF = async () => {
    // In solicitation tab, we allow blank prints
    if (activeTab === 'waiver' && selectedIds.size === 0 && !manualSponsorName) return;

    if (typeof html2pdf === 'undefined') {
      setPopup({
        title: 'Engine Loading',
        message: 'PDF Engine is still loading. Please wait a few seconds.',
        type: 'warning'
      });
      return;
    }

    const idsToExport = Array.from(selectedIds);
    const isManualBatch = activeTab === 'solicitation' && manualRecipients.length > 0;
    const isSingleManual = activeTab === 'solicitation' && selectedIds.size === 0;
    const isManual = isManualBatch || isSingleManual;

    let fileName = `LAKBAY_BATCH_${selectedIds.size || manualRecipients.length || 1}_DOCS_${new Date().getTime()}.pdf`;

    const manualData = isManualBatch
      ? manualRecipients.map(name => ({ sourceName: name, manualSignatory: manualSignatoryName }))
      : (isSingleManual ? { sourceName: manualSponsorName, manualSignatory: manualSignatoryName } : undefined);

    if (isManual && !isManualBatch) {
      const cleanName = manualSponsorName.replace(/[^a-zA-Z0-9]/g, '_');
      fileName = `${cleanName}_Solicitation_Letter.pdf`;
    } else if (selectedIds.size === 1) {
      const id = idsToExport[0];
      const item = activeTab === 'waiver'
        ? registrants.find(r => (r.id || (r as any)._id) === id)
        : solicitations.find(s => (s.id || (s as any)._id) === id);
      const rawName = (item as any)?.fullName || (item as any)?.sourceName || 'Export';
      const cleanName = rawName.replace(/[^a-zA-Z0-9]/g, '_');
      const suffix = activeTab === 'waiver' ? 'Parent_Consent' : 'Solicitation_Letter';
      fileName = `${cleanName}_${suffix}.pdf`;
    }

    startExport({
      ids: idsToExport,
      template: activeTab,
      fileName,
      isManual,
      separateFiles,
      manualData
    });
  };

  const renderDocument = (item: any, type: DocTemplate) => {
    const content = type === 'waiver'
      ? (appSettings?.waiverTemplate || `I, _________________________, the parent/legal guardian of {{name}}, a member of {{church}}, hereby give my full consent for my child to participate in the {{camp_name}} on {{camp_date}} at {{camp_location}}.

I understand that this event involves various physical activities, spiritual sessions, and communal living. By signing this document, I acknowledge the following on behalf of my child:

• Health Declaration: My child is physically fit to participate. I have disclosed any medical conditions or allergies to the organizers.
• Media Release: I grant permission for photos/videos of my child to be used in church publications and social media for documentation purposes.
• Liability: I release the organizers and the church from any liability for unforeseen accidents, illnesses, or loss of personal property during the event.
• Safety: I understand that my child must follow all camp rules and safety guidelines.`)
      : (appSettings?.solicitationTemplate || getDefaultSolicitation());

    return (
      <div key={item?.id || item?._id} className="bg-white shadow-none mx-auto border border-gray-100 flex flex-col overflow-hidden w-[816px] h-[1055px] p-16 printable-document">

        {/* HEADER */}
        <div style={{ borderColor: '#8B4513' }} className="border-b-2 pb-8 mb-10 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" crossOrigin="anonymous" className="h-16 w-auto max-w-[120px] object-contain" />
            ) : (
              <div style={{ backgroundColor: '#8B4513' }} className="w-14 h-14 flex items-center justify-center font-display text-white text-3xl">J</div>
            )}
            <div>
              <h1 style={{ color: '#8B4513' }} className="font-display tracking-tighter text-4xl mb-1">
                JESUS ALLIANCE MISSION
              </h1>
              <p style={{ color: '#9CA3AF' }} className="font-sans font-black uppercase tracking-[0.25em] text-[11px]">
                LIPIT-TOMEENG, SAN FABIAN, PANGASINAN
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          {type === 'waiver' && (
            <>
              <div style={{ borderColor: 'rgba(210, 180, 140, 0.1)' }} className="flex justify-between items-end mb-6 font-serif text-[13px] border-b pb-4 min-h-[60px]">
                <div className="space-y-1">
                  <p style={{ color: '#8B4513' }} className="font-black uppercase tracking-widest text-[9px]">PARTICIPANT:</p>
                  <p className="text-xl font-bold uppercase text-gray-800">{item?.fullName || '________________'}</p>
                </div>
                <div className="text-right space-y-1">
                  <p style={{ color: '#8B4513' }} className="font-black uppercase tracking-widest text-[9px]">DATE ISSUED:</p>
                  <p className="text-lg font-bold uppercase text-gray-800">
                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <h2 style={{ color: '#8B4513', borderColor: 'rgba(210, 180, 140, 0.2)' }} className="font-display text-center uppercase tracking-[0.3em] border-b text-3xl mb-6 pb-6">
                Official Parent Consent
              </h2>
            </>
          )}

          {type === 'solicitation' && (
              <div style={{ borderColor: 'rgba(210, 180, 140, 0.1)' }} className="flex justify-between items-end mb-8 font-serif text-[13px] border-b pb-4 min-h-[60px]">
                <div className="space-y-1">
                  {(item?.fullName || item?.sourceName) && (
                    <>
                      <p style={{ color: '#8B4513' }} className="font-black uppercase tracking-widest text-[9px]">RECIPIENT:</p>
                      <p className="text-xl font-bold uppercase text-gray-800">{replaceTags('{{name}}', item)}</p>
                    </>
                  )}
                </div>
              <div className="text-right space-y-1">
                <p style={{ color: '#8B4513' }} className="font-black uppercase tracking-widest text-[9px]">DATE ISSUED:</p>
                <p className="text-lg font-bold uppercase text-gray-800">
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}

          <div style={{ color: '#4B5563' }} className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
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
                      crossOrigin="anonymous"
                      className="h-full w-auto object-contain mix-blend-multiply opacity-95 filter contrast-125"
                    />
                  </div>
                )}

                <div style={{ borderColor: '#8B4513', color: '#8B4513' }} className="border-b-2 pb-1 text-xl font-display relative z-10 text-left">
                  {item?.manualSignatory || branding.campSignatory}
                </div>
                <div className="mt-2 space-y-0.5">
                  <p style={{ color: '#9CA3AF' }} className="text-[10px] font-black uppercase tracking-[0.2em]">Youth Leader Representative</p>
                  <p style={{ color: '#9CA3AF' }} className="text-[10px] font-black uppercase tracking-[0.2em]">{branding.churchName}</p>
                </div>
              </div>
            </div>
          )}

          {type === 'waiver' && (
            <div className="flex flex-col items-start mt-12 gap-8 w-full max-w-sm">
              <div className="flex gap-8 w-full">
                <div className="flex-1">
                  <p className="font-serif italic text-gray-600 mb-4 text-sm">Parent/Guardian Signature:</p>
                  <div className="border-b-2 border-brand-brown pb-1 h-12">
                    {/* Space for parent signature */}
                  </div>
                  <p className="font-sans font-black uppercase tracking-[0.2em] text-brand-brown text-[9px] mt-2">Parent / Legal Guardian Name & Signature</p>
                </div>
                <div className="w-40">
                  <p className="font-serif italic text-gray-600 mb-4 text-sm">Date Signed:</p>
                  <div className="border-b-2 border-brand-brown pb-1 h-12">
                    {/* Space for date signature */}
                  </div>
                  <p className="font-sans font-black uppercase tracking-[0.2em] text-gray-400 text-[9px] mt-2">MM / DD / YYYY</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen print:min-h-0">
        <div className="print:hidden space-y-4 max-w-4xl mx-auto pb-10 px-4 animate-in fade-in duration-500">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-brand-sand/20">
            <div>
              <h2 className="text-2xl font-display text-brand-brown tracking-tight">PDF Export Hub</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-0.5">Automated Documentation</p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-white border border-brand-sand/50 rounded-xl shadow-sm">
              <button
                onClick={() => { setActiveTab('waiver'); setSelectedIds(new Set()); setSearchQuery(''); }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'waiver' ? 'bg-brand-brown text-white shadow-sm' : 'text-gray-400 hover:text-brand-brown'}`}
              >
                <ShieldCheck size={13} /> Consent
              </button>
              <button
                onClick={() => { setActiveTab('solicitation'); setSelectedIds(new Set()); setSearchQuery(''); }}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'solicitation' ? 'bg-brand-brown text-white shadow-sm' : 'text-gray-400 hover:text-brand-brown'}`}
              >
                <HeartHandshake size={13} /> Solicitation Letter
              </button>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-2xl border-2 border-brand-sand shadow-xl overflow-hidden flex flex-col">

              {/* SOLICITATION TAB */}
              {activeTab === 'solicitation' && (
                <div className="p-4 space-y-3 animate-in slide-in-from-top-2 duration-300">

                  {/* Recipient + Signatory row */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-[9px] font-black text-brand-brown/50 uppercase tracking-widest flex items-center gap-1">
                        <Users size={10} /> Recipient Name
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="manual_sponsor_name"
                          type="text"
                          value={manualSponsorName}
                          onChange={e => setManualSponsorName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const name = manualSponsorName.trim();
                              if (!name) {
                                setPopup({ title: 'Input Required', message: 'Please enter a name first.', type: 'warning' });
                                return;
                              }
                              if (manualRecipients.includes(name)) {
                                setPopup({ title: 'Duplicate Name', message: 'This name is already in your list.', type: 'warning' });
                                return;
                              }
                              setManualRecipients([...manualRecipients, name]);
                              setManualSponsorName('');
                            }
                          }}
                          placeholder="e.g. ABC Corporation"
                          className="flex-1 px-3 py-2.5 border-2 border-brand-sand/20 rounded-xl focus:border-brand-brown outline-none font-bold text-gray-700 bg-white transition-all placeholder:text-gray-200 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const name = manualSponsorName.trim();
                            if (!name) {
                              alert("Please enter a name first.");
                              return;
                            }
                            if (manualRecipients.includes(name)) {
                              alert("This name is already in your list.");
                              return;
                            }
                            setManualRecipients([...manualRecipients, name]);
                            setManualSponsorName('');
                          }}
                          className="bg-brand-brown text-white p-2.5 rounded-xl hover:bg-brand-light-brown transition-all shadow-md shrink-0"
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      {/* RECIPIENT LIST */}
                      {manualRecipients.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-300">
                          {manualRecipients.map(name => (
                            <div key={name} className="flex items-center gap-1 bg-brand-brown text-white px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm border border-white/10 group">
                              {name}
                              <button
                                onClick={() => setManualRecipients(manualRecipients.filter(n => n !== name))}
                                className="ml-1 text-white/50 hover:text-white transition-colors"
                              >
                                <XCircle size={12} className="fill-current" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <label className="text-[9px] font-black text-brand-brown/50 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Check size={10} /> Signatory
                      </label>
                      <input
                        id="manual_signatory_name"
                        type="text"
                        value={manualSignatoryName}
                        onChange={e => setManualSignatoryName(e.target.value)}
                        placeholder="Name of Signatory..."
                        className="w-full px-3 py-2.5 border-2 border-brand-sand/20 rounded-xl focus:border-brand-brown outline-none font-bold text-gray-700 bg-white transition-all placeholder:text-gray-200 text-sm"
                      />
                    </div>
                  </div>

                  {/* E-Signature + Actions Footer */}
                  <div className="flex flex-col gap-4 pt-4 border-t border-brand-sand/10">
                    {/* Top Row: Signature info */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-16 h-10 bg-brand-cream/10 border border-brand-sand/20 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                          {currentUser?.eSignatureUrl ? (
                            <img src={currentUser.eSignatureUrl} alt="E-Signature" className="max-w-full max-h-full object-contain" />
                          ) : (
                            <Image size={14} className="text-gray-300" />
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <label className="flex items-center justify-center px-3 py-1 bg-brand-brown/5 border border-brand-sand/30 text-brand-brown rounded-lg cursor-pointer hover:bg-brand-brown/10 transition-all text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                            {currentUser?.eSignatureUrl ? 'Change' : 'Upload Signature'}
                            <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const base64 = reader.result as string;
                                try {
                                  const res = await api.put('/api/auth/profile', { eSignatureUrl: base64 });
                                  if (res.data.user) {
                                    useAppStore.setState({ currentUser: { ...currentUser, ...res.data.user } });
                                  }
                                } catch (err) { console.error(err); }
                              };
                              reader.readAsDataURL(file);
                            }} />
                          </label>
                          {currentUser?.eSignatureUrl && (
                            <button 
                              onClick={() => setPopup({
                                title: 'Clear Signature?',
                                message: 'This will permanently remove your e-signature from your profile.',
                                type: 'confirm',
                                confirmText: 'Yes, Clear',
                                onConfirm: async () => {
                                  try {
                                    const res = await api.put('/api/auth/profile', { eSignatureUrl: '' });
                                    if (res.data.user) {
                                      const updated = { ...currentUser, ...res.data.user };
                                      useAppStore.setState({ currentUser: updated });
                                      sessionStorage.setItem('lakbay_auth', JSON.stringify(updated));
                                    }
                                    setPopup(null);
                                  } catch (err) { console.error("Remove failed", err); }
                                }
                              })} 
                              className="text-[7px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors text-left"
                            >
                              Clear Signature
                            </button>
                          )}
                        </div>
                      </div>

                      {currentUser?.eSignatureUrl && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-full shrink-0">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[8px] font-black text-green-600 uppercase tracking-widest">Signed</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex-1">
                        <label className="flex items-center gap-2 cursor-pointer group bg-brand-cream/5 px-2.5 py-2 rounded-xl border border-brand-sand/30 w-full sm:w-auto">
                          <input
                            type="checkbox"
                            checked={separateFiles}
                            onChange={e => setSeparateFiles(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-2 border-brand-sand/50 text-brand-brown focus:ring-brand-brown transition-all cursor-pointer"
                          />
                          <span className="text-[8px] font-black text-brand-brown/60 uppercase tracking-widest group-hover:text-brand-brown transition-colors">1 File per person</span>
                        </label>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={handleDownloadPDF}
                          disabled={activeExport?.isProcessing}
                          className="flex-1 sm:flex-none border-2 border-brand-brown/20 text-brand-brown px-4 py-2.5 rounded-xl hover:bg-brand-brown/5 transition-all flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
                        >
                          {activeExport?.isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                          PDF
                        </button>
                        <button
                          onClick={() => {
                            if (manualRecipients.length > 0) handlePrint();
                            else handleManualPrint();
                          }}
                          disabled={isManualExporting || activeExport?.isProcessing || isPrintingSelected}
                          className="flex-1 sm:flex-none bg-brand-brown text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-brand-light-brown active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-[0.2em]"
                        >
                          {isManualExporting || isPrintingSelected ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Prep...
                            </>
                          ) : (
                            <>
                              <Printer size={16} />
                              Print
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PARENT CONSENT TAB */}
              {activeTab === 'waiver' && (
                <>
                  <div className="p-3 border-b border-gray-100 bg-brand-cream/10">
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-brown/40" size={14} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Find Recorded Campers..."
                        className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border-2 border-brand-sand/20 focus:border-brand-brown focus:outline-none font-bold text-brand-brown placeholder:text-gray-300 text-sm shadow-sm transition-all"
                      />
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        {filteredData.length} records
                      </span>
                      <button
                        onClick={selectAll}
                        className="text-[9px] font-black text-brand-brown hover:text-brand-light-brown transition-colors uppercase tracking-widest"
                      >
                        {selectedIds.size === filteredData.length ? '[ Deselect All ]' : '[ Select All ]'}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[320px] overflow-y-auto p-3 custom-scrollbar bg-white/50">
                    {filteredData.length > 0 ? (
                      <>
                        {filteredData.slice(0, showAll ? undefined : 5).map((item: any) => {
                          const id = item.id || item._id;
                          const isSelected = selectedIds.has(id);
                          return (
                            <div
                              key={id}
                              onClick={() => toggleSelect(id)}
                              className={`px-3 py-2 rounded-xl mb-1.5 cursor-pointer transition-all flex items-center justify-between border-2 ${isSelected ? 'bg-brand-brown text-white border-brand-brown shadow-md -translate-y-0.5' : 'bg-white border-brand-cream/40 hover:border-brand-sand text-gray-700'}`}
                            >
                              <div className="min-w-0">
                                <h4 className="font-display uppercase tracking-tight truncate text-sm leading-none">{item.fullName}</h4>
                                <p className="text-[9px] font-bold opacity-50 uppercase truncate tracking-widest mt-0.5">{item.church}</p>
                              </div>
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all shrink-0 ml-3 ${isSelected ? 'bg-white text-brand-brown border-white' : 'border-brand-sand/30 bg-brand-cream/10'}`}>
                                {isSelected && <Check size={12} className="stroke-[4]" />}
                              </div>
                            </div>
                          );
                        })}

                        {filteredData.length > 5 && (
                          <button
                            onClick={() => setShowAll(!showAll)}
                            className="w-full py-3 border-2 border-dashed border-brand-sand/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-brand-brown/40 hover:border-brand-brown/30 hover:text-brand-brown/60 transition-all flex items-center justify-center gap-2 group mb-1"
                          >
                            {showAll ? 'Show Fewer Records' : `Show all ${filteredData.length} records`}
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 opacity-20">
                        <Search size={36} className="mx-auto mb-3" />
                        <p className="font-display text-lg uppercase italic">No Matches Found</p>
                      </div>
                    )}
                  </div>

                  {/* Batch Action Footer */}
                  <div className="px-3 py-4 bg-brand-cream/10 border-t border-brand-sand/30 flex flex-col gap-4">
                    {/* Top Row: Info & Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-brand-brown text-white flex items-center justify-center font-display text-base shadow shrink-0">
                          {selectedIds.size}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-brand-brown/40 uppercase tracking-widest leading-none">Batch Queue</p>
                          <p className="text-[10px] font-black text-brand-brown uppercase truncate">
                            {selectedIds.size > 0 ? 'Ready to Export' : 'Select items below'}
                          </p>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer group bg-brand-cream/5 px-2.5 py-1.5 rounded-lg border border-brand-sand/30 shrink-0">
                        <input
                          type="checkbox"
                          checked={separateFiles}
                          onChange={e => setSeparateFiles(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-2 border-brand-sand/50 text-brand-brown focus:ring-brand-brown transition-all cursor-pointer"
                        />
                        <span className="text-[8px] font-black text-brand-brown/60 uppercase tracking-widest group-hover:text-brand-brown transition-colors">1 File each</span>
                      </label>
                    </div>

                    {/* Bottom Row: Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleDownloadPDF}
                        disabled={selectedIds.size === 0 || activeExport?.isProcessing}
                        className="flex-1 border-2 border-brand-brown/20 text-brand-brown px-4 py-2.5 rounded-xl hover:bg-brand-brown/5 transition-all font-black uppercase text-[10px] tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {activeExport?.isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                        PDF
                      </button>
                      <button
                        onClick={handlePrint}
                        disabled={selectedIds.size === 0 || activeExport?.isProcessing || isPrintingSelected}
                        className="flex-1 bg-brand-brown text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-brand-light-brown active:scale-[0.98] transition-all font-black uppercase text-[10px] tracking-[0.2em] disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {isPrintingSelected ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Prep...
                          </>
                        ) : (
                          <>
                            <Printer size={16} />
                            Print
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* OFF-SCREEN STAGING AREA - Outside print:hidden but inside min-h-screen */}
        {(activeTab === 'solicitation' && isManualExporting) && (
          <div
            ref={manualPrintRef}
            className="bg-white font-serif text-gray-800 w-[816px] fixed top-[-9999px] left-[-9999px] print:static print:block"
          >
            {renderDocument({
              sourceName: manualSponsorName,
              amount: 0,
              manualSignatory: manualSignatoryName
            }, 'solicitation')}
          </div>
        )}

        {/* NATIVE BATCH PRINT STAGING - Only visible to the printer */}
        {isPrintingSelected && (
          <div className="bg-white font-serif w-[816px] fixed top-[-9999px] left-[-9999px] print:static print:block">
            {selectedIds.size > 0 ? (
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
            ) : (
              (manualRecipients.length > 0 ? manualRecipients : [manualSponsorName]).map((name, index) => (
                <div key={`${name}-${index}`} className={index > 0 ? "page-break-before-always" : ""}>
                  {renderDocument({ sourceName: name, manualSignatory: manualSignatoryName }, 'solicitation')}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {popup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-brand-brown/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => !popup.onConfirm && setPopup(null)}
          />
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl border-2 border-brand-sand/30 p-10 max-w-sm w-full animate-in zoom-in-95 duration-300 overflow-hidden">
            {/* ICON DECOR */}
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 mx-auto ${
              popup.type === 'confirm' ? 'bg-brand-brown/10 text-brand-brown' :
              popup.type === 'warning' ? 'bg-amber-50 text-amber-500' :
              popup.type === 'error' ? 'bg-red-50 text-red-500' :
              'bg-blue-50 text-blue-500'
            }`}>
              {popup.type === 'confirm' && <HelpCircle size={40} />}
              {popup.type === 'warning' && <AlertTriangle size={40} />}
              {popup.type === 'error' && <AlertCircle size={40} />}
              {popup.type === 'alert' && <Info size={40} />}
            </div>

            <h4 className="text-2xl font-display text-brand-brown text-center mb-3">{popup.title}</h4>
            <p className="text-[12px] font-bold text-gray-500 uppercase tracking-widest text-center mb-10 leading-relaxed px-2">
              {popup.message}
            </p>

            <div className="flex gap-4">
              {(popup.type === 'confirm' || popup.onCancel) && (
                <button
                  onClick={() => {
                    if (popup.onCancel) popup.onCancel();
                    setPopup(null);
                  }}
                  className="flex-1 px-4 py-4 border-2 border-brand-sand/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-brand-cream/50 hover:text-brand-brown transition-all"
                >
                  {popup.cancelText || 'Cancel'}
                </button>
              )}
              <button
                onClick={() => {
                  if (popup.onConfirm) popup.onConfirm();
                  else setPopup(null);
                }}
                className={`flex-1 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${
                  popup.type === 'confirm' ? 'bg-brand-brown text-white shadow-brand-brown/20' :
                  popup.type === 'error' ? 'bg-red-500 text-white shadow-red-500/20' :
                  'bg-brand-brown text-white shadow-brand-brown/20'
                }`}
              >
                {popup.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: auto; margin: 0mm; }
        }
        .page-break-before-always {
          page-break-before: always;
        }
      `}</style>
    </>
  );
}
