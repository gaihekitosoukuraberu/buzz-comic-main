import puppeteer, { Browser, Page } from "puppeteer";
import * as fs from "fs";

export interface TwitterPostOptions {
  videoPath: string;
  text: string;
  hashtags: string[];
}

/** Puppeteer v23+ では waitForTimeout が削除されたため、代替ユーティリティ */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TwitterPoster {
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

    // Navigate to X login page
    await this.page.goto("https://x.com/i/flow/login", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Enter username
    await this.page.waitForSelector('input[autocomplete="username"]', {
      timeout: 15000,
    });
    await this.page.type('input[autocomplete="username"]', username, {
      delay: 50,
    });

    // Click Next button (Enter fallback)
    await this.page.keyboard.press("Enter");

    await sleep(2000);

    // Handle unusual activity check (phone/username verification)
    const verifyInput = await this.page.$(
      'input[data-testid="ocfEnterTextTextInput"]'
    );
    if (verifyInput) {
      await verifyInput.type(username, { delay: 50 });
      await this.page.keyboard.press("Enter");
      await sleep(2000);
    }

    // Enter password
    await this.page.waitForSelector('input[name="password"]', {
      timeout: 15000,
    });
    await this.page.type('input[name="password"]', password, { delay: 50 });

    // Click Login button
    await this.page.keyboard.press("Enter");

    // Wait for successful login (redirect to home timeline)
    await this.page.waitForNavigation({
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const currentUrl = this.page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/i/flow")) {
      throw new Error(
        "Twitter ログインに失敗しました。認証情報を確認してください。"
      );
    }

    console.log("[TwitterPoster] ログイン成功:", currentUrl);
  }

  async postVideo(options: TwitterPostOptions): Promise<string> {
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

    // Navigate to X home
    await this.page.goto("https://x.com/home", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Click the compose tweet box
    await this.page.waitForSelector('[data-testid="tweetTextarea_0"]', {
      timeout: 15000,
    });
    await this.page.click('[data-testid="tweetTextarea_0"]');

    // Compose tweet text with hashtags
    const hashtagText = hashtags
      .map((tag) => `#${tag.replace(/^#/, "")}`)
      .join(" ");
    const fullText = `${text}\n\n${hashtagText}`.trim();

    await this.page.type('[data-testid="tweetTextarea_0"]', fullText, {
      delay: 30,
    });

    // Attach video file
    const fileInput = await this.page.$('input[data-testid="fileInput"]');
    if (fileInput) {
      await fileInput.uploadFile(videoPath);
    } else {
      // Try finding media button
      const mediaButton = await this.page.$('[data-testid="attachments"]');
      if (mediaButton) {
        await mediaButton.click();
        await sleep(1000);
        const input = await this.page.$("input[accept]");
        if (input) {
          await input.uploadFile(videoPath);
        }
      }
    }

    // Wait for video to upload
    await sleep(5000);

    // Wait for upload to complete (progress bar gone)
    try {
      await this.page.waitForSelector('[data-testid="progressBar"]', {
        hidden: true,
        timeout: 120000,
      });
    } catch {
      // Progress bar might not appear for small files
      console.log("[TwitterPoster] アップロード完了（プログレスバーなし）");
    }

    // Click Tweet button
    await this.page.waitForSelector('[data-testid="tweetButtonInline"]', {
      timeout: 15000,
    });
    await this.page.click('[data-testid="tweetButtonInline"]');

    // Wait for the tweet to be posted
    await sleep(3000);

    // Try to get the posted tweet URL
    try {
      await this.page.waitForSelector('[data-testid="tweet"]', {
        timeout: 10000,
      });
      const tweetLinks = await this.page.$$eval(
        '[data-testid="tweet"] a[href*="/status/"]',
        (links) => links.map((a) => (a as HTMLAnchorElement).href)
      );

      if (tweetLinks.length > 0) {
        const postUrl = tweetLinks[0];
        console.log("[TwitterPoster] 投稿成功:", postUrl);
        return postUrl;
      }
    } catch {
      console.log("[TwitterPoster] ツイートURL取得スキップ");
    }

    return `https://x.com/home`;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
