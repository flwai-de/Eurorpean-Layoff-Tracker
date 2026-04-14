import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { verifyLayoff, rejectLayoff } from "@/actions/layoffs";
import {
  getOverviewStats,
  getViewStats,
  getTopLayoffsByViews,
  getSubscriberStats,
  getNewsletterStats,
  getUnverifiedLayoffs,
  getPipelineStats,
  getRecentActivity,
} from "@/lib/queries/admin-dashboard";
import { percentChange, timeAgo } from "@/lib/utils/time";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session) redirect("/admin/login");

  const [
    stats,
    viewStats,
    topLayoffs,
    subscriberStats,
    newsletterStats,
    unverifiedLayoffs,
    pipelineStats,
    recentActivity,
  ] = await Promise.all([
    getOverviewStats(),
    getViewStats(),
    getTopLayoffsByViews(),
    getSubscriberStats(),
    getNewsletterStats(),
    getUnverifiedLayoffs(),
    getPipelineStats(),
    getRecentActivity(),
  ]);

  const feedUptimePct =
    pipelineStats.totalFeedsCount > 0
      ? ((pipelineStats.totalFeedsCount - pipelineStats.feedErrorsLast7d) /
          pipelineStats.totalFeedsCount) *
        100
      : 100;
  const feedsActivePct =
    pipelineStats.totalFeedsCount > 0
      ? (pipelineStats.activeFeedsCount / pipelineStats.totalFeedsCount) * 100
      : 0;
  const aiRelevancePct =
    pipelineStats.articlesToday > 0
      ? (pipelineStats.relevantToday / pipelineStats.articlesToday) * 100
      : 0;

  const deLangPct =
    subscriberStats.active > 0
      ? (subscriberStats.languageSplit.de / subscriberStats.active) * 100
      : 0;
  const enLangPct =
    subscriberStats.active > 0
      ? (subscriberStats.languageSplit.en / subscriberStats.active) * 100
      : 0;

  const layoffDelta = percentChange(stats.layoffsThisYear, stats.layoffsLastYear);
  const affectedDelta = percentChange(stats.affectedThisYear, stats.affectedLastYear);

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-medium">Dashboard</h1>
          <p className="text-[12px] text-neutral-500 mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/layoffs/new"
            className="px-3 py-1.5 rounded-lg bg-white text-neutral-900 text-[12px] font-medium hover:bg-neutral-200 transition"
          >
            + New layoff
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total Layoffs"
          value={stats.totalLayoffs.toLocaleString()}
          delta={`${layoffDelta.value} vs. last year`}
          deltaPositive={layoffDelta.positive}
        />
        <StatCard
          label="People Affected"
          value={stats.totalAffected.toLocaleString()}
          delta={`${affectedDelta.value} vs. last year`}
          deltaPositive={affectedDelta.positive}
        />
        <StatCard
          label="Unverified"
          value={stats.unverifiedCount.toString()}
          delta="awaiting review"
          highlight={stats.unverifiedCount > 0 ? "amber" : "default"}
        />
        <StatCard
          label="Companies"
          value={stats.companiesTracked.toLocaleString()}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <div className="bg-neutral-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-medium">Content views</p>
            <span className="text-[11px] text-neutral-600">via layoff_views</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <MiniStat label="Today" value={viewStats.today} />
            <MiniStat label="This week" value={viewStats.thisWeek} />
            <MiniStat label="This month" value={viewStats.thisMonth} />
          </div>

          <div>
            <p className="text-[11px] text-neutral-500 mb-2">Top viewed layoffs (30d)</p>
            {topLayoffs.length === 0 ? (
              <p className="text-[12px] text-neutral-600">No view data yet</p>
            ) : (
              topLayoffs.map((layoff) => (
                <div
                  key={layoff.id}
                  className="flex justify-between py-1.5 text-[12px]"
                >
                  <span className="text-neutral-400 truncate mr-4">
                    {layoff.companyName}
                  </span>
                  <span className="text-white font-medium flex-shrink-0">
                    {layoff.totalViews.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-neutral-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-medium">Subscribers</p>
            <span className="text-[11px] text-neutral-600">newsletter</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-neutral-800/50 rounded-lg p-3">
              <p className="text-[11px] text-neutral-500">Active</p>
              <p className="text-[18px] font-medium text-emerald-400 mt-1">
                {subscriberStats.active}
              </p>
              {subscriberStats.newThisMonth > 0 && (
                <p className="text-[11px] text-emerald-400 mt-1">
                  +{subscriberStats.newThisMonth} this month
                </p>
              )}
            </div>
            <div className="bg-neutral-800/50 rounded-lg p-3">
              <p className="text-[11px] text-neutral-500">Pending</p>
              <p
                className={`text-[18px] font-medium mt-1 ${
                  subscriberStats.pending > 0 ? "text-amber-400" : "text-white"
                }`}
              >
                {subscriberStats.pending}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">not confirmed</p>
            </div>
            <div className="bg-neutral-800/50 rounded-lg p-3">
              <p className="text-[11px] text-neutral-500">Unsubscribed</p>
              <p className="text-[18px] font-medium mt-1">
                {subscriberStats.unsubscribed}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">all time</p>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex justify-between mb-1.5">
              <span className="text-[11px] text-neutral-500">Confirmation rate</span>
              <span className="text-[11px] font-medium">
                {subscriberStats.confirmationRate}%
              </span>
            </div>
            <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${subscriberStats.confirmationRate}%` }}
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between mb-1.5">
              <span className="text-[11px] text-neutral-500">Language split</span>
            </div>
            <div className="flex h-1 rounded-full overflow-hidden gap-0.5">
              {subscriberStats.active > 0 ? (
                <>
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${deLangPct}%` }}
                  />
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{ width: `${enLangPct}%` }}
                  />
                </>
              ) : (
                <div className="h-full bg-neutral-800 rounded-full w-full" />
              )}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[11px] text-neutral-500">
                DE {subscriberStats.languageSplit.de}
              </span>
              <span className="text-[11px] text-neutral-500">
                EN {subscriberStats.languageSplit.en}
              </span>
            </div>
          </div>

          <div className="border-t border-neutral-800/50 pt-3">
            <p className="text-[11px] text-neutral-500 mb-2">
              Last newsletter{" "}
              {newsletterStats.lastIssue ? `(#${newsletterStats.totalIssuesSent})` : ""}
            </p>
            {newsletterStats.lastIssue ? (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[13px] font-medium truncate">
                    {newsletterStats.lastIssue.recipientCount ?? 0}
                  </p>
                  <p className="text-[11px] text-neutral-500">Recipients</p>
                </div>
                <div>
                  <p className="text-[13px] font-medium truncate">
                    {newsletterStats.lastIssue.sentAt
                      ? new Date(newsletterStats.lastIssue.sentAt).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" },
                        )
                      : "—"}
                  </p>
                  <p className="text-[11px] text-neutral-500">Sent</p>
                </div>
                <div>
                  <p className="text-[13px] font-medium truncate">
                    {newsletterStats.totalIssuesSent}
                  </p>
                  <p className="text-[11px] text-neutral-500">Total issues</p>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-neutral-600">No newsletter sent yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3">
        <div className="bg-neutral-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-medium">Awaiting verification</p>
            <Link
              href="/admin/layoffs?status=unverified"
              className="text-[11px] text-neutral-500 hover:text-neutral-300 transition"
            >
              View all
            </Link>
          </div>

          {unverifiedLayoffs.length === 0 ? (
            <p className="text-[12px] text-neutral-600 py-4 text-center">
              All caught up — no unverified layoffs
            </p>
          ) : (
            unverifiedLayoffs.map((layoff, i) => (
              <div key={layoff.id}>
                {i > 0 && <div className="border-b border-neutral-800/30" />}
                <div className="flex items-center gap-3 py-3">
                  <div className="w-7 h-7 rounded-md bg-neutral-800 flex items-center justify-center flex-shrink-0 text-[11px] font-medium text-neutral-500">
                    {layoff.companyName.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-white truncate">
                      {layoff.titleEn || layoff.companyName}
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                      {layoff.industryNameEn} · {layoff.country} · via {layoff.source} ·{" "}
                      {timeAgo(layoff.createdAt)}
                    </p>
                  </div>

                  {layoff.affectedCount && (
                    <span className="text-[12px] font-medium text-red-400 flex-shrink-0 mr-2">
                      {layoff.affectedCount.toLocaleString()}
                    </span>
                  )}

                  <div className="flex gap-1.5 flex-shrink-0">
                    <form
                      action={async () => {
                        "use server";
                        await verifyLayoff(layoff.id);
                        revalidatePath("/admin");
                      }}
                    >
                      <button
                        type="submit"
                        className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/20 transition"
                      >
                        Verify
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await rejectLayoff(layoff.id);
                        revalidatePath("/admin");
                      }}
                    >
                      <button
                        type="submit"
                        className="px-2 py-1 rounded-md border border-neutral-800 text-neutral-500 text-[11px] hover:bg-neutral-800 hover:text-neutral-300 transition"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-neutral-900 rounded-xl p-4">
          <p className="text-[13px] font-medium mb-3">Pipeline health</p>

          <ProgressRow
            label="Feeds active"
            value={`${pipelineStats.activeFeedsCount}/${pipelineStats.totalFeedsCount}`}
            percent={feedsActivePct}
            color="bg-emerald-500"
          />

          <ProgressRow
            label="Feed uptime (7d)"
            value={`${Math.round(feedUptimePct)}%`}
            percent={feedUptimePct}
            color="bg-emerald-500"
          />

          <ProgressRow
            label="AI relevance rate"
            value={`${Math.round(aiRelevancePct)}%`}
            percent={aiRelevancePct}
            color="bg-amber-500"
          />

          <p className="text-[11px] text-neutral-600 mt-1">
            Last fetch:{" "}
            {pipelineStats.lastFetchedAt ? timeAgo(pipelineStats.lastFetchedAt) : "never"}
          </p>

          <div className="border-b border-neutral-800/50 my-4" />

          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-medium">Recent activity</p>
            <span className="text-[11px] text-neutral-600">Last 24h</span>
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-[12px] text-neutral-600">No recent activity</p>
          ) : (
            recentActivity.map((event, i) => (
              <div key={i} className="flex gap-2.5 mb-3 last:mb-0">
                <div
                  className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${activityDotColor(event.type)}`}
                />
                <div className="min-w-0">
                  <p className="text-[12px] text-neutral-300 truncate">{event.title}</p>
                  <p className="text-[11px] text-neutral-500 truncate">
                    {event.detail} · {timeAgo(event.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  percent,
  color,
}: {
  label: string;
  value: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-neutral-400">{label}</span>
        <span className="text-[11px] font-medium">{value}</span>
      </div>
      <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

function activityDotColor(type: string): string {
  switch (type) {
    case "verified":
      return "bg-emerald-500";
    case "rejected":
      return "bg-red-500";
    case "submission":
      return "bg-violet-500";
    case "feed_error":
      return "bg-red-500";
    case "subscriber":
      return "bg-emerald-500";
    default:
      return "bg-neutral-500";
  }
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-neutral-800/50 rounded-lg p-3">
      <p className="text-[11px] text-neutral-500">{label}</p>
      <p className="text-[18px] font-medium mt-1">{value.toLocaleString()}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  highlight,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  highlight?: "amber" | "default";
}) {
  const deltaColor =
    deltaPositive === undefined
      ? "text-neutral-500"
      : deltaPositive
        ? "text-emerald-400"
        : "text-red-400";

  return (
    <div className="bg-neutral-900 rounded-xl p-4">
      <p
        className={`text-[22px] font-medium ${
          highlight === "amber" ? "text-amber-400" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="text-[11px] text-neutral-500 mt-1">{label}</p>
      {delta && <p className={`text-[11px] mt-2 ${deltaColor}`}>{delta}</p>}
    </div>
  );
}
