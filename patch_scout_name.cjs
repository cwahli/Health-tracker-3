const fs = require('fs');
let code = fs.readFileSync('src/components/chat-cards/FoodCard.tsx', 'utf8');

const nameOld = `<span className="text-[9px] text-center font-medium leading-tight text-slate-500 truncate w-full">
                                      {item.originalName || item.keyword}
                                    </span>`;

const nameNew = `<span className="text-[9px] text-center font-medium leading-tight text-slate-500 truncate w-full">
                                      {showTranslations.scout ? (item.keyword || item.originalName) : (item.originalName || item.keyword)}
                                    </span>`;

if (code.includes(nameOld)) {
  code = code.replace(nameOld, nameNew);
  console.log("Success patch scout name");
} else {
  console.log("Failed patch scout name");
}
fs.writeFileSync('src/components/chat-cards/FoodCard.tsx', code);
