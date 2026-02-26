const fs = require('fs');

const content = fs.readFileSync('js/knives.js', 'utf-8');
const scriptContext = {};
eval(content + '\n scriptContext.allKnives = allKnives;');
const knives = scriptContext.allKnives;

const headers = ["Brand", "Series", "Steel", "C, %", "CrMoV, %", "Length", "Width", "Grinding", "Honing", "Comments", "Category"];

const lines = [];
lines.push(headers.map(h => `"${h}"`).join(','));

knives.forEach(k => {
    const row = [
        `"${k.brand || ''}"`,
        `"${k.series || ''}"`,
        `"${k.steel || ''}"`,
        k.carbon ? parseFloat(k.carbon) : '""',
        k.CrMoV ? parseFloat(k.CrMoV) : '""',
        '""', // Length
        '""', // Width
        k.angle !== undefined && k.angle !== "" ? parseFloat(k.angle) : '""',
        k.honing_add !== undefined && k.honing_add !== "" ? parseFloat(k.honing_add) : '""',
        '""', // Comments
        `"${k.category || ''}"`
    ];
    lines.push(row.join(','));
});

fs.writeFileSync('Database_fixed.csv', lines.join('\n'), 'utf-8');
console.log('Database_fixed.csv created successfully.');
