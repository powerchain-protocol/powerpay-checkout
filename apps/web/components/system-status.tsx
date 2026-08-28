"use client";

import { Activity, CircleAlert, LoaderCircle, PauseCircle } from "lucide-react";
import { useSystemHealth } from "@/context/system-health-context";

export function SystemStatus() {
  const health = useSystemHealth();

  const copy = health.loading && health.status === "unknown"
    ? { label: "Checking", tone: "checking", Icon: LoaderCircle }
    : health.status === "operational"
      ? { label: "Operational", tone: "ok", Icon: Activity }
      : health.status === "paused"
        ? { label: "Sale paused", tone: "paused", Icon: PauseCircle }
        : { label: "Needs attention", tone: "warn", Icon: CircleAlert };

  const title = [
    health.error,
    health.rpcSlot != null ? `RPC slot ${health.rpcSlot}` : null,
    health.rpcLatencyMs != null ? `RPC ${health.rpcLatencyMs}ms` : null,
    health.saleEnabled != null ? `Sale ${health.saleEnabled ? "enabled" : "disabled"}` : null,
    health.inventoryAvailable != null ? `Inventory ${health.inventoryAvailable ? "available" : "empty/unreadable"}` : null,
  ].filter(Boolean).join(" · ");

  const StatusIcon = copy.Icon;

  return (
    <button
      type="button"
      className={`system-status ${copy.tone}`}
      onClick={() => void health.refresh()}
      title={title || "Refresh PowerPay network health"}
      aria-label={`${copy.label}. Refresh PowerPay network health.`}
      aria-busy={health.loading}
    >
      <StatusIcon size={14} className={health.loading ? "spin" : undefined} />
      <span>{copy.label}</span>
    </button>
  );
}
