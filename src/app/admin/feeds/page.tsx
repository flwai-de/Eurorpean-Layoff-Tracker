import { getFeeds, createFeed } from "@/actions/feeds";
import FeedList from "./feed-list";

export default async function FeedsPage() {
  const result = await getFeeds();

  if (!result.success || !result.data) {
    return <p className="text-red-400">Failed to load feeds.</p>;
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold">RSS Feeds</h1>

      {/* Add Feed Form */}
      <FeedForm />

      {/* Feed List */}
      <div className="mt-8">
        <FeedList feeds={result.data} />
      </div>
    </div>
  );
}

async function FeedForm() {
  async function handleCreate(formData: FormData) {
    "use server";
    await createFeed(formData);
  }

  return (
    <form action={handleCreate} className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-4 text-lg font-semibold">Add New Feed</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-sm text-neutral-400">Name *</span>
          <input
            name="name"
            required
            placeholder="e.g. TechCrunch Layoffs"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-neutral-400">URL *</span>
          <input
            name="url"
            type="url"
            required
            placeholder="https://example.com/feed.xml"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-neutral-400">Language *</span>
          <select
            name="language"
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none"
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-neutral-400">Category *</span>
          <select
            name="category"
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none"
          >
            <option value="tech">Tech</option>
            <option value="industry">Industry</option>
            <option value="finance">Finance</option>
            <option value="general">General</option>
            <option value="startup">Startup</option>
          </select>
        </label>
      </div>
      <button
        type="submit"
        className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
      >
        Add Feed
      </button>
    </form>
  );
}
