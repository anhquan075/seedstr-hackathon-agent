import fs from 'fs';
import path from 'path';

const promptFile = path.join(process.cwd(), '.agent-prompt');
console.log('Checking for .agent-prompt in:', promptFile);

const check = () => {
    if (fs.existsSync(promptFile)) {
        console.log('.agent-prompt FOUND! Content:');
        console.log(fs.readFileSync(promptFile, 'utf-8'));
        process.exit(0);
    }
};

setInterval(check, 100);
setTimeout(() => {
    console.log('.agent-prompt NOT FOUND after 10s');
    process.exit(1);
}, 10000);
