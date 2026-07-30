import { OrderConfirmScreen } from "../../components/OrderConfirmScreen";

export function TeacherOrderConfirmPage() {
  return <OrderConfirmScreen roleLabel="Teacher" ordersPath="/teacher/orders" storageKey="last_order_teacher_v1" />;
}
