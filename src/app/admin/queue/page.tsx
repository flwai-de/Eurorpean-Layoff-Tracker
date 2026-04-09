export default function QueuePage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Queue Monitor</h1>
      <p className="mb-4 text-sm text-neutral-400">
        Bull Board dashboard — view jobs, retry failures, and monitor all queues.
      </p>
      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <iframe
          src="/api/admin/queue/queue"
          className="h-[calc(100vh-12rem)] w-full border-0 bg-white"
          title="Bull Board"
        />
      </div>
    </div>
  );
}
