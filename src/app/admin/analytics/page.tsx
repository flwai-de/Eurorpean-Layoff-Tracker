export default function AnalyticsPage() {
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;
  const shareId = process.env.NEXT_PUBLIC_UMAMI_SHARE_ID;

  if (!umamiUrl || !shareId) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Analytics</h1>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-8 text-center">
          <p className="text-neutral-400">
            Analytics is not configured yet.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Set <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_UMAMI_URL</code> and{" "}
            <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_UMAMI_SHARE_ID</code> in
            your environment variables.
          </p>
          <a
            href="https://umami.is/docs/share-url"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-teal-400 hover:underline"
          >
            Umami Share URL Documentation &rarr;
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Analytics</h1>
      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <iframe
          src={`${umamiUrl}/share/${shareId}`}
          className="h-[calc(100vh-12rem)] w-full border-0 bg-white"
          title="Umami Analytics"
        />
      </div>
    </div>
  );
}
