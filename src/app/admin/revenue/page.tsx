import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSiteRevenueSummary } from "@/lib/revenue";
import { RevenueCard } from "@/components/revenue/RevenueCard";
import { AdminRevenueActions } from "./AdminRevenueActions";

export const metadata = {
  title: "収益管理（管理者）| Buzz Comic",
};

export default async function AdminRevenuePage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/login");
  }

  const summary = await getSiteRevenueSummary();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          収益管理（管理者）
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          全クリエイターの収益を管理します
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <RevenueCard
          label="今月の総収益"
          amount={summary.currentMonthRevenue}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
        <RevenueCard
          label="累計収益"
          amount={summary.totalRevenue}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
            </svg>
          }
        />
        <RevenueCard
          label="収益クリエイター数"
          amount={summary.creatorCount}
          prefix=""
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          }
        />
      </div>

      {/* Actions */}
      <AdminRevenueActions />

      {/* Top creators */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            クリエイター収益ランキング
          </h2>
        </div>
        {summary.topCreators.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">
            収益データがありません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-5 py-3 font-medium">順位</th>
                  <th className="px-5 py-3 font-medium">クリエイター</th>
                  <th className="px-5 py-3 font-medium text-right">今月の収益</th>
                  <th className="px-5 py-3 font-medium text-right">累計収益</th>
                </tr>
              </thead>
              <tbody>
                {summary.topCreators.map((creator, idx) => (
                  <tr
                    key={creator.userId}
                    className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-5 py-3 text-zinc-400 dark:text-zinc-500">
                      #{idx + 1}
                    </td>
                    <td className="px-5 py-3 font-medium text-zinc-800 dark:text-zinc-100">
                      {creator.userName ?? creator.userId}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      ¥{creator.currentMonthRevenue.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-700 dark:text-zinc-300">
                      ¥{creator.totalRevenue.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
