import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useLocalStorageState } from "../hooks/useLocalStorageState";

type OrderState = {
  orderId?: string;
  token?: number;
};

type LastOrder = {
  id: string;
  token: number;
  scheduledFor: string;
};

type Props = {
  roleLabel: string;
  ordersPath: string;
  storageKey: string;
};

export function OrderConfirmScreen(props: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as OrderState | null) ?? null;

  const [lastOrder] = useLocalStorageState<LastOrder | null>(props.storageKey, null);
  const token = state?.token ?? lastOrder?.token ?? null;

  return (
    <div className="confirm-shell">
      <div className="card confirm-card">
        <div className="confirm-title">{props.roleLabel} order received</div>
        <div className="confirm-sub">Please confirm once you have collected your order.</div>
        <div className="confirm-token">Token {token ?? "--"}</div>
        <button
          type="button"
          className="btn primary block"
          onClick={() => {
            toast.success("Order received. Enjoy your meal!", { duration: 2400 });
            navigate(props.ordersPath, { replace: true });
          }}
        >
          Confirm order received
        </button>
      </div>
    </div>
  );
}
