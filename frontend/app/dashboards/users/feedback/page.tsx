"use client";

import { useState, type FormEvent } from "react";
import { MessageSquare, Star } from "lucide-react";

import { BackLink } from "@/components/dashboard/shared/BackLink";

type FeedbackEntry = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
};

const INITIAL_FEEDBACK: FeedbackEntry[] = [
  { id: "f1", customerName: "Ama Serwaa", rating: 5, comment: "Fast and reliable connection, great value!", date: "08 Sep 2026" },
  { id: "f2", customerName: "Kofi Owusu", rating: 3, comment: "Speed drops in the evenings.", date: "05 Sep 2026" },
  { id: "f3", customerName: "Efua Mensah", rating: 4, comment: "Good service, voucher purchase was easy.", date: "01 Sep 2026" },
];

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>(INITIAL_FEEDBACK);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const avgRating =
    feedback.reduce((sum, f) => sum + f.rating, 0) / (feedback.length || 1);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !comment.trim()) return;

    setFeedback((current) => [
      {
        id: `f-${Date.now()}`,
        customerName: name.trim(),
        rating,
        comment: comment.trim(),
        date: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      },
      ...current,
    ]);
    setName("");
    setComment("");
    setRating(5);
  }

  return (
    <section className="w-full">
      <BackLink />
      <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
        <MessageSquare className="text-[#2563eb]" size={30} />
        Feedback
      </h2>
      <p className="mb-6 max-w-2xl text-sm text-[#64748b] md:text-base">
        {feedback.length} review{feedback.length === 1 ? "" : "s"} · Average
        rating {avgRating.toFixed(1)} / 5
      </p>

      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
          <h3 className="mb-4 text-base font-bold">Log Feedback</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">
                Customer Name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-3 text-sm outline-none focus:border-[#2563eb]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">
                Rating
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    aria-label={`${value} star`}
                  >
                    <Star
                      size={22}
                      className={
                        value <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-[#e2e8f0]"
                      }
                    />
                  </button>
                ))}
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#475569]">
                Comment
              </span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563eb]"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
            >
              Add Feedback
            </button>
          </form>
        </article>

        <div className="space-y-3">
          {feedback.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(37,99,235,0.06)]"
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-[#0f172a]">
                  {entry.customerName}
                </p>
                <span className="text-xs text-[#94a3b8]">{entry.date}</span>
              </div>
              <div className="mt-1 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    size={14}
                    className={
                      value <= entry.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-[#e2e8f0]"
                    }
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-[#475569]">{entry.comment}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
