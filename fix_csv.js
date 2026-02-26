const fs = require('fs');

const content = fs.readFileSync('Database.csv', 'utf-8');
const lines = content.split('\n');

const cleanedLines = lines.map((line, index) => {
    // 1-я строка (заголовки) или пустые строки остаются без изменений
    if (index === 0 || !line.trim()) {
        return line;
    }

    // Парсер для CSV (с учетом кавычек)
    const fields = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            fields.push(currentField);
            currentField = '';
        } else {
            currentField += char;
        }
    }
    fields.push(currentField);

    // Форматирование полей: текст в кавычках (по умолчанию), числа — без кавычек
    return fields.map((field, colIndex) => {
        let val = field.trim();

        // Индексы числовых колонок (начиная с 0):
        // 3: C%, 4: CrMoV%, 5: Length, 6: Width, 7: Grinding, 8: Honing
        if ([3, 4, 5, 6, 7, 8].includes(colIndex) && val !== '') {
            const num = parseFloat(val);
            if (!isNaN(num)) {
                return num.toString();
            }
        }

        return '"' + val + '"';
    }).join(',');
});

fs.writeFileSync('Database_fixed.csv', cleanedLines.join('\n'));
console.log("Успешно: файл Database_fixed.csv создан.");
