"use client";

// The pop-up that shows a router action while it runs: a circular
// percentage loader, then the result. Mounted once for the whole admin
// dashboard — any menu can start a task with startRouterTask().
// On success the popup shows the message briefly, then closes by itself (no Done click).

import { useEffect } from "react";
import { X } from "lucide-react";

import { useDashboard } from "@/components/dashboard/context/DashboardContext";
import { openReprovisionScript } from "@/components/dashboard/shared/editEvents";
import { ROUTER_TASKS } from "./routerTasks";

export function RouterTaskHost() {
  const { routerTask, confirmRouterTask, closeRouterTask, showToast } = useDashboard();

  useEffect(() => {
    if (!routerTask || routerTask.status !== "done") return;
    const def = ROUTER_TASKS[routerTask.kind];
    showToast(`${routerTask.name} ${def.success}`);
    const timer = window.setTimeout(() => closeRouterTask(), 2200);
    return () => window.clearTimeout(timer);
  }, [routerTask, closeRouterTask, showToast]);

  if (!routerTask) return null;

  const def = ROUTER_TASKS[routerTask.kind];
  const { status, doneCount, error, name, kind, ip } = routerTask;
  const total = def.steps.length;
  const percent = Math.round((doneCount / total) * 100);
  const waitingCheckIn = status === "running" && !!routerTask.jobId && doneCount < total - 1;
  const showPaste =
    status === "failed" && (kind === "full-provision" || kind === "update-script");

  return (
    <div
      data-testid="router-task"
      data-status={status}
      data-kind={routerTask.kind}
      role="dialog"
      aria-modal="true"
      aria-label={def.title}
      className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 p-4 print:hidden"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 data-testid="router-task-title" className="text-lg font-bold text-[#1a1a1a]">{def.title}</h3>
            <p className="text-xs text-[#737373]">{name}</p>
          </div>
          {status !== "running" && (
            <button
              type="button"
              aria-label="Close"
              data-testid="router-task-close"
              onClick={closeRouterTask}
              className="rounded-lg p-1.5 text-[#737373] hover:bg-[#f4f4f4]"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {status === "confirm" ? (
          <>
            <p className="mb-5 text-sm text-[#525252]">{def.confirm}</p>
            <div className="flex gap-3">
              <button
                type="button"
                data-testid="router-task-start"
                onClick={confirmRouterTask}
                className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
              >
                Start
              </button>
              <button
                type="button"
                data-testid="router-task-cancel"
                onClick={closeRouterTask}
                className="rounded-xl bg-[#f4f4f4] px-5 py-2.5 text-sm font-bold text-[#525252] hover:bg-[#e6e6e6]"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex flex-col items-center text-center">
              <div className="relative h-32 w-32">
                <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                  <circle cx="64" cy="64" r="54" fill="none" stroke="#e6e6e6" strokeWidth="10" />
                  <circle
                    data-testid="router-task-ring"
                    cx="64"
                    cy="64"
                    r="54"
                    fill="none"
                    stroke="#1a1a1a"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={2 * Math.PI * 54 * (1 - percent / 100)}
                    style={{ transition: "stroke-dashoffset 600ms ease" }}
                  />
                </svg>
                <span data-testid="router-task-percent" className="absolute inset-0 flex items-center justify-center text-2xl font-black text-[#1a1a1a]">
                  {percent}%
                </span>
              </div>
              <p data-testid="router-task-status" className="mt-3 text-sm font-semibold text-[#525252]">
                {status === "running" &&
                  (waitingCheckIn
                    ? "Waiting for the router to check in… (up to ~90s). If it stays here, use Paste script."
                    : routerTask.jobId
                      ? "Router is applying the setup…"
                      : "Sending to the router…")}
                {status === "done" && "Setup completed"}
                {status === "failed" && "Stopped"}
              </p>
              {status === "running" && doneCount > 0 && doneCount <= total && (
                <p className="mt-1 text-xs text-[#737373]">{def.steps[Math.min(doneCount, total) - 1]}</p>
              )}
            </div>

            {status === "done" && (
              <div data-testid="router-task-result" className="mb-4 rounded-lg bg-[#f4f4f4] p-3 text-sm text-[#1a1a1a]">
                <strong>{name}</strong> {def.success}
                <p className="mt-2 text-xs text-[#737373]">Closing automatically…</p>
              </div>
            )}
            {status === "failed" && (
              <div data-testid="router-task-error" className="mb-4 rounded-lg bg-[#f3f1ec] p-3 text-sm font-semibold text-[#1a1a1a]">
                {error}
              </div>
            )}

            {status === "failed" && (
              <div className="flex flex-wrap gap-3">
                {showPaste && (
                  <button
                    type="button"
                    data-testid="router-task-paste"
                    onClick={() => {
                      closeRouterTask();
                      openReprovisionScript(ip, "paste");
                    }}
                    className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
                  >
                    Paste script
                  </button>
                )}
                {!showPaste && (
                  <button
                    type="button"
                    data-testid="router-task-retry"
                    onClick={confirmRouterTask}
                    className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#111111]"
                  >
                    Try again
                  </button>
                )}
                <button
                  type="button"
                  data-testid="router-task-done"
                  onClick={closeRouterTask}
                  className="rounded-xl bg-[#f4f4f4] px-5 py-2.5 text-sm font-bold text-[#525252] hover:bg-[#e6e6e6]"
                >
                  Close
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
