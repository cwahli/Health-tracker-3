const fs = require('fs');
const path = require('path');

const TRANSLATIONS_PATH = path.join(__dirname, 'src/utils/translations.ts');
let translationsCode = fs.readFileSync(TRANSLATIONS_PATH, 'utf8');

function addTranslation(key, enVal, idVal) {
    if (translationsCode.includes(`    ${key}: '`) || translationsCode.includes(`    ${key}: "`)) {
        return;
    }
    translationsCode = translationsCode.replace(/(en:\s*\{)/, `$1\n    ${key}: "${enVal}",`);
    translationsCode = translationsCode.replace(/(zh:\s*\{)/, `$1\n    ${key}: "${enVal}",`);
    translationsCode = translationsCode.replace(/(id:\s*\{)/, `$1\n    ${key}: "${idVal}",`);
    if (translationsCode.includes('fr: {')) {
        translationsCode = translationsCode.replace(/(fr:\s*\{)/, `$1\n    ${key}: "${enVal}",`);
    }
}

// Add language to types.ts
let typesContent = fs.readFileSync('src/components/chat-cards/types.ts', 'utf8');
if (!typesContent.includes('language?: string;')) {
    typesContent = typesContent.replace('export interface AgentCardProps {', 'export interface AgentCardProps {\n  language?: string;');
    fs.writeFileSync('src/components/chat-cards/types.ts', typesContent);
}

const replaceString = (file, oldStr, key, enVal, idVal, isJSX = false) => {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('import { translations }')) {
        const depth = file.split('/').length - 2;
        const relPath = depth === 2 ? '../../utils/translations' : '../utils/translations';
        content = `import { translations } from '${relPath}';\n` + content;
    }
    
    // Auto-inject t if missing. Heuristic based.
    if (!content.includes('const t = translations')) {
        // If it's a functional component with props...
        if (content.includes('language\n})')) {
            content = content.replace('language\n}) => {', 'language\n}) => {\n  const t = translations[language || "en"] || translations.en;');
        } else if (content.match(/=>\s*\{\n/)) {
            // Find the first component and inject it. It might be tricky.
        }
    }
    
    if (content.includes(oldStr)) {
        addTranslation(key, enVal, idVal);
        if (isJSX) {
            content = content.split(oldStr).join(`{t.${key}}`);
        } else {
            content = content.split(oldStr).join(`t.${key}`);
        }
        fs.writeFileSync(file, content);
    }
};

fs.writeFileSync(TRANSLATIONS_PATH, translationsCode);
console.log("Setup complete");
