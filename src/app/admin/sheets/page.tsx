import SheetsSync from "@/components/admin/SheetsSync";

export const metadata = {
  title: "Sheets 連携 | Buzz Comic 管理",
  description: "Google Sheets との同期管理",
};

export default function AdminSheetsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Google Sheets 連携</h1>
        <p className="mt-1 text-sm text-gray-500">
          漫画データ・収益データ・ユーザーデータを Google Sheets に同期します。
          月次レポートの自動生成、審査待ち通知も設定できます。
        </p>
      </div>

      <SheetsSync />
    </div>
  );
}
