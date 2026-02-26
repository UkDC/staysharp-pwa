const fs = require('fs');

const content = fs.readFileSync('js/knives.js', 'utf-8');
const scriptContext = {};
eval(content + '\n scriptContext.allKnives = allKnives;');
const knives = scriptContext.allKnives;

const headers = ["Brand", "Series", "Steel", "C, %", "CrMoV, %", "Length", "Width", "Grinding", "Honing", "Comments", "Category"];

const lines = [];
// Use semicolon as separator for Russian locales
lines.push(headers.map(h => `"${h}"`).join(';'));

knives.forEach(k => {
    // Replace dot with comma for numbers
    const formatNumber = (val) => {
        if (val === undefined || val === null || val === "") return '""';
        const num = parseFloat(val);
        if (isNaN(num)) return '""';
        // return localized number string (e.g. "1,6")
        return num.toString().replace('.', ',');
    };

    const row = [
        `"${k.brand || ''}"`,
        `"${k.series || ''}"`,
        `"${k.steel || ''}"`,
        formatNumber(k.carbon),
        formatNumber(k.CrMoV),
        '""', // Length
        '""', // Width
        formatNumber(k.angle),
        formatNumber(k.honing_add),
        '""', // Comments
        `"${k.category || ''}"`
    ];
    lines.push(row.join(';')); // semicolon separated
});

fs.writeFileSync('Database_fixed_ru.csv', lines.join('\n'), 'utf-8');
console.log('Database_fixed_ru.csv created successfully.');
