import puppeteer, { Browser, Page } from "puppeteer";
import * as fs from "fs";

export interface InstagramPostOptions {
  videoPath: string;
  text: string;
  hashtags: string[];
}

/** Puppeteer v23+ では waitForTimeout が削除されたため、代替ユーティリティ */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class InstagramPoster {
  private browser: Browser | null = null;
  private page: Page | null = null;

  private get isHeadless(): boolean {
    return process.env.PUPPETEER_HEADLESS !== "false";
  }

  async login(username: string, password: string): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: this.isHeadless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });

    // Set a realistic user agent
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Navigate to Instagram login
    await this.page.goto("https://www.instagram.com/accounts/login/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Handle cookie consent dialog if present
    try {
      const allowButton = await this.page.waitForSelector(
        'button[tabindex="0"]',
        { timeout: 5000 }
      );
      if (allowButton) {
        const buttonText = await allowButton.evaluate((el) => el.textContent);
        if (
          buttonText?.includes("Allow") ||
          buttonText?.includes("Accept") ||
          buttonText?.includes("許可")
        ) {
          await allowButton.click();
          await sleep(1000);
        }
      }
    } catch {
      // No cookie dialog
    }

    // Enter username
    await this.page.waitForSelector('input[name="username"]', {
      timeout: 15000,
    });
    await this.page.type('input[name="username"]', username, { delay: 50 });

    // Enter password
    await this.page.type('input[name="password"]', password, { delay: 50 });

    // Click login button
    await this.page.click('button[type="submit"]');

    await sleep(3000);

    // Handle "Save Login Info" dialog if shown
    try {
      const dialog = await this.page.waitForSelector('[role="dialog"]', {
        timeout: 5000,
      });
      if (dialog) {
        const buttons = await dialog.$$("button");
        for (const btn of buttons) {
          const text = await btn.evaluate((el) => el.textContent ?? "");
          if (
            text.toLowerCase().includes("not now") ||
            text.includes("後で")
          ) {
            await btn.click();
            await sleep(1000);
            break;
          }
        }
      }
    } catch {
      // No save dialog
    }

    // Handle "Turn on Notifications" dialog if shown
    try {
      const notifDialog = await this.page.waitForSelector('[role="dialog"]', {
        timeout: 5000,
      });
      if (notifDialog) {
        const buttons = await notifDialog.$$("button");
        for (const btn of buttons) {
          const text = await btn.evaluate((el) => el.textContent ?? "");
          if (
            text.toLowerCase().includes("not now") ||
            text.includes("後で")
          ) {
            await btn.click();
            await sleep(1000);
            break;
          }
        }
      }
    } catch {
      // No notification dialog
    }

    const currentUrl = this.page.url();
    if (currentUrl.includes("/accounts/login")) {
      throw new Error(
        "Instagram ログインに失敗しました。認証情報を確認してください。"
      );
    }

    console.log("[InstagramPoster] ログイン成功:", currentUrl);
  }

  async postVideo(options: InstagramPostOptions): Promise<string> {
    if (!this.page) {
      throw new Error(
        "ログインが完了していません。先に login() を呼び出してください。"
      );
    }

    const { videoPath, text, hashtags } = options;

    // Validate video file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`動画ファイルが見つかりません: ${videoPath}`);
    }

    // Compose caption with hashtags
    const hashtagText = hashtags
      .map((tag) => `#${tag.replace(/^#/, "")}`)
      .join(" ");
    const caption = `${text}\n\n${hashtagText}`.trim();

    // Navigate to Instagram home
    await this.page.goto("https://www.instagram.com/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Click the "+" (Create) button in navigation
    await this.page.waitForSelector('svg[aria-label="New post"]', {
      timeout: 15000,
    });
    await this.page.click('svg[aria-label="New post"]');
    await sleep(1000);

    // Upload the video file
    const fileInput = await this.page.waitForSelector('input[type="file"]', {
      timeout: 15000,
    });
    if (!fileInput) {
      throw new Error("ファイル入力要素が見つかりません");
    }
    await fileInput.uploadFile(videoPath);
    await sleep(3000);

    // Click "OK" on crop dialog if shown
    try {
      const dialog = await this.page.waitForSelector('[role="dialog"]', {
        timeout: 5000,
      });
      if (dialog) {
        const buttons = await dialog.$$("button");
        for (const btn of buttons) {
          const text = await btn.evaluate((el) => el.textContent ?? "");
          if (text === "OK" || text.includes("OK")) {
            await btn.click();
            await sleep(1000);
            break;
          }
        }
      }
    } catch {
      // No crop dialog
    }

    // Click "Next" through steps (up to 2 times)
    for (let step = 0; step < 2; step++) {
      try {
        const dialog = await this.page.waitForSelector('[role="dialog"]', {
          timeout: 5000,
        });
        if (!dialog) break;
        const buttons = await dialog.$$("button");
        let clicked = false;
        for (const btn of buttons) {
          const text = await btn.evaluate((el) => el.textContent ?? "");
          if (text.toLowerCase().includes("next") || text.includes("次へ")) {
            await btn.click();
            await sleep(2000);
            clicked = true;
            break;
          }
        }
        if (!clicked) break;
      } catch {
        break;
      }
    }

    // Add caption
    try {
      const captionArea = await this.page.waitForSelector(
        'div[aria-label="Write a caption..."], div[aria-label="キャプションを書く..."], textarea[aria-label="Write a caption..."]',
        { timeout: 10000 }
      );
      if (captionArea) {
        await captionArea.click();
        await captionArea.type(caption, { delay: 20 });
      }
    } catch {
      console.log("[InstagramPoster] キャプション入力スキップ");
    }

    // Click "Share" button
    let shared = false;
    try {
      const dialog = await this.page.waitForSelector('[role="dialog"]', {
        timeout: 10000,
      });
      if (dialog) {
        const buttons = await dialog.$$("button");
        for (const btn of buttons) {
          const text = await btn.evaluate((el) => el.textContent ?? "");
          if (
            text.toLowerCase().includes("share") ||
            text.includes("シェア")
          ) {
            await btn.click();
            shared = true;
            break;
          }
        }
      }
    } catch {
      // ignore
    }

    if (!shared) {
      throw new Error("シェアボタンが見つかりません");
    }

    // Wait for upload to complete
    await sleep(5000);

    const currentUrl = this.page.url();
    console.log("[InstagramPoster] 投稿成功:", currentUrl);

    return currentUrl.includes("instagram.com/p/")
      ? currentUrl
      : "https://www.instagram.com/";
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
