import { OrderConfirmScreen } from "../../components/OrderConfirmScreen";

export function StudentOrderConfirmPage() {
  return <OrderConfirmScreen roleLabel="Student" ordersPath="/student/orders" storageKey="last_order_student_v1" />;
}
