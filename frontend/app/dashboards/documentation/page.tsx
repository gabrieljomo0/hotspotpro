"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search, ChevronRight } from "lucide-react";

import { BackLink } from "@/components/dashboard/shared/BackLink";
import { DOCUMENTATION } from "@/components/dashboard/documentation/documentationContent";

export default function DocumentationPage() {
  const [query, setQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(DOCUMENTATION[0].id);

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return DOCUMENTATION;
    const q = query.toLowerCase();
    return DOCUMENTATION.map((category) => ({
      ...category,
      sections: category.sections.filter(
        (section) =>
          section.title.toLowerCase().includes(q) ||
          section.summary.toLowerCase().includes(q) ||
          section.points.some((p) => p.toLowerCase().includes(q)) ||
          category.title.toLowerCase().includes(q),
      ),
    })).filter((category) => category.sections.length > 0);
  }, [query]);

  const activeCategory =
    filteredCategories.find((c) => c.id === activeCategoryId) ?? filteredCategories[0];

  return (
    <section className="w-full">
      <BackLink />
      <div className="mb-6">
        <h2 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight md:text-4xl">
          <BookOpen className="text-[#2563eb]" size={30} />
          Documentation
        </h2>
        <p className="max-w-2xl text-sm text-[#64748b] md:text-base">
          A complete reference for every part of HotspotPro — from your first
          login through routers, hotspot &amp; captive portal, agents,
          installers, payments, and settings.
        </p>
      </div>

      <div className="relative mb-5">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the documentation..."
          className="h-12 w-full rounded-xl border border-[#e2e8f0] bg-white pl-11 pr-4 text-sm outline-none focus:border-[#2563eb]"
        />
      </div>

      {filteredCategories.length === 0 ? (
        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-10 text-center text-sm text-[#94a3b8]">
          No documentation matches &quot;{query}&quot;.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <nav className="space-y-1 lg:sticky lg:top-4 lg:self-start">
            {filteredCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                  activeCategory?.id === category.id
                    ? "bg-[#f1f5f9] text-[#2563eb]"
                    : "text-[#475569] hover:bg-[#ffffff]"
                }`}
              >
                {category.title}
                <ChevronRight size={14} className={activeCategory?.id === category.id ? "opacity-100" : "opacity-0"} />
              </button>
            ))}
          </nav>

          {activeCategory && (
            <div className="space-y-5">
              <h3 className="text-2xl font-bold text-[#0f172a]">{activeCategory.title}</h3>
              {activeCategory.sections.map((section) => (
                <article
                  key={section.id}
                  className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_24px_rgba(37,99,235,0.06)]"
                >
                  <h4 className="mb-2 text-base font-bold text-[#0f172a]">{section.title}</h4>
                  <p className="mb-3 text-sm leading-6 text-[#475569]">{section.summary}</p>
                  {section.points.length > 0 && (
                    <ul className="space-y-1.5">
                      {section.points.map((point, index) => (
                        <li key={index} className="flex gap-2 text-sm leading-6 text-[#64748b]">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#94a3b8]" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
