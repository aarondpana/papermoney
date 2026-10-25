import fs from 'node:fs';
const required=['index.html','app.js','pricing.js','accounting.js','execution.js','storage.js','lessons.js','style.css'];for(const f of required){if(!fs.existsSync('dist/'+f))throw Error('Missing '+f)}fs.writeFileSync('dist/.nojekyll','');console.log('Static production files verified. No dependencies or compilation required.');
