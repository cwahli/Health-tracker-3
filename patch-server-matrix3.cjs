const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const processingCode = `
          if (Array.isArray(cleanYaml)) {
            cleanYaml = cleanYaml.map((item: any) => {
              if (!item || typeof item !== 'object') return item;
              if (item.unit) {
                const rawUnit = item.unit;
                const sanitizedUnit = sanitizeUnitText(rawUnit);
                item.unit = sanitizedUnit;
                
                if (item.biomarker) {
                  const matrixConfig = BiomarkerMatrix[item.biomarker];
                  if (matrixConfig) {
                    const val = item.numeric_value !== undefined && item.numeric_value !== null ? item.numeric_value : item.value;
                    if (typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)))) {
                      const numVal = parseFloat(String(val));
                      const newVal = matrixConfig.conversionLogic(numVal, sanitizedUnit);
                      const roundedNewVal = Math.round(newVal * 100) / 100;

                      if (item.numeric_value !== undefined && item.numeric_value !== null) item.numeric_value = roundedNewVal;
                      else if (item.value !== undefined && item.value !== null) item.value = roundedNewVal;
                      
                      item.unit = matrixConfig.targetUnit;
                    }
                  }
                }
              }
              return item;
            });
          }
`;

if (!content.includes('BiomarkerMatrix[item.biomarker]')) {
  content = content.replace(
    "if (parsed.hasMoreMarkers !== undefined) {",
    processingCode + "\n          if (parsed.hasMoreMarkers !== undefined) {"
  );
}

fs.writeFileSync('server.ts', content);
