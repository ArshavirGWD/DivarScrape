"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DivarService = void 0;
const common_1 = require("@nestjs/common");
const puppeteer_1 = __importDefault(require("puppeteer"));
let DivarService = class DivarService {
    page = null;
    browser = null;
    async initBrowser() {
        this.browser = await puppeteer_1.default.launch({ headless: false });
        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1440, height: 900 });
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Firefox/118.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 13.6; rv:118.0) Gecko/20100101 Firefox/118.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Mobile Safari/537.36',
        ];
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
        await this.page.setUserAgent(randomUA);
    }
    async login(body) {
        const phone = body.phone;
        if (!phone)
            throw new Error('Phone number not found in body');
        if (!this.browser || !this.page)
            await this.initBrowser();
        const page = this.page;
        console.log('Opening Divar...');
        await page.goto('https://divar.ir/s/mashhad', {
            waitUntil: 'networkidle2',
            timeout: 0,
        });
        const dropdownButton = await page.waitForSelector('div.kt-dropdown-menu button.kt-button', { visible: true, timeout: 60000 });
        await dropdownButton?.click();
        await page.waitForSelector('div.kt-dropdown-menu__menu', { visible: true });
        const loginButton = await page.$('button.kt-fullwidth-link');
        if (!loginButton)
            throw new Error('Login button not found');
        await loginButton.click();
        console.log('Login modal opened');
        const inputField = await page.waitForSelector('input[name="mobile"].kt-textfield__input', { visible: true, timeout: 15000 });
        await inputField?.type(phone, { delay: 100 });
        const buttons = await page.$$('button.kt-button');
        let clicked = false;
        for (const btn of buttons) {
            const span = await btn.$('span');
            if (!span)
                continue;
            const text = (await (await span.getProperty('textContent')).jsonValue());
            if (text?.includes('تأیید')) {
                await this.slowClick(btn);
                clicked = true;
                break;
            }
        }
        if (!clicked)
            throw new Error('Submit button not found');
        console.log('Login code sent');
    }
    async collectAds(city, q) {
        if (!this.page)
            throw new Error('Browser not initialized. Call login first.');
        const page = this.page;
        const url = `https://divar.ir/s/${encodeURIComponent(city)}?q=${encodeURIComponent(q)}`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });
        await this.scroll(page);
        const ads = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('article.kt-post-card').forEach((el) => {
                const title = el.querySelector('h2.kt-post-card__title')?.textContent?.trim() ?? '';
                const descriptions = Array.from(el.querySelectorAll('div.kt-post-card__description')).map((d) => d.textContent?.trim() ?? '');
                const status = descriptions[0] || '';
                const price = descriptions[1] || '';
                const link = el.querySelector('a.kt-post-card__action')?.getAttribute('href') ??
                    '';
                items.push({ title, price, status, link });
            });
            return items;
        });
        for (const ad of ads) {
            if (!ad.link)
                continue;
            try {
                const adPage = await this.browser.newPage();
                await adPage.setViewport({ width: 1440, height: 900 });
                await adPage.goto(`https://divar.ir${ad.link}`, {
                    waitUntil: 'networkidle2',
                    timeout: 0,
                });
                const contactBtn = await adPage.$('button.post-actions__get-contact');
                if (contactBtn) {
                    await this.mouseMove(adPage, contactBtn);
                    await this.delay(Math.floor(Math.random() * 8000 + 7000));
                    await adPage.waitForFunction(() => !!document.querySelector('div.kt-base-row__end a[href^="tel:"]'), { timeout: 15000 });
                    const phone = await adPage.$eval('div.kt-base-row__end a[href^="tel:"]', (el) => el.textContent?.trim());
                    ad.phone = phone || undefined;
                }
                await adPage.close();
            }
            catch (err) {
                console.warn(`Cannot get phone for ${ad.link}:`, err);
                ad.phone = undefined;
            }
        }
        return ads;
    }
    async scroll(page) {
        let lastHeight = await page.evaluate('document.body.scrollHeight');
        let sameCount = 0;
        while (sameCount < 5) {
            await page.evaluate(() => {
                window.scrollBy(0, Math.floor(Math.random() * 100 + 50));
            });
            await this.delay(Math.floor(Math.random() * 8000 + 7000));
            const newHeight = await page.evaluate('document.body.scrollHeight');
            if (newHeight === lastHeight)
                sameCount++;
            else {
                sameCount = 0;
                lastHeight = newHeight;
            }
        }
    }
    async mouseMove(page, element) {
        const box = await element.boundingBox();
        if (!box)
            return;
        const x = box.x + box.width / 2 + (Math.random() * 10 - 5);
        const y = box.y + box.height / 2 + (Math.random() * 10 - 5);
        await page.mouse.move(x, y, { steps: 15 });
        await this.delay(Math.floor(Math.random() * 500 + 200));
        await element.click();
        await this.delay(Math.floor(Math.random() * 800 + 400));
    }
    async slowClick(element) {
        await element.evaluate((el) => {
            el.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        });
        await this.delay(Math.floor(Math.random() * 500 + 300));
        await element.click();
    }
    async delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.DivarService = DivarService;
exports.DivarService = DivarService = __decorate([
    (0, common_1.Injectable)()
], DivarService);
//# sourceMappingURL=divar.service.js.map