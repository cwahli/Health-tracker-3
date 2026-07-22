const fs = require('fs');
if (fs.existsSync('src/components/HealthFrontDesk.tsx')) {
  fs.unlinkSync('src/components/HealthFrontDesk.tsx');
}
