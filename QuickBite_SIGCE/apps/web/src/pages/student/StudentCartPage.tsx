import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { apiFetch, formatINR, ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useGeoLocation } from "../../hooks/useGeoLocation";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";

type CartItem = { id: string; name: string; category: string; pricePaise: number; quantity: number };
type LastOrder = { id: string; token: number; scheduledFor: string };
type SlotsResponse = {
  now: string;
  pickup: Array<{ start: string; slotKey: string; remaining: number }>;
  staffRoomLunch: Array<{ start: string; slotKey: string; remaining: number }>;
};

type PointsBalanceResponse = {
  points: number;
  pointValuePaise: number;
};

export function StudentCartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const geofenceEnabled = String(import.meta.env.VITE_ENFORCE_GEOFENCE) === "true";
  const geo = useGeoLocation(geofenceEnabled);
  const razorpayEnabled = String(import.meta.env.VITE_RAZORPAY_ENABLED) === "true";

  const [cart, setCart] = useLocalStorageState<{ items: CartItem[] }>("cart_student_v1", { items: [] });
  const [, setLastOrder] = useLocalStorageState<LastOrder | null>("last_order_student_v1", null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "RAZORPAY">("CASH");
  const [slotStart, setSlotStart] = useState<string>("");
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confettiOn, setConfettiOn] = useState(false);
  const confettiTimer = useRef<number | undefined>(undefined);
  const redirectTimer = useRef<number | undefined>(undefined);

  const slotsQuery = useQuery({
    queryKey: ["slots"],
    queryFn: () => apiFetch<SlotsResponse>("/api/slots")
  });

  const pointsQuery = useQuery({
    queryKey: ["pointsBalance"],
    queryFn: () => apiFetch<PointsBalanceResponse>("/api/points/balance")
  });

  const totalPaise = useMemo(() => cart.items.reduce((sum, it) => sum + it.pricePaise * it.quantity, 0), [cart.items]);
  const itemCount = useMemo(() => cart.items.reduce((sum, it) => sum + it.quantity, 0), [cart.items]);
  const pointValuePaise = pointsQuery.data?.pointValuePaise ?? 100;
  const availablePoints = pointsQuery.data?.points ?? 0;
  const maxRedeemablePoints = Math.min(availablePoints, Math.floor(totalPaise / pointValuePaise));
  const appliedPoints = Math.min(redeemPoints, maxRedeemablePoints);
  const discountPaise = appliedPoints * pointValuePaise;
  const netTotalPaise = Math.max(0, totalPaise - discountPaise);

  const confettiPieces = useMemo(
    () => {
      const colors = ["#22c55e", "#f59e0b", "#3b82f6", "#ef4444", "#14b8a6"];
      return Array.from({ length: 24 }, (_, i) => ({
        left: `${(i * 100) / 24}%`,
        delay: `${(i % 6) * 0.08}s`,
        duration: `${1.2 + (i % 5) * 0.15}s`,
        rotate: `${(i * 37) % 360}deg`,
        color: colors[i % colors.length]
      }));
    },
    []
  );

  const availableSlots = (slotsQuery.data?.pickup || []).filter((s) => s.remaining > 0);
  const selectedSlot = availableSlots.find((s) => s.start === slotStart) ?? availableSlots[0];

  useEffect(() => {
    if (!slotStart && availableSlots.length) {
      setSlotStart(availableSlots[0].start);
    }
  }, [availableSlots, slotStart]);

  useEffect(() => {
    if (!razorpayEnabled && paymentMethod === "RAZORPAY") {
      setPaymentMethod("CASH");
    }
  }, [paymentMethod, razorpayEnabled]);

  useEffect(() => {
    if (redeemPoints > maxRedeemablePoints) {
      setRedeemPoints(maxRedeemablePoints);
    }
  }, [redeemPoints, maxRedeemablePoints]);

  useEffect(
    () => () => {
      window.clearTimeout(confettiTimer.current);
      window.clearTimeout(redirectTimer.current);
    },
    []
  );

  const triggerConfetti = () => {
    setConfettiOn(true);
    window.clearTimeout(confettiTimer.current);
    confettiTimer.current = window.setTimeout(() => setConfettiOn(false), 2200);
  };

  return (
    <div className="stack">
      {confettiOn ? (
        <div className="confetti" aria-hidden="true">
          {confettiPieces.map((piece, idx) => (
            <span
              key={idx}
              className="confetti-piece"
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                animationDuration: piece.duration,
                transform: `rotate(${piece.rotate})`,
                backgroundColor: piece.color
              }}
            />
          ))}
        </div>
      ) : null}
      <div className="card">
        <h1 className="h1">Cart</h1>
        {cart.items.length === 0 ? <p className="muted">Your cart is empty.</p> : null}
      </div>

      {cart.items.length ? (
        <div className="card">
          <div className="stack">
            {cart.items.map((it) => (
              <div key={it.id} className="row row-between">
                <div>
                  <div className="item-title">{it.name}</div>
                  <div className="muted">
                    {it.category} · {formatINR(it.pricePaise)}
                  </div>
                </div>
                <div className="row">
                  <button className="btn" onClick={() => setCart({ items: cart.items.filter((x) => x.id !== it.id) })}>
                    Remove
                  </button>
                  <button
                    className="btn"
                    onClick={() =>
                      setCart({
                        items: cart.items.map((x) => (x.id === it.id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))
                      })
                    }
                  >
                    -
                  </button>
                  <div className="qty">{it.quantity}</div>
                  <button
                    className="btn"
                    onClick={() => setCart({ items: cart.items.map((x) => (x.id === it.id ? { ...x, quantity: x.quantity + 1 } : x)) })}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <div className="row row-between">
              <div className="muted">Subtotal</div>
              <div className="price">{formatINR(totalPaise)}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card">
        <h2 className="h2">Pickup Slot</h2>
        <p className="muted">We preselect the earliest available slot.</p>
        {slotsQuery.isLoading ? <div className="muted">Loading slots…</div> : null}
        {slotsQuery.isError ? <div className="notice danger">Failed to load slots.</div> : null}
        {!slotsQuery.isLoading && !slotsQuery.isError && selectedSlot ? (
          <div className="notice">
            Pickup at {new Date(selectedSlot.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Remaining {selectedSlot.remaining}
          </div>
        ) : null}
        {!slotsQuery.isLoading && !slotsQuery.isError && !selectedSlot ? (
          <div className="hint danger">No slots available.</div>
        ) : null}
      </div>

      <div className="card">
        <h2 className="h2">Rewards</h2>
        {pointsQuery.isLoading ? <div className="muted">Loading points…</div> : null}
        {pointsQuery.isError ? <div className="notice danger">Failed to load points.</div> : null}
        {!pointsQuery.isLoading && !pointsQuery.isError ? (
          <div className="stack">
            <div className="row row-between">
              <div>
                <div className="item-title">Available points</div>
                <div className="muted">
                  {availablePoints} points · 1 point = {formatINR(pointValuePaise)}
                </div>
              </div>
              <button
                type="button"
                className="btn small"
                disabled={!maxRedeemablePoints || !cart.items.length}
                onClick={() => setRedeemPoints(maxRedeemablePoints)}
              >
                Use max
              </button>
            </div>
            <div className="field">
              <label>Redeem points</label>
              <input
                type="number"
                min={0}
                max={maxRedeemablePoints}
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(Math.max(0, Number(e.target.value)))}
                disabled={!cart.items.length}
              />
              <div className="muted">Up to {maxRedeemablePoints} points on this order.</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h2 className="h2">Payment</h2>
        <div className="row">
          <button
            type="button"
            className={`btn payment-toggle ${paymentMethod === "CASH" ? "primary" : ""}`}
            aria-pressed={paymentMethod === "CASH"}
            onClick={() => setPaymentMethod("CASH")}
          >
            Cash
          </button>
          <button
            type="button"
            className={`btn payment-toggle ${paymentMethod === "RAZORPAY" ? "primary" : ""}`}
            aria-pressed={paymentMethod === "RAZORPAY"}
            disabled={!razorpayEnabled}
            onClick={() => setPaymentMethod("RAZORPAY")}
          >
            Online
          </button>
        </div>

        {!razorpayEnabled ? <div className="notice warn">Online payment temporarily unavailable.</div> : null}

        {geofenceEnabled ? (
          <div className="notice warn">
            {geo.status === "ok" ? (
              <>Location captured (accuracy {Math.round(geo.accuracyMeters)}m).</>
            ) : geo.status === "loading" ? (
              <>Getting your location…</>
            ) : geo.status === "unsupported" ? (
              <>Your device does not support location. Orders may be blocked.</>
            ) : geo.status === "error" ? (
              <>Location error: {geo.message}</>
            ) : (
              <>Location is required inside canteen premises.</>
            )}
          </div>
        ) : null}

        {error ? <div className="notice danger">{error}</div> : null}

        <div className="order-cta">
          <div className="row row-between">
            <div>
              <div className="h3">Fast checkout</div>
              <div className="muted">{itemCount} items · Ready in minutes</div>
            </div>
            <div className="price">{formatINR(netTotalPaise)}</div>
          </div>
          <div className="stack mini">
            <div className="row row-between">
              <div className="muted">Subtotal</div>
              <div className="price">{formatINR(totalPaise)}</div>
            </div>
            {discountPaise > 0 ? (
              <div className="row row-between">
                <div className="muted">Points discount</div>
                <div className="price">- {formatINR(discountPaise)}</div>
              </div>
            ) : null}
            <div className="row row-between">
              <div className="muted">Total</div>
              <div className="price">{formatINR(netTotalPaise)}</div>
            </div>
          </div>
          <button
            className="btn primary block"
            disabled={busy || !cart.items.length || !slotStart}
            onClick={async () => {
              setError(null);
              setBusy(true);
              try {
                const onOrderSuccess = async (order: LastOrder) => {
                  setCart({ items: [] });
                  setRedeemPoints(0);
                  setLastOrder(order);
                  await queryClient.invalidateQueries({ queryKey: ["pointsBalance"] });
                  triggerConfetti();
                  toast.success("Order placed! Redirecting to your token...", {
                    duration: 3200,
                    style: { background: "#16a34a", color: "#fff", fontWeight: 600 }
                  });
                  window.clearTimeout(redirectTimer.current);
                  redirectTimer.current = window.setTimeout(() => {
                    navigate("/student/order-waiting", {
                      state: {
                        orderId: order.id,
                        token: order.token,
                        scheduledFor: order.scheduledFor
                      }
                    });
                  }, 3200);
                };
                const clientLocation = geo.status === "ok" ? { lat: geo.lat, lng: geo.lng } : undefined;

                const res = await apiFetch<any>("/api/orders", {
                  method: "POST",
                  body: JSON.stringify({
                    items: cart.items.map((it) => ({ menuItemId: it.id, quantity: it.quantity })),
                    paymentMethod,
                    fulfillment: "PICKUP",
                    scheduledFor: slotStart,
                    clientLocation,
                    redeemPoints: appliedPoints || undefined
                  })
                });

                if (res.razorpay) {
                  await openRazorpayCheckout({
                    keyId: res.razorpay.keyId,
                    orderId: res.razorpay.orderId,
                    amount: res.razorpay.amount,
                    currency: res.razorpay.currency,
                    name: user?.name || "SIGCE",
                    email: user?.email || "",
                    onSuccess: async (payload) => {
                      await apiFetch("/api/payments/razorpay/verify", {
                        method: "POST",
                        body: JSON.stringify({
                          orderId: res.order.id,
                          razorpayOrderId: payload.razorpay_order_id,
                          razorpayPaymentId: payload.razorpay_payment_id,
                          razorpaySignature: payload.razorpay_signature
                        })
                      });
                      await onOrderSuccess(res.order);
                    }
                  });
                } else {
                  await onOrderSuccess(res.order);
                }
              } catch (e: any) {
                setError(e instanceof ApiError ? e.message : "Failed to place order");
              } finally {
                setBusy(false);
              }
            }}
          >
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
}

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: any;
  }
}

async function loadRazorpayScript() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

async function openRazorpayCheckout(opts: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  email: string;
  onSuccess: (payload: RazorpaySuccess) => Promise<void>;
}) {
  await loadRazorpayScript();

  return new Promise<void>((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: opts.keyId,
      amount: opts.amount,
      currency: opts.currency,
      name: "SIGCE Canteen",
      description: "Canteen order",
      order_id: opts.orderId,
      prefill: { name: opts.name, email: opts.email },
      handler: async (response: RazorpaySuccess) => {
        try {
          await opts.onSuccess(response);
          resolve();
        } catch (e) {
          reject(e);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled"))
      }
    });
    rzp.open();
  });
}

