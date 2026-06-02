import { prisma } from "@/lib/db";
import { TwitterPoster } from "./twitter-poster";
import { InstagramPoster } from "./instagram-poster";

const MAX_RETRIES = 3;

interface SchedulerResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: { postId: string; error: string }[];
}

/**
 * SnsPost テーブルから scheduledAt <= now の pending 投稿を実行する
 */
export async function runScheduledPosts(): Promise<SchedulerResult> {
  const result: SchedulerResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  const now = new Date();

  // スケジュール済みで未投稿の投稿を取得
  const pendingPosts = await prisma.snsPost.findMany({
    where: {
      status: "pending",
      scheduledAt: {
        lte: now,
      },
    },
    include: {
      manga: {
        select: {
          id: true,
          title: true,
          description: true,
          genre: true,
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: 10, // 1回の実行で最大10件
  });

  if (pendingPosts.length === 0) {
    console.log("[SnsScheduler] スケジュール済み投稿なし");
    return result;
  }

  console.log(`[SnsScheduler] ${pendingPosts.length}件の投稿を処理します`);

  for (const post of pendingPosts) {
    result.processed++;

    try {
      await executePost(post);
      result.succeeded++;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラー";
      result.failed++;
      result.errors.push({ postId: post.id, error: errorMessage });
      console.error(`[SnsScheduler] 投稿失敗 (ID: ${post.id}):`, errorMessage);
    }
  }

  console.log(
    `[SnsScheduler] 完了: 成功=${result.succeeded}, 失敗=${result.failed}`
  );
  return result;
}

interface PostWithManga {
  id: string;
  platform: string;
  videoUrl: string | null;
  postUrl: string | null;
  error: string | null;
  manga: {
    id: string;
    title: string;
    description: string | null;
    genre: string | null;
  };
}

async function executePost(post: PostWithManga): Promise<void> {
  // payload は Job テーブルに保存されているため、ここでは manga 情報からテキストを再構成
  const text = `${post.manga.title} をチェック！`;
  const hashtags = ["漫画", "AI漫画", "BuzzComic"];

  // Job テーブルから対応する payload を取得
  const job = await prisma.job.findFirst({
    where: {
      type: "sns_post",
      status: "pending",
      payload: { contains: post.id },
    },
    select: { payload: true },
  });

  let resolvedText = text;
  let resolvedHashtags = hashtags;

  if (job?.payload) {
    try {
      const parsed = JSON.parse(job.payload) as {
        text?: string;
        hashtags?: string[];
      };
      if (parsed.text) resolvedText = parsed.text;
      if (parsed.hashtags) resolvedHashtags = parsed.hashtags;
    } catch {
      // ignore parse error, use defaults
    }
  }

  const videoPath: string = post.videoUrl
    ? post.videoUrl.replace(/^\//, "./public/")
    : "";

  // ステータスを posting に更新（重複実行防止）
  await prisma.snsPost.update({
    where: { id: post.id },
    data: { status: "posting" },
  });

  let postUrl = "";
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[SnsScheduler] 投稿試行 ${attempt}/${MAX_RETRIES} (ID: ${post.id}, platform: ${post.platform})`
      );

      if (post.platform === "twitter") {
        postUrl = await postToTwitter({
          videoPath,
          text: resolvedText,
          hashtags: resolvedHashtags,
        });
      } else if (post.platform === "instagram") {
        postUrl = await postToInstagram({
          videoPath,
          text: resolvedText,
          hashtags: resolvedHashtags,
        });
      } else {
        throw new Error(`未対応のプラットフォーム: ${post.platform}`);
      }

      // 成功
      await prisma.snsPost.update({
        where: { id: post.id },
        data: {
          status: "posted",
          postUrl,
          postedAt: new Date(),
          error: null,
        },
      });

      console.log(`[SnsScheduler] 投稿成功 (ID: ${post.id}): ${postUrl}`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[SnsScheduler] 試行 ${attempt} 失敗:`,
        lastError.message
      );

      if (attempt < MAX_RETRIES) {
        // 指数バックオフで待機
        const waitMs = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  // 全試行失敗
  await prisma.snsPost.update({
    where: { id: post.id },
    data: {
      status: "failed",
      error: lastError?.message ?? "不明なエラー",
    },
  });

  throw lastError ?? new Error("投稿に失敗しました");
}

async function postToTwitter(options: {
  videoPath: string;
  text: string;
  hashtags: string[];
}): Promise<string> {
  const username = process.env.SNS_TWITTER_USERNAME;
  const password = process.env.SNS_TWITTER_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "Twitter認証情報が設定されていません (SNS_TWITTER_USERNAME, SNS_TWITTER_PASSWORD)"
    );
  }

  const poster = new TwitterPoster();
  try {
    await poster.login(username, password);
    const postUrl = await poster.postVideo(options);
    return postUrl;
  } finally {
    await poster.close();
  }
}

async function postToInstagram(options: {
  videoPath: string;
  text: string;
  hashtags: string[];
}): Promise<string> {
  const username = process.env.SNS_INSTAGRAM_USERNAME;
  const password = process.env.SNS_INSTAGRAM_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "Instagram認証情報が設定されていません (SNS_INSTAGRAM_USERNAME, SNS_INSTAGRAM_PASSWORD)"
    );
  }

  const poster = new InstagramPoster();
  try {
    await poster.login(username, password);
    const postUrl = await poster.postVideo(options);
    return postUrl;
  } finally {
    await poster.close();
  }
}
