const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.env.APPDATA, 'Antigravity', 'User', 'globalStorage', 'state.vscdb');

try {
    const data = fs.readFileSync(dbPath, 'utf8');

    // Find readable strings that look like JSON or tokens related to anthropic/openai/quota
    const matches = data.match(/(anthropic|openai|claude|codex|quota)[^\0]{0,100}/gi) || [];

    console.log(`Found ${matches.length} possible relevant snippets in DB.`);

    const unique = [...new Set(matches)];
    for (let i = 0; i < Math.min(20, unique.length); i++) {
        console.log(`- ${unique[i].substring(0, 100)}`);
    }

} catch (e) {
    console.error("Error reading file:", e);
}
