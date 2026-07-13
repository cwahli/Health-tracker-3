const fs = require('fs');
let logChat = fs.readFileSync('src/components/LogChat.tsx', 'utf8');

logChat = logChat.replace(`                  )}
                  } else {`, `                  )}
                </div>
              );
            } else {`);

fs.writeFileSync('src/components/LogChat.tsx', logChat);
