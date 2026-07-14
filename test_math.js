const xmin = 250, xmax = 750;
const w = 100 / ((xmax - xmin) / 1000);
const l = -(xmin / (xmax - xmin)) * 100;
console.log(w, l);
