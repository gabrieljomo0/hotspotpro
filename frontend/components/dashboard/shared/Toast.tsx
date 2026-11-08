"use client";

export function Toast({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 rounded-xl bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white shadow-2xl">
      {message}
    </div>
  );
}
