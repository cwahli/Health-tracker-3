const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const matrixCode = `
const BiomarkerMatrix: Record<string, any> = {
  "hematocrit": {
    "targetUnit": "%",
    "conversionLogic": (value: number, sanitizedUnit: string) => {
      if (sanitizedUnit === "l/l" || value < 1.0) return value * 100; 
      return value;
    }
  },
  "total_cholesterol": {
    "targetUnit": "mmol/L",
    "conversionLogic": (value: number, sanitizedUnit: string) => {
      if (sanitizedUnit === "mg/dl") return value * 0.02586; 
      return value;
    }
  },
  "egfr": {
    "targetUnit": "mL/min/1.73m2",
    "conversionLogic": (value: number, sanitizedUnit: string) => value
  },
  "qrisk2_10yr_risk": {
    "targetUnit": "%",
    "conversionLogic": (value: number, sanitizedUnit: string) => value
  },
  "red_blood_cell_distribution_width": {
    "targetUnit": "%",
    "conversionLogic": (value: number, sanitizedUnit: string) => value
  }
};

function sanitizeUnitText(rawUnit: any): string {
  if (!rawUnit) return '';
  return String(rawUnit)
    .toLowerCase()
    .replace(/[\\s]+/g, ' ')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/percent/g, '%')
    .replace(/\\^/g, '*')
    .replace(/^[a-z]*(?=10)/g, '')
    .replace(/[x×]/g, '')
    .trim();
}
`;

if (!content.includes('BiomarkerMatrix')) {
  content = content.replace(
    /import express from "express";/,
    "import express from \"express\";\n" + matrixCode
  );
}

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
    /if \\(parsed\\.hasMoreMarkers !== undefined\\) \\{/,
    processingCode + "\n          if (parsed.hasMoreMarkers !== undefined) {"
  );
}

fs.writeFileSync('server.ts', content);
