import { usePersistedState } from "./usePersistedState";
import { sym } from "@/components/dashboard/shared/currency";
import type { AgentCollection, CollectionMethod } from "../agents/agentLedger";

// The record of money collected from agents for vouchers they sold from stock
// you gave them. Saved, so it survives a reload and syncs across tabs.
export function useAgentCollectionsState(
  showToast: (message: string) => void,
  logActivity: (category: "Agent", message: string) => void,
  findAgentName: (agentId: string) => string | null,
) {
  const [agentCollections, setAgentCollections] = usePersistedState<AgentCollection[]>("agentCollections", []);

  function recordAgentCollection(input: {
    agentId: string;
    amount: number;
    method: CollectionMethod;
    collectedOnMs: number;
    reference: string;
    note: string;
  }): AgentCollection | null {
    const agentName = findAgentName(input.agentId);
    if (!agentName) {
      showToast("That agent no longer exists.");
      return null;
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      showToast("Enter an amount greater than 0.");
      return null;
    }

    const collection: AgentCollection = {
      id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      agentId: input.agentId,
      amount: Math.round(input.amount * 100) / 100,
      method: input.method,
      reference: input.reference.trim(),
      note: input.note.trim(),
      collectedOnMs: input.collectedOnMs,
      recordedBy: "Admin",
    };
    // Newest collection first.
    setAgentCollections((current) => [collection, ...current].sort((a, b) => b.collectedOnMs - a.collectedOnMs));
    showToast(
      `${sym()} ${collection.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} collected from ${agentName}.`,
    );
    logActivity(
      "Agent",
      `Recorded a ${sym()} ${collection.amount.toFixed(2)} collection (${collection.method}) from agent "${agentName}".`,
    );
    return collection;
  }

  function deleteAgentCollection(id: string) {
    const collection = agentCollections.find((c) => c.id === id);
    if (!collection) return;
    const agentName = findAgentName(collection.agentId) ?? "an agent";
    setAgentCollections((current) => current.filter((c) => c.id !== id));
    showToast("Collection removed.");
    logActivity(
      "Agent",
      `Removed a ${sym()} ${collection.amount.toFixed(2)} collection (${collection.method}) recorded for agent "${agentName}".`,
    );
  }

  return { agentCollections, recordAgentCollection, deleteAgentCollection };
}
