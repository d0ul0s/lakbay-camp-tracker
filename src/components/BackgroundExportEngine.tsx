import { useAppStore } from '../store';
import { useRef, useEffect, useState } from 'react';
import { replaceTags } from '../utils/documentUtils';
import JSZip from 'jszip';

// Loaded via local script tag in index.html
declare const html2pdf: any;

const getDefaultWaiver = () => {
  return `I, _________________________, the parent/legal guardian of {{name}}, a member of {{church}}, hereby give my full consent for my child to participate in the {{camp_name}} on {{camp_date}} at {{camp_location}}.

I understand that this event involves various physical activities, spiritual sessions, and communal living. By signing this document, I acknowledge the following on behalf of my child:

• Health Declaration: My child is physically fit to participate. I have disclosed any medical conditions or allergies to the organizers.
• Media Release: I grant permission for photos/videos of my child to be used in church publications and social media for documentation purposes.
• Liability: I release the organizers and the church from any liability for unforeseen accidents, illnesses, or loss of personal property during the event.
• Safety: I understand that my child must follow all camp rules and safety guidelines.`;
};

const getDefaultSolicitation = () => {
  return `Greetings of peace in Jesus Christ name!
 
   The Jesus Alliance Mission (JAM), a body of Jesus Christ, will conduct a YOUTH CAMP for Christian youth on {{camp_date}}, at {{camp_location}}. This youth camp will surely help us to have strengthen our faith in the Lord, our relationship to our brothers and sisters in Christ, and spread the Good News of Jesus Christ.
 
 In connection with this, we would like to ask for your support in our upcoming event through financial assistance to have enough funds for our needs. Any amount that you will give is highly appreciated. Rest assured that your support is an investment in the spiritual growth of the household of the next generation of believers.
 
 We firmly believe God will never forget your labor of love. We are looking forward to your favorable response on this matter. Thank you, and God bless.

 Respectfully yours,`;
};

