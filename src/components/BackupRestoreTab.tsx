import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { FoodLog, BiomarkerLog, UserProfile } from '../types';
import { Archive, Download, Upload, AlertCircle, Check, Image as ImageIcon, FileSpreadsheet, RefreshCw } from 'lucide-react';

interface Props {
  profile: UserProfile;
  foodLogs: FoodLog[];
  biomarkerHistory: BiomarkerLog[];
  setFoodLogs: (f: FoodLog[]) => void;
  setBiomarkerHistory: (b: BiomarkerLog[]) => void;
  biomarkers?: any;
  actions?: any[];
  dailyBenefits?: any[];
  report?: any;
  onSaveAndSync?: (profile: any, foodLogs: any[], biomarkers: any, biomarkerHistory: any[], actions: any[], dailyBenefits: any[], report: any, specificUpdate?: any) => Promise<void>;
}

export default function BackupRestoreTab({ profile, foodLogs, biomarkerHistory, setFoodLogs, setBiomarkerHistory, biomarkers, actions, dailyBenefits, report, onSaveAndSync }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const [conflicts, setConflicts] = useState<{ foods: any[], bio: any[] }>({ foods: [], bio: [] });
  const [showConflicts, setShowConflicts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stagedFoods, setStagedFoods] = useState<(FoodLog & { similarTo?: any })[]>([]);
  const [stagedBio, setStagedBio] = useState<BiomarkerLog[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<Set<string>>(new Set());
  const [selectedBio, setSelectedBio] = useState<Set<string>>(new Set());
  const [resolutions, setResolutions] = useState<Record<string, {
    resolution: 'keep_existing' | 'keep_backup' | 'keep_both';
    editData: FoodLog;
  }>>({});

  const updateResolutionEdit = (stagedId: string, fields: Partial<FoodLog>) => {
    setResolutions(prev => {
      const current = prev[stagedId] || { resolution: 'keep_both', editData: stagedFoods.find(sf => sf.id === stagedId)! };
      return {
        ...prev,
        [stagedId]: {
          ...current,
          editData: {
            ...current.editData,
            ...fields
          }
        }
      };
    });
  };

  const handleSetResolution = (stagedId: string, resolution: 'keep_existing' | 'keep_backup' | 'keep_both', stagedItem?: any) => {
    const f = stagedItem || stagedFoods.find(sf => sf.id === stagedId);
    if (!f) return;
    
    let baseData = { ...f };
    if (resolution === 'keep_existing') {
      baseData = { ...f.similarTo };
    }
    
    setResolutions(prev => ({
      ...prev,
      [stagedId]: {
        resolution,
        editData: baseData
      }
    }));
  };

  // Function to serialize state into CSVs and images into a zip
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();

      // Separate images from food logs for CSV
      const foodCsvData = foodLogs.map(log => {
        const row = { ...log } as any;
        delete row.imageUrl;
        delete row.imageUrls;
        
        // ensure objects are stringified for CSV
        if (row.nutrients) row.nutrients = JSON.stringify(row.nutrients);
        if (row.itemsBreakdown) row.itemsBreakdown = JSON.stringify(row.itemsBreakdown);
        if (row.scoutItems) row.scoutItems = JSON.stringify(row.scoutItems);
        return row;
      });

      const bioCsvData = biomarkerHistory.map(log => {
        const row = { ...log } as any;
        if (row.biomarkers) row.biomarkers = JSON.stringify(row.biomarkers);
        if (row.tests) row.tests = JSON.stringify(row.tests);
        return row;
      });

      // Add CSVs
      zip.file("foodLogs.csv", Papa.unparse(foodCsvData));
      zip.file("biomarkerHistory.csv", Papa.unparse(bioCsvData));

      // Add images
      const imgFolder = zip.folder("images");
      if (imgFolder) {
        foodLogs.forEach(log => {
          if (log.imageUrl) {
            const base64Data = log.imageUrl.split(',')[1];
            if (base64Data) {
               // Extract format
               const match = log.imageUrl.match(/data:image\/([a-zA-Z0-9]+);base64,/);
               const ext = match ? match[1] : 'jpg';
               imgFolder.file(`${log.id}_main.${ext}`, base64Data, { base64: true });
            }
          }
          if (log.imageUrls && log.imageUrls.length > 0) {
            log.imageUrls.forEach((url, i) => {
               const base64Data = url.split(',')[1];
               if (base64Data) {
                  const match = url.match(/data:image\/([a-zA-Z0-9]+);base64,/);
                  const ext = match ? match[1] : 'jpg';
                  imgFolder.file(`${log.id}_extra_${i}.${ext}`, base64Data, { base64: true });
               }
            });
          }
        });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const filename = `${profile.nickname || 'User'}_backup_${new Date().toISOString().slice(0,10)}.zip`;
      saveAs(content, filename);
    } catch (e) {
      console.error(e);
      alert("Failed to create backup.");
    }
    setIsExporting(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Reading ZIP...');
    try {
      const zip = new JSZip();
      await zip.loadAsync(file);

      // Parse food logs
      setImportStatus('Parsing Food Logs...');
      let importedFoods: any[] = [];
      const foodFile = zip.file("foodLogs.csv");
      if (foodFile) {
        const foodCsv = await foodFile.async('string');
        const parsed = Papa.parse(foodCsv, { header: true });
        importedFoods = parsed.data.filter((r: any) => r.id).map((row: any) => {
          if (typeof row.nutrients === 'string') {
            try { row.nutrients = JSON.parse(row.nutrients); } catch(e){}
          }
          if (typeof row.itemsBreakdown === 'string') {
            try { row.itemsBreakdown = JSON.parse(row.itemsBreakdown); } catch(e){}
          }
          if (typeof row.scoutItems === 'string') {
            try { row.scoutItems = JSON.parse(row.scoutItems); } catch(e){}
          }
          return row;
        });
      }

      // Parse biomarkers
      setImportStatus('Parsing Biomarkers...');
      let importedBio: any[] = [];
      const bioFile = zip.file("biomarkerHistory.csv");
      if (bioFile) {
        const bioCsv = await bioFile.async('string');
        const parsed = Papa.parse(bioCsv, { header: true });
        importedBio = parsed.data.filter((r: any) => r.id).map((row: any) => {
          if (typeof row.biomarkers === 'string') {
             try { row.biomarkers = JSON.parse(row.biomarkers); } catch(e){}
          }
          if (typeof row.tests === 'string') {
             try { row.tests = JSON.parse(row.tests); } catch(e){}
          }
          return row;
        });
      }

      // Read images
      setImportStatus('Restoring Images...');
      const imgFolder = zip.folder("images");
      if (imgFolder) {
        for (const log of importedFoods) {
          const mainImgRegex = new RegExp(`${log.id}_main\\.[a-zA-Z0-9]+$`);
          const mainImgFiles = zip.file(mainImgRegex);
          if (mainImgFiles.length > 0) {
             const base64 = await mainImgFiles[0].async('base64');
             const ext = mainImgFiles[0].name.split('.').pop();
             log.imageUrl = `data:image/${ext};base64,${base64}`;
          }

          const extraImgRegex = new RegExp(`${log.id}_extra_\\d+\\.[a-zA-Z0-9]+$`);
          const extraImgFiles = zip.file(extraImgRegex);
          if (extraImgFiles.length > 0) {
             log.imageUrls = [];
             for (const f of extraImgFiles) {
                const base64 = await f.async('base64');
                const ext = f.name.split('.').pop();
                log.imageUrls.push(`data:image/${ext};base64,${base64}`);
             }
          }
        }
      }

      setImportStatus('Checking for conflicts...');
      
      const newFoods: FoodLog[] = [];
      const newBio: BiomarkerLog[] = [];
      
      const existingFoodMap = new Map(foodLogs.map(f => [f.id, f]));
      const existingBioMap = new Map(biomarkerHistory.map(b => [b.id, b]));
      
      const existingPhotoMap = new Map();
      foodLogs.forEach(f => {
        if (f.imageUrl && f.imageUrl.length > 100) {
          existingPhotoMap.set(f.imageUrl, f);
        }
      });

      const zipPhotoMap = new Map();
      const nextResolutions: Record<string, {
        resolution: 'keep_existing' | 'keep_backup' | 'keep_both';
        editData: FoodLog;
      }> = {};

      importedFoods.forEach(f => {
         const existing = existingFoodMap.get(f.id);
         let existingByPhoto = f.imageUrl ? existingPhotoMap.get(f.imageUrl) : null;
         let similarSource: 'existing' | 'backup' = 'existing';
         
         if (!existingByPhoto && f.imageUrl && f.imageUrl.length > 100) {
           if (zipPhotoMap.has(f.imageUrl)) {
             existingByPhoto = zipPhotoMap.get(f.imageUrl);
             similarSource = 'backup';
           }
         }
         
         if (!existing) {
             if (existingByPhoto) {
                 (f as any).sync_state = 'similar_photo';
                 (f as any).similarTo = existingByPhoto;
                 (f as any).similarSource = similarSource;
                 nextResolutions[f.id] = {
                   resolution: 'keep_both',
                   editData: { ...f }
                 };
             } else {
                 f.sync_state = 'new';
             }
             f.updated_at = Date.now();
             newFoods.push(f);
         } else {
             // Basic conflict detection (could be more complex, but let's just check updated_at or if data differs)
             if ((f.updated_at || 0) > (existing.updated_at || 0)) {
                 f.sync_state = 'update';
                 f.updated_at = Date.now();
                 newFoods.push(f);
             }
         }

         if (f.imageUrl && f.imageUrl.length > 100) {
           zipPhotoMap.set(f.imageUrl, f);
         }
      });
      setResolutions(nextResolutions);

      importedBio.forEach(b => {
         const existing = existingBioMap.get(b.id);
         if (!existing) {
             b.sync_state = 'new';
             b.updated_at = Date.now();
             newBio.push(b);
         } else {
             if ((b.updated_at || 0) > (existing.updated_at || 0)) {
                 b.sync_state = 'update';
                 b.updated_at = Date.now();
                 newBio.push(b);
             }
         }
      });

      if (newFoods.length === 0 && newBio.length === 0) {
         setImportStatus('No new or changed records found in backup.');
         setTimeout(() => setImportStatus(''), 3000);
      } else {
         setStagedFoods(newFoods);
         setStagedBio(newBio);
         setSelectedFoods(new Set(newFoods.map(f => f.id)));
         setSelectedBio(new Set(newBio.map(b => b.id)));
         setShowConflicts(true);
         setImportStatus('');
      }

    } catch (e) {
      console.error(e);
      alert("Failed to read backup.");
      setImportStatus('');
    }
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyImport = () => {
     const mergedFoods = [...foodLogs];
     const existingMap = new Map(mergedFoods.map(f => [f.id, f]));
     
     stagedFoods.forEach(f => {
       if ((f.sync_state as string) === 'similar_photo') {
         const resInfo = resolutions[f.id];
         if (resInfo) {
           const { resolution, editData } = resInfo;
           if (resolution === 'keep_existing') {
             // If they edited the existing item, update it in the map
             const simId = f.similarTo?.id;
             if (simId) {
               existingMap.set(simId, editData);
             }
           } else if (resolution === 'keep_backup') {
             // Overwrite existing with backup
             const simId = f.similarTo?.id;
             if (simId) {
               existingMap.delete(simId);
             }
             existingMap.set(editData.id, editData);
           } else if (resolution === 'keep_both') {
             // Keep both!
             existingMap.set(editData.id, editData);
           }
         } else {
           if (selectedFoods.has(f.id)) {
             existingMap.set(f.id, f);
           }
         }
       } else {
         if (selectedFoods.has(f.id)) {
           existingMap.set(f.id, f);
         }
       }
     });
     
     const finalFoods = Array.from(existingMap.values());

     const bioToImport = stagedBio.filter(b => selectedBio.has(b.id));
     let finalBio = biomarkerHistory;
     if (bioToImport.length > 0) {
         const mergedBio = [...biomarkerHistory];
         const map = new Map(mergedBio.map(b => [b.id, b]));
         bioToImport.forEach(b => map.set(b.id, b));
         finalBio = Array.from(map.values());
     }

     if (onSaveAndSync) {
       setImportStatus('Saving and syncing to cloud...');
       onSaveAndSync(profile, finalFoods, biomarkers, finalBio, actions || [], dailyBenefits || [], report, { type: 'fullPush' })
         .then(() => {
           setImportStatus('Import successful and synced to cloud!');
           setTimeout(() => setImportStatus(''), 4000);
         })
         .catch((e) => {
           console.error(e);
           setImportStatus('Import saved locally, but cloud sync failed. Please retry from the sync menu.');
           setTimeout(() => setImportStatus(''), 6000);
         });
     } else {
       // Fallback: no sync pipeline available, only update local React state.
       // This will NOT survive a refresh — surfaced to the user explicitly rather than
       // silently claiming success.
       setFoodLogs(finalFoods);
       setBiomarkerHistory(finalBio);
       setImportStatus('Import applied locally only — could not reach the cloud save pipeline. Refresh may lose this data.');
       setTimeout(() => setImportStatus(''), 6000);
     }

     setShowConflicts(false);
     setStagedFoods([]);
     setStagedBio([]);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
          <Archive className="w-5 h-5 text-indigo-400" />
          Local Backup & Restore
        </h3>
        <p className="text-sm text-slate-400 mb-6">
          Create a full snapshot of your food logs and biomarker history (including images). This file can be kept offline and used to restore data if needed.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isExporting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isExporting ? 'Creating Snapshot...' : 'Create Snapshot Zip'}
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isImporting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {isImporting ? 'Reading...' : 'Restore from Zip'}
          </button>
          <input 
            type="file" 
            accept=".zip" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
          />
        </div>
        
        {importStatus && (
          <div className="mt-4 text-sm text-indigo-400 flex items-center justify-center gap-2">
             <Check className="w-4 h-4" /> {importStatus}
          </div>
        )}
      </div>

      {showConflicts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <h2 className="text-lg font-bold text-white">Review Data to Restore</h2>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
               <p className="text-sm text-slate-300">
                 Found <b>{stagedFoods.length}</b> new or updated food logs, and <b>{stagedBio.length}</b> new or updated biomarker records in the backup.
               </p>
               
               {stagedFoods.length > 0 && (
                 <div className="bg-slate-800 rounded-lg p-3">
                   <h4 className="text-sm font-semibold text-slate-200 mb-2 border-b border-slate-700 pb-2">Food Logs ({stagedFoods.length})</h4>
                   <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                     {stagedFoods.map(f => {
                        const isSimilarPhoto = (f.sync_state as string) === 'similar_photo';
                        const res = resolutions[f.id] || { resolution: 'keep_both', editData: f };
                        const sim = f.similarTo;
                        const simSource = (f as any).similarSource || 'existing';
                        
                        return (
                          <div key={f.id} className="text-xs text-slate-300 flex flex-col gap-3 bg-slate-850/50 p-3 rounded-xl border border-slate-700/60 hover:border-slate-600 transition-all">
                            {!isSimilarPhoto ? (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={selectedFoods.has(f.id)} onChange={(e) => {
                                    const next = new Set(selectedFoods);
                                    if (e.target.checked) next.add(f.id); else next.delete(f.id);
                                    setSelectedFoods(next);
                                }} className="rounded bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-500" />
                                {f.imageUrl ? <img src={f.imageUrl} className="w-8 h-8 rounded object-cover" /> : <div className="w-8 h-8 rounded bg-slate-600 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-slate-400" /></div>}
                                <span className="truncate flex-1 font-medium">{f.name}</span>
                                <span className="text-slate-500 w-24 text-right">{f.date?.slice(0,10)}</span>
                                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                                  {f.sync_state === 'new' ? 'New' : 'Differs'}
                                </span>
                              </label>
                            ) : (
                              <div className="space-y-3">
                                {/* Similar photo header */}
                                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                                    <AlertCircle className="w-4 h-4 animate-pulse" />
                                    <span>Identical Photo Found in {simSource === 'existing' ? 'Database' : 'ZIP'}</span>
                                  </div>
                                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                                    Similar Photo
                                  </span>
                                </div>

                                {/* Common Image preview */}
                                {f.imageUrl && (
                                  <div className="flex justify-center">
                                    <img src={f.imageUrl} className="w-48 h-32 rounded-lg object-cover border border-slate-700 shadow-md" />
                                  </div>
                                )}

                                {/* Comparison columns */}
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  {/* Left: Existing or Zip Duplicate 1 */}
                                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 space-y-1.5">
                                    <div className="font-bold text-slate-400 uppercase tracking-wider text-[9px] border-b border-slate-800 pb-1">
                                      {simSource === 'existing' ? 'Current Database Log' : 'First Backup Log'}
                                    </div>
                                    <div className="font-semibold text-slate-200 truncate">{sim?.name || 'Unnamed Food'}</div>
                                    <div className="text-slate-400 text-[10px]">{sim?.date?.slice(0, 10) || 'No Date'}</div>
                                    <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
                                      <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                        🔥 {sim?.nutrients?.calories ?? 0} kcal
                                      </span>
                                      <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                        🧈 Fat: {sim?.nutrients?.saturatedFat ?? 0}g
                                      </span>
                                      <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                        🧂 Sod: {sim?.nutrients?.sodium ?? 0}mg
                                      </span>
                                    </div>
                                    {sim?.composition && (
                                      <div className="text-[10px] text-slate-500 italic pt-1 line-clamp-2">
                                        "{sim.composition}"
                                      </div>
                                    )}
                                  </div>

                                  {/* Right: Restoring Backup or Zip Duplicate 2 */}
                                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 space-y-1.5">
                                    <div className="font-bold text-indigo-400 uppercase tracking-wider text-[9px] border-b border-slate-800 pb-1">
                                      Restoring Backup Log
                                    </div>
                                    <div className="font-semibold text-slate-200 truncate">{f.name || 'Unnamed Food'}</div>
                                    <div className="text-slate-400 text-[10px]">{f.date?.slice(0, 10) || 'No Date'}</div>
                                    <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
                                      <span className="bg-indigo-950/40 text-indigo-300 px-1.5 py-0.5 rounded">
                                        🔥 {f.nutrients?.calories ?? 0} kcal
                                      </span>
                                      <span className="bg-indigo-950/40 text-indigo-300 px-1.5 py-0.5 rounded">
                                        🧈 Fat: {f.nutrients?.saturatedFat ?? 0}g
                                      </span>
                                      <span className="bg-indigo-950/40 text-indigo-300 px-1.5 py-0.5 rounded">
                                        🧂 Sod: {f.nutrients?.sodium ?? 0}mg
                                      </span>
                                    </div>
                                    {f.composition && (
                                      <div className="text-[10px] text-slate-500 italic pt-1 line-clamp-2">
                                        "{f.composition}"
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Choice selection buttons */}
                                <div className="space-y-1.5">
                                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Choose which log to keep:</div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSetResolution(f.id, 'keep_existing', f)}
                                      className={`py-2 px-2 rounded-lg text-center font-medium border text-[10px] transition-all flex flex-col items-center justify-center gap-1 leading-tight ${
                                        res.resolution === 'keep_existing'
                                          ? 'bg-slate-800 border-slate-500 text-white shadow-md'
                                          : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-300 hover:bg-slate-800/20'
                                      }`}
                                    >
                                      <span>Keep Left Log Only</span>
                                      <span className="text-[9px] text-slate-500 font-normal">Discard backup entry</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleSetResolution(f.id, 'keep_backup', f)}
                                      className={`py-2 px-2 rounded-lg text-center font-medium border text-[10px] transition-all flex flex-col items-center justify-center gap-1 leading-tight ${
                                        res.resolution === 'keep_backup'
                                          ? 'bg-indigo-900/60 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950/40'
                                          : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-300 hover:bg-slate-800/20'
                                      }`}
                                    >
                                      <span>Keep Right Log Only</span>
                                      <span className="text-[9px] text-slate-500 font-normal">Replace {simSource === 'existing' ? 'existing' : 'first'} record</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleSetResolution(f.id, 'keep_both', f)}
                                      className={`py-2 px-2 rounded-lg text-center font-medium border text-[10px] transition-all flex flex-col items-center justify-center gap-1 leading-tight ${
                                        res.resolution === 'keep_both'
                                          ? 'bg-amber-900/40 border-amber-600 text-amber-200 shadow-md'
                                          : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-300 hover:bg-slate-800/20'
                                      }`}
                                    >
                                      <span>Keep Both (Add New)</span>
                                      <span className="text-[9px] text-slate-500 font-normal">Save as separate entry</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Inline editor for Kept record details */}
                                <div className="p-3 bg-slate-900/65 rounded-xl border border-slate-800/85 space-y-3">
                                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center justify-between">
                                    <span>✏️ Edit Chosen Record details to merge info</span>
                                    <span className="text-slate-500 font-normal normal-case text-[9px]">
                                      Editing: {res.resolution === 'keep_existing' ? 'Left Log' : 'Right/New Log'}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="col-span-2">
                                      <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Food Name</label>
                                      <input 
                                        type="text" 
                                        value={res.editData.name || ''} 
                                        onChange={(e) => updateResolutionEdit(f.id, { name: e.target.value })}
                                        className="w-full px-2.5 py-1 bg-slate-950 border border-slate-850 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Logged Date</label>
                                      <input 
                                        type="text" 
                                        value={res.editData.date || ''} 
                                        onChange={(e) => updateResolutionEdit(f.id, { date: e.target.value })}
                                        className="w-full px-2.5 py-1 bg-slate-950 border border-slate-850 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Calories (kcal)</label>
                                      <input 
                                        type="number" 
                                        step="any"
                                        value={res.editData.nutrients?.calories ?? ''} 
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          updateResolutionEdit(f.id, { 
                                            nutrients: { ...(res.editData.nutrients || {}), calories: val } as any
                                          });
                                        }}
                                        className="w-full px-2.5 py-1 bg-slate-950 border border-slate-850 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Saturated Fat (g)</label>
                                      <input 
                                        type="number" 
                                        step="any"
                                        value={res.editData.nutrients?.saturatedFat ?? ''} 
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          updateResolutionEdit(f.id, { 
                                            nutrients: { ...(res.editData.nutrients || {}), saturatedFat: val } as any
                                          });
                                        }}
                                        className="w-full px-2.5 py-1 bg-slate-950 border border-slate-850 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Sodium (mg)</label>
                                      <input 
                                        type="number" 
                                        step="any"
                                        value={res.editData.nutrients?.sodium ?? ''} 
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          updateResolutionEdit(f.id, { 
                                            nutrients: { ...(res.editData.nutrients || {}), sodium: val } as any
                                          });
                                        }}
                                        className="w-full px-2.5 py-1 bg-slate-950 border border-slate-850 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Composition / Notes</label>
                                      <textarea 
                                        value={res.editData.composition || ''} 
                                        onChange={(e) => updateResolutionEdit(f.id, { composition: e.target.value })}
                                        className="w-full px-2.5 py-1 bg-slate-950 border border-slate-850 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 h-12 resize-none"
                                        placeholder="Add descriptive info here..."
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                     })}
                   </div>
                 </div>
               )}

               {stagedBio.length > 0 && (
                 <div className="bg-slate-800 rounded-lg p-3">
                   <h4 className="text-sm font-semibold text-slate-200 mb-2 border-b border-slate-700 pb-2">Biomarkers ({stagedBio.length})</h4>
                   <div className="max-h-40 overflow-y-auto space-y-2">
                     {stagedBio.map(b => (
                       <label key={b.id} className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded">
                         <input type="checkbox" checked={selectedBio.has(b.id)} onChange={(e) => {
                             const next = new Set(selectedBio);
                             if (e.target.checked) next.add(b.id); else next.delete(b.id);
                             setSelectedBio(next);
                         }} className="rounded bg-slate-900 border-slate-600 text-indigo-500 focus:ring-indigo-500" />
                         <span className="truncate flex-1 font-medium">Record from {b.date?.slice(0,10)}</span>
                         <span className="text-slate-500 w-24 text-right">{Object.keys(b.biomarkers || {}).length} items</span>
                         <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                           {b.sync_state === 'new' ? 'New' : 'Differs'}
                         </span>
                       </label>
                     ))}
                   </div>
                 </div>
               )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-800/50 flex justify-end gap-3">
              <button
                onClick={() => { setShowConflicts(false); setStagedFoods([]); setStagedBio([]); }}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyImport}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg"
              >
                Import & Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
