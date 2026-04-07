"use client";

export default function SignOutButton() {
  return (
    <button
      onClick={() => { window.location.href = "/api/admin/signout"; }}
      className="w-full rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
    >
      Sign Out
    </button>
  );
}
