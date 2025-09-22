/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import puppeteer, { Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

export interface Ad {
  title: string;
  price: string;
  status: string;
  link: string;
  phone?: string;
}

@Injectable()
export class DivarService {
  page: Page;
  browser: any;
  cookiesPath = path.join(__dirname, 'divar_cookies.json');

  async initBrowser() {
    this.browser = await puppeteer.launch({ headless: false });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1440, height: 900 });

    if (fs.existsSync(this.cookiesPath)) {
      const cookiesString = fs.readFileSync(this.cookiesPath, 'utf-8');
      const cookies = JSON.parse(cookiesString);
      await this.page.setCookie(...cookies);
      console.log('Cookies loaded, skipping login.');
    }
  }

  async login(body: { phone?: string }) {
    const phone = body.phone;
    if (!phone && !fs.existsSync(this.cookiesPath)) {
      throw new Error('Phone number not found in body and no saved session.');
    }

    if (!this.browser || !this.page) await this.initBrowser();

    if (fs.existsSync(this.cookiesPath)) {
      console.log('Already logged in with saved session.');
      return;
    }

    console.log('Opening Divar...');
    await this.page.goto('https://divar.ir/s/mashhad', {
      waitUntil: 'networkidle2',
      timeout: 0,
    });

    const dropdownButton = await this.page.waitForSelector(
      'div.kt-dropdown-menu button.kt-button',
      { visible: true, timeout: 60000 },
    );
    await dropdownButton?.click();

    await this.page.waitForSelector('div.kt-dropdown-menu__menu', {
      visible: true,
    });
    const loginButton = await this.page.$('button.kt-fullwidth-link');
    if (!loginButton) throw new Error('Login button not found');
    await loginButton.click();
    console.log('Login modal opened');

    const inputField = await this.page.waitForSelector(
      'input[name="mobile"].kt-textfield__input',
      { visible: true, timeout: 20000 },
    );
    if (phone) {
      await inputField?.type(phone, { delay: 200 });
    }

    const buttons = await this.page.$$('button.kt-button');

    let clicked = false;
    for (const btn of buttons) {
      const span = await btn.$('span');
      if (!span) continue;

      const text = await (await span.getProperty('textContent')).jsonValue();
      if (text?.includes('تأیید')) {
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) throw new Error('Submit button not found');
    console.log('Login code sent. Please enter OTP manually if needed.');

    const cookies = await this.page.cookies();
    fs.writeFileSync(this.cookiesPath, JSON.stringify(cookies, null, 2));
    console.log('Session saved with cookies.');
  }

  async collectAds(city: string, q: string): Promise<Ad[]> {
    if (!this.page)
      throw new Error('Browser not initialized. Call loginFromBody first.');

    const url = `https://divar.ir/s/${encodeURIComponent(city)}?q=${encodeURIComponent(q)}`;
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

    await this.autoScroll(this.page, 15000, 150);

    const ads: Ad[] = await this.page.evaluate(() => {
      const items: Ad[] = [];
      document.querySelectorAll('article.kt-post-card').forEach((el) => {
        const title =
          el.querySelector('h2.kt-post-card__title')?.textContent?.trim() ?? '';
        const descriptions = Array.from(
          el.querySelectorAll('div.kt-post-card__description'),
        ).map((d) => d.textContent?.trim() ?? '');
        const status = descriptions[0] || '';
        const price = descriptions[1] || '';
        const link =
          el.querySelector('a.kt-post-card__action')?.getAttribute('href') ??
          '';
        items.push({ title, price, status, link });
      });
      return items;
    });

    for (const ad of ads) {
      if (!ad.link) continue;

      try {
        const adPage: Page = await this.browser.newPage();
        await adPage.setViewport({ width: 1440, height: 900 });
        await adPage.goto(`https://divar.ir${ad.link}`, {
          waitUntil: 'networkidle2',
          timeout: 0,
        });

        const contactBtn = await adPage.$('button.post-actions__get-contact');
        if (contactBtn) {
          await contactBtn.evaluate((el) =>
            el.scrollIntoView({ behavior: 'smooth', block: 'center' }),
          );
          await contactBtn.click();

          await adPage.waitForFunction(
            () =>
              !!document.querySelector('div.kt-base-row__end a[href^="tel:"]'),
            { timeout: 15000 },
          );

          const phone = await adPage.$eval(
            'div.kt-base-row__end a[href^="tel:"]',
            (el) => el.textContent?.trim(),
          );
          ad.phone = phone;
        }

        await adPage.close();
      } catch (err) {
        console.warn(`Cannot get phone for ${ad.link}:`, err);
        ad.phone = undefined;
      }
    }

    return ads;
  }

  private async autoScroll(page: Page, delay = 15000, maxProducts = 150) {
    let previousHeight: number = 0;
    let sameCount: number = 0;
    let totalProducts: number = 0;

    while (sameCount < 5 && totalProducts < maxProducts) {
      const currentHeight = await page.evaluate(
        () => document.body.scrollHeight,
      );

      if (currentHeight === previousHeight) {
        sameCount++;
      } else {
        sameCount = 0;
        previousHeight = currentHeight;
      }

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((resolve) => setTimeout(resolve, delay));

      totalProducts = await page.evaluate(
        () => document.querySelectorAll('article.kt-post-card').length,
      );
    }
  }
}
