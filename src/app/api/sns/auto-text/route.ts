import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface Manga {
  id: string;
  title: string;
  description?: string | null;
  genre?: string | null;
  tags?: string | null;
}

/**
 * ジャンル別ハッシュタグマッピング
 */
const GENRE_HASHTAGS: Record<string, string[]> = {
  action: ["アクション漫画", "バトル漫画", "格闘漫画"],
  romance: ["恋愛漫画", "ラブコメ", "ロマンス"],
  comedy: ["コメディ漫画", "ギャグ漫画", "笑える漫画"],
  horror: ["ホラー漫画", "怖い漫画", "サスペンス漫画"],
  sf: ["SF漫画", "SFフィクション", "未来漫画"],
  general: ["漫画", "コミック", "マンガ"],
};

/**
 * 投稿テキストテンプレート
 */
const POST_TEMPLATES = [
  (manga: Manga) =>
    `📚 ${manga.title}\n\n${(manga.description ?? "").slice(0, 100)}${(manga.description ?? "").length > 100 ? "..." : ""}`,
  (manga: Manga) =>
    `✨ 新作マンガ「${manga.title}」公開中！\n\n${(manga.description ?? "面白い物語をお楽しみください").slice(0, 80)}${(manga.description ?? "").length > 80 ? "..." : ""}`,
  (manga: Manga) =>
    `🎨 AIが生み出した話題作「${manga.title}」\n\n${(manga.description ?? "").slice(0, 90)}${(manga.description ?? "").length > 90 ? "..." : ""}`,
];

/**
 * 漫画情報からハッシュタグ付き投稿テキストを生成する（外部 API 不使用）
 */
export function generatePostText(manga: Manga): string {
  const template = POST_TEMPLATES[Math.floor(Math.random() * POST_TEMPLATES.length)];
  const baseText = template(manga);

  const genreKey = (manga.genre ?? "general").toLowerCase();
  const genreHashtags = GENRE_HASHTAGS[genreKey] ?? GENRE_HASHTAGS.general;

  // タグから追加ハッシュタグを生成
  let extraHashtags: string[] = [];
  if (manga.tags) {
    try {
      const tags: string[] = JSON.parse(manga.tags);
      extraHashtags = tags.slice(0, 3).map((t) => t.replace(/\s/g, ""));
    } catch {
      // tags が JSON でない場合は無視
    }
  }

  const allHashtags = [
    "漫画",
    "AI漫画",
    "BuzzComic",
    ...genreHashtags.slice(0, 2),
    ...extraHashtags,
  ];

  const uniqueHashtags = [...new Set(allHashtags)];
  const hashtagText = uniqueHashtags.map((tag) => `#${tag}`).join(" ");

  return `${baseText}\n\n${hashtagText}`;
}

/**
 * generatePostText のハッシュタグ部分だけを返す
 */
export function generateHashtags(manga: Manga): string[] {
  const genreKey = (manga.genre ?? "general").toLowerCase();
  const genreHashtags = GENRE_HASHTAGS[genreKey] ?? GENRE_HASHTAGS.general;

  let extraHashtags: string[] = [];
  if (manga.tags) {
    try {
      const tags: string[] = JSON.parse(manga.tags);
      extraHashtags = tags.slice(0, 3).map((t) => t.replace(/\s/g, ""));
    } catch {
      // ignore
    }
  }

  const allHashtags = [
    "漫画",
    "AI漫画",
    "BuzzComic",
    ...genreHashtags.slice(0, 2),
    ...extraHashtags,
  ];

  return [...new Set(allHashtags)];
}

/**
 * GET /api/sns/auto-text?manga_id=xxx
 * 指定漫画の自動生成投稿テキストとハッシュタグを返す
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const manga_id = searchParams.get("manga_id");

    if (!manga_id) {
      return NextResponse.json(
        { error: "manga_id は必須です" },
        { status: 400 }
      );
    }

    const manga = await prisma.manga.findUnique({
      where: { id: manga_id },
      select: {
        id: true,
        title: true,
        description: true,
        genre: true,
        tags: true,
      },
    });

    if (!manga) {
      return NextResponse.json(
        { error: `manga_id: ${manga_id} が見つかりません` },
        { status: 404 }
      );
    }

    const text = generatePostText(manga);
    const hashtags = generateHashtags(manga);

    return NextResponse.json({
      text,
      hashtags,
      preview: `${text}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`,
    });
  } catch (error) {
    console.error("[sns/auto-text] エラー:", error);
    return NextResponse.json(
      { error: "テキスト生成に失敗しました" },
      { status: 500 }
    );
  }
}
