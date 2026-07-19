function sanitizeUnitText(rawUnit) {
  if (!rawUnit) return '';
  return String(rawUnit)
    .toLowerCase()
    .replace(/[\s]+/g, ' ')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/percent/g, '%')
    .replace(/\^/g, '*')
    .replace(/^[a-z]*(?=10)/g, '')
    .replace(/[x×]/g, '')
    .replace(/units\/week/g, 'u/week')
    .replace(/ng\/ml/g, 'ug/l')
    .replace(/^\/[0-9]+$/g, 'score')
    .trim();
}
console.log(sanitizeUnitText('ng/mL'));
console.log(sanitizeUnitText('/12'));
console.log(sanitizeUnitText('score'));
