const fs = require('fs');
let content = fs.readFileSync('src/components/chat-cards/NutritionLabelTable.tsx', 'utf8');

const target = `                )}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}`;

const replacement = `                )}
                {item._preservedAnomalyFlags && item._preservedAnomalyFlags.length > 0 && (
                  <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-sans px-1">
                    Note: {item._preservedAnomalyFlags.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  console.log("Patched preserved anomaly flags successfully!");
  fs.writeFileSync('src/components/chat-cards/NutritionLabelTable.tsx', content);
} else {
  console.log("Not found!");
}
