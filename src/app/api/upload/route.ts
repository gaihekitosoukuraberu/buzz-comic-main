import { NextRequest, NextResponse } from "next/server";
import { saveImage, UploadType } from "@/lib/storage";
import { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } from "@/lib/constants";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const mangaId = formData.get("manga_id") as string | null;
    const type = formData.get("type") as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json({ error: "ファイルが指定されていません" }, { status: 400 });
    }
    if (!mangaId) {
      return NextResponse.json({ error: "manga_id が指定されていません" }, { status: 400 });
    }
    if (!type || (type !== "panel" && type !== "cover")) {
      return NextResponse.json(
        { error: "type は panel または cover を指定してください" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "jpg/png/webp のみアップロード可能です" },
        { status: 400 }
      );
    }

    // Validate file size (50MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `ファイルサイズは ${MAX_FILE_SIZE / 1024 / 1024}MB 以下にしてください` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await saveImage(buffer, file.name, mangaId, type as UploadType);

    return NextResponse.json({
      url: stored.url,
      width: stored.width,
      height: stored.height,
    });
  } catch (error) {
    console.error("[upload] error:", error);
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 });
  }
}
