import { OrderWaitingScreen } from "../../components/OrderWaitingScreen";

export function StudentOrderWaitingPage() {
  return (
    <OrderWaitingScreen
      roleLabel="Student"
      confirmPath="/student/order-received"
      ordersPath="/student/orders"
      storageKey="last_order_student_v1"
    />
  );
}
