import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCreatorRevenue, getRevenueHistory, REVENUE_PAYOUT_DAY } from "@/lib/revenue";
import { RevenueCard } from "@/components/revenue/RevenueCard";
import { RevenueChart } from "@/components/revenue/RevenueChart";
import { formatDateTime } from "@/lib/utils";

export const metadata = {
  title: "収益管理 | Buzz Comic",
};

// Revenue type labels
const TYPE_LABELS: Record<string, string> = {
  ad_view: "広告収益",
  tip: "チップ",
  subscription_share: "サブスク分配",
};

export default async function DashboardRevenuePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [stats, history] = await Promise.all([
    getCreatorRevenue(session.user.id),
    getRevenueHistory(session.user.id, 1, 20),
  ]);

  const chartData = stats.byManga.slice(0, 10).map((m) => ({
    label: m.mangaTitle,
    value: m.revenue,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          収益管理
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          収益は毎月 <strong>{REVENUE_PAYOUT_DAY}日</strong> に振り込まれます
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <RevenueCard
          label="今月の収益"
          amount={stats.currentMonthRevenue}
          previousAmount={stats.previousMonthRevenue}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <RevenueCard
          label="前月の収益"
          amount={stats.previousMonthRevenue}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          }
        />
        <RevenueCard
          label="累計収益"
          amount={stats.totalRevenue}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
            </svg>
          }
        />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <RevenueChart
          data={chartData}
          title="漫画別収益（上位10作品）"
          className="mb-8"
        />
      )}

      {/* Manga table */}
      {stats.byManga.length > 0 && (
        <div className="mb-8 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              漫画別収益
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-5 py-3 font-medium">タイトル</th>
                  <th className="px-5 py-3 font-medium text-right">ビュー数</th>
                  <th className="px-5 py-3 font-medium text-right">収益</th>
                </tr>
              </thead>
              <tbody>
                {stats.byManga.map((m) => (
                  <tr
                    key={m.mangaId}
                    className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                  >
                    <td className="max-w-xs truncate px-5 py-3 font-medium text-zinc-800 dark:text-zinc-100">
                      {m.mangaTitle}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-500 dark:text-zinc-400">
                      {m.totalViews.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
                      ¥{m.revenue.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History table */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            収益履歴
          </h2>
        </div>
        {history.items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">
            収益履歴がありません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-5 py-3 font-medium">日時</th>
                  <th className="px-5 py-3 font-medium">漫画</th>
                  <th className="px-5 py-3 font-medium">種別</th>
                  <th className="px-5 py-3 font-medium">説明</th>
                  <th className="px-5 py-3 font-medium text-right">金額</th>
                </tr>
              </thead>
              <tbody>
                {history.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-zinc-500 dark:text-zinc-400">
                      {formatDateTime(item.recordedAt)}
                    </td>
                    <td className="max-w-[200px] truncate px-5 py-3 text-zinc-700 dark:text-zinc-300">
                      {item.manga.title}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                        {TYPE_LABELS[item.type] ?? item.type}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-5 py-3 text-zinc-500 dark:text-zinc-400">
                      {item.description ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      +¥{item.amount.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {history.totalPages > 1 && (
          <p className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-400 dark:border-zinc-800">
            全 {history.total} 件中 {history.items.length} 件表示
          </p>
        )}
      </div>
    </div>
  );
}
