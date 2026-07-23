const fs = require('fs');
const path = require('path');

const TRANSLATIONS_PATH = path.join(__dirname, 'src/utils/translations.ts');

function addTranslation(key, enVal, idVal) {
    let content = fs.readFileSync(TRANSLATIONS_PATH, 'utf8');
    
    // Check if key exists
    if (content.includes(`    ${key}: '`)) {
        return;
    }
    
    const enMatch = content.match(/en:\s*\{/);
    if (!enMatch) return;
    
    const zhMatch = content.match(/zh:\s*\{/);
    const idMatch = content.match(/id:\s*\{/);
    
    content = content.replace(/(en:\s*\{)/, `$1\n    ${key}: '${enVal}',`);
    content = content.replace(/(zh:\s*\{)/, `$1\n    ${key}: '${enVal}',`);
    content = content.replace(/(id:\s*\{)/, `$1\n    ${key}: '${idVal}',`);
    
    // Add to fr (if it exists)
    if (content.includes('fr: {')) {
        content = content.replace(/(fr:\s*\{)/, `$1\n    ${key}: '${enVal}',`);
    }

    fs.writeFileSync(TRANSLATIONS_PATH, content);
}

// Ensure AgentCardProps has language: string
let typesContent = fs.readFileSync('src/components/chat-cards/types.ts', 'utf8');
if (!typesContent.includes('language: string;')) {
    typesContent = typesContent.replace('export interface AgentCardProps {', 'export interface AgentCardProps {\n  language: string;');
    fs.writeFileSync('src/components/chat-cards/types.ts', typesContent);
}

// 1. BiomarkerCard.tsx
let bioCard = fs.readFileSync('src/components/chat-cards/BiomarkerCard.tsx', 'utf8');
if (!bioCard.includes('import { translations }')) {
    bioCard = "import { translations } from '../../utils/translations';\n" + bioCard;
}
if (!bioCard.includes('const t = translations[')) {
    bioCard = bioCard.replace('}) => {', 'language\n}) => {\n  const t = translations[language] || translations.en;');
}
// Replacements
bioCard = bioCard.replace(/'View Agent Instruction'/g, 't.viewAgentInstruction');
bioCard = bioCard.replace(/>View Agent Instruction</g, '>{t.viewAgentInstruction}<');
addTranslation('viewAgentInstruction', 'View Agent Instruction', 'Lihat Instruksi Agen');

bioCard = bioCard.replace(/'Apply & Save Agent Findings'/g, 't.applyAgentFindings');
bioCard = bioCard.replace(/>Apply & Save Agent Findings</g, '>{t.applyAgentFindings}<');
addTranslation('applyAgentFindings', 'Apply & Save Agent Findings', 'Terapkan & Simpan Temuan Agen');

bioCard = bioCard.replace(/'Proposed Modifications' : 'Extracted Information'/g, 't.proposedModifications : t.extractedInformation');
addTranslation('proposedModifications', 'Proposed Modifications', 'Modifikasi yang Diusulkan');
addTranslation('extractedInformation', 'Extracted Information', 'Informasi yang Diekstraksi');

bioCard = bioCard.replace(/'Remove' : 'Update'/g, "t.removeAction : t.updateAction");
addTranslation('removeAction', 'Remove', 'Hapus');
addTranslation('updateAction', 'Update', 'Perbarui');

bioCard = bioCard.replace(/'DELETED'/g, "t.deletedStatus");
addTranslation('deletedStatus', 'DELETED', 'DIHAPUS');

bioCard = bioCard.replace(/>Profile Updates</g, '>{t.profileUpdates}<');
addTranslation('profileUpdates', 'Profile Updates', 'Pembaruan Profil');

bioCard = bioCard.replace(/>Extraction Plan</g, '>{t.extractionPlan}<');
addTranslation('extractionPlan', 'Extraction Plan', 'Rencana Ekstraksi');

bioCard = bioCard.replace(/>Estimated Metrics:</g, '>{t.estimatedMetrics}<');
addTranslation('estimatedMetrics', 'Estimated Metrics:', 'Metrik yang Diperkirakan:');

bioCard = bioCard.replace(/>Batches Required:</g, '>{t.batchesRequired}<');
addTranslation('batchesRequired', 'Batches Required:', 'Batch yang Diperlukan:');

bioCard = bioCard.replace(/>Max Per Batch:</g, '>{t.maxPerBatch}<');
addTranslation('maxPerBatch', 'Max Per Batch:', 'Maks Per Batch:');

bioCard = bioCard.replace(/'Proceed with extraction.'/g, 't.proceedWithExtraction');
addTranslation('proceedWithExtraction', 'Proceed with extraction.', 'Lanjutkan dengan ekstraksi.');

bioCard = bioCard.replace(/'Cancel extraction.'/g, 't.cancelExtraction');
addTranslation('cancelExtraction', 'Cancel extraction.', 'Batalkan ekstraksi.');

bioCard = bioCard.replace(/>Record Date</g, '>{t.recordDate}<');
addTranslation('recordDate', 'Record Date', 'Tanggal Rekaman');

bioCard = bioCard.replace(/'Unknown Date'/g, 't.unknownDate');
addTranslation('unknownDate', 'Unknown Date', 'Tanggal Tidak Diketahui');

bioCard = bioCard.replace(/'Apply modifications' : /g, 't.applyModifications : ');
addTranslation('applyModifications', 'Apply modifications', 'Terapkan modifikasi');

bioCard = bioCard.replace(/'Save and continue to next batch' : 'Save extracted data'/g, 't.saveAndContinueBatch : t.saveExtractedData');
addTranslation('saveAndContinueBatch', 'Save and continue to next batch', 'Simpan dan lanjutkan ke batch berikutnya');
addTranslation('saveExtractedData', 'Save extracted data', 'Simpan data yang diekstraksi');

bioCard = bioCard.replace(/>Cancel</g, '>{t.cancel}<');

// Wait, I replaced strings inside expressions. Let's write back.
fs.writeFileSync('src/components/chat-cards/BiomarkerCard.tsx', bioCard);

// LogChat.tsx updates for BiomarkerCard call site
let logChat = fs.readFileSync('src/components/LogChat.tsx', 'utf8');
logChat = logChat.replace(/<BiomarkerCard\s+/g, '<BiomarkerCard language={profile?.language || "en"} ');
fs.writeFileSync('src/components/LogChat.tsx', logChat);

console.log("BiomarkerCard processed");
