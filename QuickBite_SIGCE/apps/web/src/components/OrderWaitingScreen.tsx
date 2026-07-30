import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../api/client";
import { useLocalStorageState } from "../hooks/useLocalStorageState";

type Order = {
  id: string;
  token: number;
  status: string;
  scheduledFor: string;
};

type OrderState = {
  orderId?: string;
  token?: number;
  scheduledFor?: string;
};

type LastOrder = {
  id: string;
  token: number;
  scheduledFor: string;
};

type Props = {
  roleLabel: string;
  confirmPath: string;
  ordersPath: string;
  storageKey: string;
};

export function OrderWaitingScreen(props: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as OrderState | null) ?? null;

  const [lastOrder] = useLocalStorageState<LastOrder | null>(props.storageKey, null);
  const orderId = state?.orderId || lastOrder?.id;

  const ordersQuery = useQuery({
    queryKey: ["myOrders"],
    queryFn: () => apiFetch<{ orders: Order[] }>("/api/orders/my"),
    refetchInterval: 10_000,
    enabled: !state?.token
  });

  const queriedOrder = useMemo(() => {
    if (!ordersQuery.data?.orders?.length) return null;
    if (orderId) return ordersQuery.data.orders.find((o) => o.id === orderId) ?? null;
    return ordersQuery.data.orders[0] ?? null;
  }, [ordersQuery.data, orderId]);

  const token = state?.token ?? queriedOrder?.token ?? lastOrder?.token ?? null;
  const scheduledFor = state?.scheduledFor ?? queriedOrder?.scheduledFor ?? lastOrder?.scheduledFor ?? null;
  const status = queriedOrder?.status ?? null;

  return (
    <div className="waiting-shell">
      <div className="waiting-hero">
        <div className="waiting-copy">
          <div className="token-card">
            <div className="token-label">TOKEN</div>
            <div className="token-value">{token ?? "--"}</div>
            <div className="token-sub">
              {scheduledFor
                ? `Pickup window ${new Date(scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Your pickup window will appear here."}
            </div>
            {status ? <div className={`badge ${status === "READY" ? "ok" : status === "CANCELLED" ? "danger" : "warn"}`}>{status}</div> : null}
          </div>

          <div className="waiting-status">
            <div className="waiting-title">{props.roleLabel} order is in the queue</div>
            <div className="waiting-sub">We will alert you when your token is called. Keep this screen open.</div>
          </div>

          <div className="waiting-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() =>
                navigate(props.confirmPath, {
                  state: {
                    orderId: orderId ?? undefined,
                    token: token ?? undefined
                  }
                })
              }
            >
              Go to order received screen
            </button>
            <button type="button" className="btn" onClick={() => navigate(props.ordersPath)}>
              View my orders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
