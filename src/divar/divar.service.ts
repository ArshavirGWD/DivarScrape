import { Injectable } from '@nestjs/common';
import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';

export interface Ad {
  title: string;
  price: string;
  status: string;
  link: string;
  phone?: string;
}

@Injectable()
export class DivarService {
  private page: Page | null = null;
  private browser: Browser | null = null;

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
    ];

    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
    await this.page.setUserAgent(randomUA);
  }

  async login(body: { phone?: string }) {
    const phone = body.phone;
    if (!phone) throw new Error('Phone number not found in body');
    if (!this.browser || !this.page) await this.initBrowser();

    const page = this.page!;
    console.log('Opening Divar...');
    await page.goto('https://divar.ir/s/mashhad', {
      waitUntil: 'networkidle2',
      timeout: 0,
    });

    const dropdownButton = await page.waitForSelector(
      'div.kt-dropdown-menu button.kt-button',
      { visible: true, timeout: 60000 },
    );
    await dropdownButton?.click();

    await page.waitForSelector('div.kt-dropdown-menu__menu', { visible: true });

    const loginButton = await page.$('button.kt-fullwidth-link');
    if (!loginButton) throw new Error('Login button not found');
    await loginButton.click();
    console.log('Login modal opened');

    const inputField = await page.waitForSelector(
      'input[name="mobile"].kt-textfield__input',
      { visible: true, timeout: 15000 },
    );
    await inputField?.type(phone, { delay: 100 });

    const buttons = await page.$$('button.kt-button');
    let clicked = false;
    for (const btn of buttons) {
      const span = await btn.$('span');
      if (!span) continue;
      const text = (await (
        await span.getProperty('textContent')
      ).jsonValue()) as string | null;
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
      throw new Error('Browser not initialized. Call login first.');

    const page = this.page;
    const url = `https://divar.ir/s/${encodeURIComponent(city)}?q=${encodeURIComponent(q)}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

    await this.scroll(page);

    const ads: Ad[] = await page.evaluate(() => {
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
        const adPage = await this.browser!.newPage();
        await adPage.setViewport({ width: 1440, height: 900 });
        await adPage.goto(`https://divar.ir${ad.link}`, {
          waitUntil: 'networkidle2',
          timeout: 0,
        });

        const contactBtn = await adPage.$('button.post-actions__get-contact');
        if (contactBtn) {
          await this.mouseMove(adPage, contactBtn);

          await this.delay(Math.floor(Math.random() * 8000 + 7000));

          await adPage.waitForFunction(
            () =>
              !!document.querySelector('div.kt-base-row__end a[href^="tel:"]'),
            { timeout: 15000 },
          );

          const phone = await adPage.$eval(
            'div.kt-base-row__end a[href^="tel:"]',
            (el) => el.textContent?.trim(),
          );
          ad.phone = phone || undefined;
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
        window.scrollBy(0, Math.floor(Math.random() * 100 + 50));
      });
      await this.delay(Math.floor(Math.random() * 8000 + 7000));
      const newHeight = await page.evaluate('document.body.scrollHeight');
      if (newHeight === lastHeight) sameCount++;
      else {
        sameCount = 0;
        lastHeight = newHeight;
      }
    }
  }

  private async mouseMove(page: Page, element: ElementHandle<Element>) {
    const box = await element.boundingBox();
    if (!box) return;
    const x = box.x + box.width / 2 + (Math.random() * 10 - 5);
    const y = box.y + box.height / 2 + (Math.random() * 10 - 5);
    await page.mouse.move(x, y, { steps: 15 });
    await this.delay(Math.floor(Math.random() * 500 + 200));
    await element.click();
    await this.delay(Math.floor(Math.random() * 800 + 400));
  }

  private async slowClick(element: ElementHandle<Element>) {
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
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
