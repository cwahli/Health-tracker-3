const dbMatchObj = {
  id: "2727574",
  calories: 140,
  protein: 22,
  fat: 5.71,
  saturatedFat: 2.5,
  sodium: 42
};

const raw100 = {
  calories: Number(dbMatchObj.calories) || 0,
  protein: Number(dbMatchObj.protein) || 0,
  totalFat: Number(dbMatchObj.fat) || 0,
  saturatedFat: Number(dbMatchObj.saturatedFat) || 0,
  sodium: Number(dbMatchObj.sodium) || 0
};
console.log(raw100);
