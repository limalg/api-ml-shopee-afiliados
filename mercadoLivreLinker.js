const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class MercadoLivreLinker {
    constructor(cookiesPath) {
        /**
         * Initialize the Mercado Livre link automator
         * @param {string} cookiesPath - Path to the exported Chrome cookies file
         */
        this.cookiesPath = cookiesPath;
        this.browser = null;
        this.page = null;
    }

    async initialize() {
        // Launch a new browser instance
        this.browser = await puppeteer.launch({
            headless: 'new', // Use 'new' for the new headless mode, or false for headful
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--start-maximized',
                '--disable-infobars',
                '--disable-notifications',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ],
            ignoreDefaultArgs: ['--enable-automation'], // Try to avoid detection
        });
        this.page = await this.browser.newPage();

        // Try to avoid detection even further
        await this.page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        });

        await this.page.setDefaultTimeout(10000); // Set default timeout for navigation and element waiting

        await this.loadCookies();
    }

    async loadCookies() {
        /**
         * Load cookies from the Chrome browser
         */
        if (!fs.existsSync(this.cookiesPath)) {
            console.error("Cookies file not found. Export cookies from Chrome first.");
            return;
        }

        const cookiesJson = JSON.parse(fs.readFileSync(this.cookiesPath, 'utf8'));

        await this.page.goto("https://www.mercadolivre.com.br", {
            waitUntil: 'networkidle2'
        });
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds

        for (const cookie of cookiesJson) {
            try {
                // Puppeteer's addCookie expects a slightly different format
                await this.page.setCookie({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path || '/',
                    expires: cookie.expirationDate ? Math.round(cookie.expirationDate) : -1, // -1 for session cookies
                    httpOnly: cookie.httpOnly || false,
                    secure: cookie.secure || false,
                    sameSite: cookie.sameSite || 'Lax'
                });
            } catch (e) {
                console.error(`Error adding cookie ${cookie.name}: ${e.message}`);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
        await this.page.reload({
            waitUntil: 'networkidle2'
        });
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
    }

    async simulateTyping(selector, text) {
        /**
         * Simulate human typing with variable delay between characters
         * @param {string} selector - CSS selector of the input element
         * @param {string} text - Text to be typed
         */
        await this.page.focus(selector);
        await this.page.keyboard.down('Control');
        await this.page.keyboard.press('A');
        await this.page.keyboard.up('Control');
        await this.page.keyboard.press('Delete'); // Clear the field

        for (const char of text) {
            await this.page.keyboard.sendCharacter(char);
            await new Promise(resolve => setTimeout(resolve, Math.random() * (100 - 50) + 50)); // Random delay between 50ms and 100ms
        }
    }

    async generateShareLink(inputLink, etiqueta) {
        /**
         * Generate shareable link on Mercado Livre
         * @param {string} inputLink - Product or ad link
         * @param {string} etiqueta - Label/tag to select
         * @return {object|null} - Generated share links as an object, or null if an error occurs
         */
        try {
            await this.page.goto("https://www.mercadolivre.com.br/afiliados/linkbuilder#menu-lateral", {
                waitUntil: 'networkidle2'
            });

            const urlInputSelector = '#url-0';
            await this.page.waitForSelector(urlInputSelector);
            await this.simulateTyping(urlInputSelector, inputLink);
            await new Promise(resolve => setTimeout(resolve, Math.random() * (100 - 50) + 50));

            // Adjust selectors based on actual Mercado Livre page structure
            // These selectors might change frequently, so careful monitoring is needed.
            const triggerSelector = 'button[id$="-trigger"]'; // Finds an ID ending with "-trigger"
            await this.page.waitForSelector(triggerSelector);
            await this.page.click(triggerSelector);
            
            const dicGeneratedLink = {};
            const menuListSelector = 'ul[id$="-menu-list"]'; // Finds an ID ending with "-menu-list"
            await this.page.waitForSelector(menuListSelector, { visible: true });

            const listItems = await this.page.$$(`${menuListSelector} li`);
            
            for (const itemHandle of listItems) {
                const itemId = await itemHandle.evaluate(el => el.id);
                if (itemId && itemId.includes(etiqueta)) {
                    await new Promise(resolve => setTimeout(resolve, Math.random() * (100 - 50) + 50));
                    await itemHandle.click(); // Click the specific list item
                    
                    await new Promise(resolve => setTimeout(resolve, Math.random() * (800 - 100) + 100));
                    
                    // Look for the "Gerar" or "Gerir" button. Again, adjust selector as needed.
                    const generateButtonSelector = 'button[id$="kcq:"]'; 
                    await this.page.waitForSelector(generateButtonSelector);
                    await this.page.click(generateButtonSelector);
                    
                    await new Promise(resolve => setTimeout(resolve, Math.random() * (800 - 500) + 500));
                    
                    const shareLinkSelector = '#textfield-copyLink-1';
                    await this.page.waitForSelector(shareLinkSelector);
                    const generatedLink = await this.page.$eval(shareLinkSelector, el => el.value);
                    dicGeneratedLink[itemId] = generatedLink;
                }
            }

            return dicGeneratedLink;

        } catch (e) {
            console.error(`Error generating link: ${e.message}`);
            return null;
        }
    }

    async close() {
        /**
         * Close the browser
         */
        if (this.browser) {
            await this.browser.close();
        }
    }
}

module.exports = MercadoLivreLinker;