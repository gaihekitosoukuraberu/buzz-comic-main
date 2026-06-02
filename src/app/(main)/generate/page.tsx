import type { Metadata } from "next";
import GenerateForm from "@/components/generate/GenerateForm";

export const metadata: Metadata = {
  title: "AI生成 | Buzz Comic",
  description:
    "FLUX.2 ローカルAIでオリジナル漫画パネルを生成します。プロンプトを入力してアニメ・リアル・モノクロスタイルの画像を作成できます。",
};

export default function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ manga_id?: string }>;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-10 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          AI画像生成
        </h1>
        <p className="text-base text-zinc-500">
          FLUX.2 ローカルモデルを使ってオリジナルの漫画パネルを生成します。
          ComfyUI が未起動の場合はモックモードで動作します。
        </p>

        {/* Model info badge */}
        <div className="flex items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            FLUX.2 (ローカル生成)
          </span>
          <span className="text-xs text-zinc-400">外部API課金ゼロ</span>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <GenerateFormWrapper searchParams={searchParams} />
      </div>

      {/* Tips */}
      <div className="mt-8 rounded-xl bg-zinc-50 p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">
          プロンプトのコツ
        </h2>
        <ul className="space-y-1.5 text-sm text-zinc-500">
          <li>・ シーン・キャラクター・雰囲気を具体的に記述する</li>
          <li>・ 「夜景」「学校」などの場所を含めると構図が安定する</li>
          <li>・ 「笑顔」「驚き」など感情表現を加えるとキャラが豊かになる</li>
          <li>・ スタイル設定はプロンプトに自動で適用されます</li>
        </ul>
      </div>
    </div>
  );
}

// Separate async wrapper to resolve searchParams
async function GenerateFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ manga_id?: string }>;
}) {
  const params = await searchParams;
  return <GenerateForm mangaId={params.manga_id} />;
}
