import { OrderWaitingScreen } from "../../components/OrderWaitingScreen";

export function TeacherOrderWaitingPage() {
  return (
    <OrderWaitingScreen
      roleLabel="Teacher"
      confirmPath="/teacher/order-received"
      ordersPath="/teacher/orders"
      storageKey="last_order_teacher_v1"
    />
  );
}