export default function BackgroundExportEngine() {
  const { 
    activeExport, 
    updateExportProgress, 
    updateExportETC,
    clearExport, 
    appSettings, 
    currentUser, 
    registrants, 
    solicitations 
  } = useAppStore();
  
  const [currentId, setCurrentId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Sync logic for sequential generation
  useEffect(() => {
    if (!activeExport || !activeExport.isProcessing) return;

    const runExport = async () => {
      try {
        const { ids, fileName, isManual, separateFiles, manualData } = activeExport;
        
        if (typeof html2pdf === 'undefined') {
          throw new Error('PDF Engine (html2pdf) not loaded yet. Please wait a few seconds.');
        }
        
        // --- PREPARE OPT ---
        const opt = {
          margin: 0,
          filename: fileName,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { 
            scale: 1.5, 
            useCORS: true, 
            letterRendering: true, 
            logging: false, 
            scrollX: 0, 
            scrollY: 0,
            windowWidth: 1200,
            windowHeight: 1200, // Ensure headroom for capture
            onclone: (clonedDoc: Document) => {
              const sanitizeStyle = (css: string) => {
                if (!css) return css;
                // Specifically target modern color functions that html2canvas fails to parse (lab, oklch, etc.)
                return css.replace(/(lab|oklab|lch|oklch|color)\([^)]+\)/g, '#000000');
              };

              // 1. Sanitize all <style> tags (especially Tailwind v4 injected styles)
              clonedDoc.querySelectorAll('style').forEach(tag => {
                if (tag.innerHTML) {
                  tag.innerHTML = sanitizeStyle(tag.innerHTML);
                }
              });

              // 2. Sanitize all inline style attributes on ALL elements
              clonedDoc.querySelectorAll('[style]').forEach(el => {
                const style = el.getAttribute('style');
                if (style && /(lab|oklab|lch|oklch|color)\(/.test(style)) {
                  el.setAttribute('style', sanitizeStyle(style));
                }
              });

              // 3. Sanitize root and body styles (where Tailwind v4 often stores theme variables)
              const root = clonedDoc.documentElement;
              if (root.hasAttribute('style')) {
                root.setAttribute('style', sanitizeStyle(root.getAttribute('style') || ''));
              }
              const body = clonedDoc.body;
              if (body && body.hasAttribute('style')) {
                body.setAttribute('style', sanitizeStyle(body.getAttribute('style') || ''));
              }
            }
          },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
        };

        // --- LIBRARY PROBING & PRIMING ---
        const masterWorker = html2pdf().set(opt).from('<div style="width:1px;height:1px;opacity:0;"></div>').toPdf();
        const mainPdf = await masterWorker.get('pdf');
        mainPdf.deletePage(1);

        const zip = separateFiles ? new JSZip() : null;
        const itemsToProcess = isManual 
          ? (Array.isArray(manualData) ? manualData : [manualData]) 
          : ids;

        for (let i = 0; i < itemsToProcess.length; i++) {
          // --- CANCELLATION SAFETY CHECK ---
          const currentExport = useAppStore.getState().activeExport;
          if (!currentExport || !currentExport.isProcessing) {
            console.log('Export canceled. Breaking loop.');
            break;
          }

          updateExportProgress(i + 1);
          
          if (isManual) {
            // Set manual data for the renderer
            setCurrentId(`manual-${i}`); 
          } else {
            setCurrentId(itemsToProcess[i]);
          }
          
          await new Promise(resolve => setTimeout(resolve, 1800)); // Layout settling
          
          const element = printRef.current;
          if (!element) throw new Error('Staging area lost.');

          const canvas = await html2pdf().set(opt).from(element).toCanvas().get('canvas');
          const imgData = canvas.toDataURL('image/jpeg', 0.98);
          
          if (separateFiles && zip) {
            let itemData = itemsToProcess[i];
            if (!isManual) {
              const id = itemsToProcess[i];
              itemData = activeExport.template === 'waiver'
                ? registrants.find(r => (r.id || (r as any)._id) === id)
                : solicitations.find(s => (s.id || (s as any)._id) === id);
            }
            
            const rawName = (itemData as any)?.fullName || (itemData as any)?.sourceName || 'Export';
            const cleanName = rawName.replace(/[^a-zA-Z0-9]/g, '_');
            const suffix = activeExport.template === 'waiver' ? 'Parent_Consent' : 'Solicitation_Letter';
            const personFileName = `${cleanName}_${suffix}.pdf`;

            const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
            zip.file(personFileName, pdfBlob);
          } else {
            mainPdf.addPage();
            mainPdf.addImage(imgData, 'JPEG', 0, 0, 8.5, 11, undefined, 'FAST');
          }
          
          canvas.width = 0;
          canvas.height = 0;

          // --- ETC CALCULATION ---
          if (activeExport.startTime) {
            const elapsed = Date.now() - activeExport.startTime;
            const avg = elapsed / (i + 1);
            const remaining = itemsToProcess.length - (i + 1);
            if (remaining > 0) {
              const remMs = remaining * avg;
              const m = Math.floor(remMs / 60000);
              const s = Math.floor((remMs % 60000) / 1000);
              updateExportETC(`~${m > 0 ? `${m}m ` : ''}${s}s left`);
            } else {
              updateExportETC(null);
            }
          }
        }
        
        if (separateFiles && zip) {
          updateExportETC('Zipping...');
          const content = await zip.generateAsync({ type: 'blob' });
          const zipName = (fileName || 'LAKBAY_EXPORT').replace('.pdf', '') + '.zip';
          
          const link = document.createElement('a');
          link.href = URL.createObjectURL(content);
          link.download = zipName;
          link.click();
          URL.revokeObjectURL(link.href);
        } else if (!separateFiles) {
          mainPdf.save(fileName);
        }
        updateExportETC(null);
        clearExport();
      } catch (err: any) {
        console.error('Background Export Failed:', err);
        const msg = err.message || 'Unknown export error';
        useAppStore.getState().setGlobalError(`Export Failed: ${msg}`);
        updateExportETC(null);
        clearExport();
      }
    };

    runExport();
  }, [activeExport?.isProcessing, activeExport?.ids?.length]);

  // Handle ETC Calculation separately to avoid re-triggering the main effect unnecessarily 
  // actually we can just do it inside the loop in runExport.

  if (!activeExport?.isProcessing) return null;

  const branding = {
    campName: appSettings?.campName || 'LAKBAY 2026',
    churchName: appSettings?.churchName || 'UNITED PENTECOSTAL CHURCH PHILIPPINES',
    campDate: appSettings?.campDate || 'MAY 20-23, 2026',
    campLocation: appSettings?.campLocation || 'SUMMER CAMP VENUE',
    campSignatory: appSettings?.campSignatory || 'CAMP DIRECTOR',
    logoUrl: appSettings?.logoUrl || null
  };

  const getDocData = () => {
    if (!activeExport) return null;
    if (activeExport.isManual) {
      const data = activeExport.manualData;
      if (Array.isArray(data)) {
        const index = currentId?.startsWith('manual-') ? parseInt(currentId.split('-')[1]) : 0;
        return data[index];
      }
      return data;
    }
    if (activeExport.template === 'waiver') {
      return registrants.find(r => (r.id || (r as any)._id) === currentId);
    }
    return solicitations.find(s => (s.id || (s as any)._id) === currentId);
  };

  const currentItem = getDocData() as any;
  const template = activeExport.template;
  const content = template === 'waiver'
    ? (appSettings?.waiverTemplate || getDefaultWaiver())
    : (appSettings?.solicitationTemplate || getDefaultSolicitation());

  const tagData = {
    name: currentItem?.fullName || currentItem?.sourceName || '________________',
    church: currentItem?.church || (currentUser?.role === 'coordinator' ? currentUser.church : '________________'),
    amount: currentItem?.amount?.toLocaleString() || '_______',
    camp_name: branding.campName,
    camp_date: branding.campDate,
    date: branding.campDate,
    camp_location: branding.campLocation,
    location: branding.campLocation,
    signatory: currentItem?.manualSignatory || branding.campSignatory
  };

  return (
    <div className="absolute top-[-10000px] left-[-10000px] pointer-events-none">
      <div 
        ref={printRef}
        className="bg-white font-serif w-[816px] text-black"
      >
        <div key={currentId} className="bg-white mx-auto flex flex-col w-[816px] min-h-[1055px] p-16">
          <div style={{ borderColor: '#8B4513' }} className="border-b-2 pb-8 mb-10 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" crossOrigin="anonymous" className="h-16 w-auto max-w-[120px] object-contain" />
              ) : (
                <div style={{ backgroundColor: '#8B4513' }} className="w-14 h-14 flex items-center justify-center font-display text-white text-3xl">J</div>
              )}
              <div>
                <h1 style={{ color: '#8B4513' }} className="font-display tracking-tighter text-4xl mb-1">JESUS ALLIANCE MISSION</h1>
                <p style={{ color: '#9CA3AF' }} className="font-sans font-black uppercase tracking-[0.25em] text-[11px]">LIPIT-TOMEENG, SAN FABIAN, PANGASINAN</p>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            {template === 'waiver' && (
              <>
                <div style={{ borderColor: 'rgba(210, 180, 140, 0.1)' }} className="flex justify-between items-end mb-6 font-serif text-[13px] border-b pb-4 min-h-[60px]">
                  <div className="space-y-1">
                    <p style={{ color: '#8B4513' }} className="font-black uppercase tracking-widest text-[9px]">PARTICIPANT:</p>
                    <p className="text-xl font-bold uppercase text-gray-800">{currentItem?.fullName || '________________'}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p style={{ color: '#8B4513' }} className="font-black uppercase tracking-widest text-[9px]">DATE ISSUED:</p>
                    <p className="text-lg font-bold uppercase text-gray-800">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
                <h2 style={{ color: '#8B4513', borderColor: 'rgba(210, 180, 140, 0.2)' }} className="font-display text-center uppercase tracking-[0.3em] border-b text-3xl mb-6 pb-6">Official Parent Consent</h2>
              </>
            )}

            {template === 'solicitation' && (
              <div style={{ borderColor: 'rgba(210, 180, 140, 0.1)' }} className="flex justify-between items-end mb-8 font-serif text-[13px] border-b pb-4 min-h-[60px]">
                <div className="space-y-1">
                  {(currentItem?.fullName || currentItem?.sourceName) && (
                    <>
                      <p style={{ color: '#8B4513' }} className="font-black uppercase tracking-widest text-[9px]">RECIPIENT:</p>
                      <p className="text-xl font-bold uppercase text-gray-800">{replaceTags('{{name}}', tagData)}</p>
                    </>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <p style={{ color: '#8B4513' }} className="font-black uppercase tracking-widest text-[9px]">DATE ISSUED:</p>
                  <p className="text-lg font-bold uppercase text-gray-800">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
            )}

            <div style={{ color: '#4B5563' }} className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
              {replaceTags(content, tagData)}
            </div>

            {template === 'solicitation' && (
              <div className="flex flex-col items-start mt-12 px-4">
                <div className="w-full max-w-[320px]">
                  {(currentItem?.eSignatureUrl || currentUser?.eSignatureUrl) && (
                    <div className="h-14 flex items-center justify-start ml-6 mb-[-1rem] relative z-20 overflow-visible">
                      <img src={currentItem?.eSignatureUrl || currentUser?.eSignatureUrl} alt="Signature" crossOrigin="anonymous" className="h-full w-auto object-contain mix-blend-multiply opacity-95 filter contrast-125" />
                    </div>
                  )}
                  <div style={{ borderColor: '#8B4513', color: '#8B4513' }} className="border-b-2 pb-1 text-xl font-display relative z-10 text-left">
                    {currentItem?.manualSignatory || branding.campSignatory}
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <p style={{ color: '#9CA3AF' }} className="text-[10px] font-black uppercase tracking-[0.2em]">Youth Leader Representative</p>
                    <p style={{ color: '#9CA3AF' }} className="text-[10px] font-black uppercase tracking-[0.2em]">{branding.churchName}</p>
                  </div>
                </div>
              </div>
            )}

            {template === 'waiver' && (
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
      </div>
    </div>
  );
}
