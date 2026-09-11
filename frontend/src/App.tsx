import { Routes, Route } from "react-router-dom";
import { JoinPage } from "./pages/JoinPage";
import { TableLobbyPage } from "./pages/TableLobbyPage";
import { MenuPage } from "./pages/MenuPage";
import { CartPage } from "./pages/CartPage";
import { OrdersPage } from "./pages/OrdersPage";
import { BillPage } from "./pages/BillPage";
import { SharedItemsPage } from "./pages/SharedItemsPage";
import { StaffLoginPage } from "./pages/staff/StaffLoginPage";
import { StaffDashboardPage } from "./pages/staff/StaffDashboardPage";
import { StaffTableDetailPage } from "./pages/staff/StaffTableDetailPage";
import { StaffOrdersPage } from "./pages/staff/StaffOrdersPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminMenuPage } from "./pages/admin/AdminMenuPage";
import { AdminStaffPage } from "./pages/admin/AdminStaffPage";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage";

/** Uygulamanın kök route tanımları. */
function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-neutral-900">Split 🍽️</h1>
        <p className="mt-2 text-neutral-500">
          Masaya katılmak için QR kodu okutun.
        </p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/join/:tableToken" element={<JoinPage />} />
      <Route path="/table/:tableToken" element={<TableLobbyPage />} />
      <Route path="/table/:tableToken/menu" element={<MenuPage />} />
      <Route path="/table/:tableToken/cart" element={<CartPage />} />
      <Route path="/table/:tableToken/orders" element={<OrdersPage />} />
      <Route path="/table/:tableToken/bill" element={<BillPage />} />
      <Route path="/table/:tableToken/shared-items" element={<SharedItemsPage />} />

      <Route path="/staff/login" element={<StaffLoginPage />} />
      <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
      <Route path="/staff/tables/:id" element={<StaffTableDetailPage />} />
      <Route path="/staff/orders" element={<StaffOrdersPage />} />

      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/admin/menu" element={<AdminMenuPage />} />
      <Route path="/admin/staff" element={<AdminStaffPage />} />
      <Route path="/admin/settings" element={<AdminSettingsPage />} />
    </Routes>
  );
}

export default App;
