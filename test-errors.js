const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';
    
    // remove query params
    filePath = filePath.split('?')[0];

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end();
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
    });
});

server.listen(8080, async () => {
    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        
        page.on('console', msg => {
            if (msg.type() === 'error') console.log('ERROR:', msg.text());
        });
        page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
        
        await page.goto('http://localhost:8080/');
        await page.waitForTimeout(1000);
        
        // Wait and see if there's any crash in app.js
        console.log("Checking for JS crash...");
        
        // Try to click btn-sync
        const success = await page.evaluate(() => {
            const btn = document.getElementById('btn-sync');
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });
        console.log("Click dispatched?", success);
        
        await page.waitForTimeout(1000);
    } catch(e) {
        console.error(e);
    } finally {
        if(browser) await browser.close();
        server.close();
    }
});
