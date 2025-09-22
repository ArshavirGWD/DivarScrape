/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable } from '@nestjs/common';
import puppeteer, { Page } from 'puppeteer';

export interface Ad {
  title: string;
  price: string;
  status: string;
  link: string;
  phone?: string;
}

@Injectable()
export class DivarService {
  page: any;
  browser: any;

  async initBrowser() {
    this.browser = await puppeteer.launch({ headless: false });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1440, height: 900 });
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Firefox/118.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 13.6; rv:118.0) Gecko/20100101 Firefox/118.0',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:40.0) Gecko/20100101 Firefox/40.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/600.8.9 (KHTML, like Gecko) Version/7.1.8 Safari/537.85.17',
      'Mozilla/5.0 (iPad; CPU OS 8_4 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12H143 Safari/600.1.4',
      'Mozilla/5.0 (iPad; CPU OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12F69 Safari/600.1.4',
      'Mozilla/5.0 (Windows NT 6.1; rv:40.0) Gecko/20100101 Firefox/40.0',
      'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
      'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
      'Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; Touch; rv:11.0) like Gecko',
      'Mozilla/5.0 (Windows NT 5.1; rv:40.0) Gecko/20100101 Firefox/40.0',
      'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/600.6.3 (KHTML, like Gecko) Version/8.0.6 Safari/600.6.3',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/600.5.17 (KHTML, like Gecko) Version/8.0.5 Safari/600.5.17',
      'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:38.0) Gecko/20100101 Firefox/38.0',
      'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 8_4_1 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12H321 Safari/600.1.4',
      'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
      'Mozilla/5.0 (iPad; CPU OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Version/7.0 Mobile/11D257 Safari/9537.53',
      'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
    ];

    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
    await this.page.setUserAgent(randomUA);
  }

  async login(body: { phone?: string }) {
    const phone = body.phone;
    if (!phone) throw new Error('Phone number not found in body');
    if (!this.browser || !this.page) await this.initBrowser();

    console.log('Opening Divar...');
    await this.page.goto('https://divar.ir/s/mashhad', {
      waitUntil: 'networkidle2',
      timeout: 0,
    });

    const dropdownButton = await this.page.waitForSelector(
      'div.kt-dropdown-menu button.kt-button',
      { visible: true, timeout: 60000 },
    );
    await dropdownButton.click();

    await this.page.waitForSelector('div.kt-dropdown-menu__menu', {
      visible: true,
    });

    const loginButton = await this.page.$('button.kt-fullwidth-link');
    if (!loginButton) throw new Error('Login button not found');
    await loginButton.click();
    console.log('Login modal opened');

    const inputField = await this.page.waitForSelector(
      'input[name="mobile"].kt-textfield__input',
      { visible: true, timeout: 15000 },
    );
    await inputField.type(phone, { delay: 100 });

    const buttons = await this.page.$$('button.kt-button');
    let clicked = false;
    for (const btn of buttons) {
      const span = await btn.$('span');
      if (!span) continue;
      const text = await (await span.getProperty('textContent')).jsonValue();
      if (text?.includes('تأیید')) {
        await this.slowClick(btn);
        clicked = true;
        break;
      }
    }
    if (!clicked) throw new Error('Submit button not found');
    console.log('Login code sent');
  }

  async collectAds(city: string, q: string): Promise<Ad[]> {
    if (!this.page)
      throw new Error('Browser not initialized. Call loginFromBody first.');

    const url = `https://divar.ir/s/${encodeURIComponent(city)}?q=${encodeURIComponent(q)}`;
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

    await this.scroll(this.page);

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
          await this.mouseMove(adPage, contactBtn);

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

  private async scroll(page: Page) {
    let lastHeight = await page.evaluate('document.body.scrollHeight');
    let sameCount = 0;
    while (sameCount < 5) {
      await page.evaluate(() => {
        window.scrollBy(0, Math.floor(Math.random() * 150 + 100));
      });
      await this.delay(Math.floor(Math.random() * 1000 + 800)); // 0.8-1.8 ثانیه
      const newHeight = await page.evaluate('document.body.scrollHeight');
      if (newHeight === lastHeight) sameCount++;
      else {
        sameCount = 0;
        lastHeight = newHeight;
      }
    }
  }

  private async mouseMove(page: Page, element: any) {
    const box = await element.boundingBox();
    if (!box) return;
    const x = box.x + box.width / 2 + (Math.random() * 10 - 5);
    const y = box.y + box.height / 2 + (Math.random() * 10 - 5);
    await page.mouse.move(x, y, { steps: 15 });
    await this.delay(Math.floor(Math.random() * 500 + 200));
    await element.click();
    await this.delay(Math.floor(Math.random() * 800 + 400));
  }

  private async slowClick(element: any) {
    await element.evaluate((el) => {
      (el as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
    await this.delay(Math.floor(Math.random() * 500 + 300));
    await element.click();
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
