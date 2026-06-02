import JobMonitor from "@/components/admin/JobMonitor";

export const metadata = {
  title: "ジョブ監視 | Buzz Comic 管理",
};

export default function AdminJobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">ジョブ監視</h2>
        <p className="mt-1 text-sm text-gray-500">
          バックグラウンドジョブの状態を確認・管理します。5秒ごとに自動更新されます。
        </p>
      </div>

      <JobMonitor autoRefreshInterval={5000} />
    </div>
  );
}
