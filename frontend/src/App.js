import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "sonner";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Landing from "@/pages/Landing";

import AdminLayout from "@/layouts/AdminLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminOrders from "@/pages/admin/Orders";
import AdminDelivery from "@/pages/admin/Delivery";
import AdminDeliveryMap from "@/pages/admin/DeliveryMap";
import AdminCustomers from "@/pages/admin/Customers";
import AdminInvoices from "@/pages/admin/Invoices";
import AdminReports from "@/pages/admin/Reports";
import AdminSettings from "@/pages/admin/Settings";
import AdminComplaints from "@/pages/admin/Complaints";

import MobileLayout from "@/layouts/MobileLayout";
import ClientHome from "@/pages/client/Home";
import ClientPlaceOrder from "@/pages/client/PlaceOrder";
import ClientTrack from "@/pages/client/Track";
import ClientVerify from "@/pages/client/Verify";
import ClientInvoices from "@/pages/client/Invoices";
import ClientChat from "@/pages/client/Chat";
import ClientComplaints from "@/pages/client/Complaints";

import DeliveryTasks from "@/pages/delivery/Tasks";
import DeliveryPickup from "@/pages/delivery/PickupEntry";
import DeliveryDeliver from "@/pages/delivery/DeliveryConfirm";

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted2">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    const home = user.role === "admin" ? "/admin" : user.role === "delivery" ? "/delivery" : "/app";
    return <Navigate to={home} replace />;
  }
  return children ?? <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin */}
          <Route element={<Protected roles={["admin"]}><AdminLayout /></Protected>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/delivery" element={<AdminDelivery />} />
            <Route path="/admin/map" element={<AdminDeliveryMap />} />
            <Route path="/admin/customers" element={<AdminCustomers />} />
            <Route path="/admin/invoices" element={<AdminInvoices />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/complaints" element={<AdminComplaints />} />
          </Route>

          {/* Client mobile web */}
          <Route element={<Protected roles={["client"]}><MobileLayout audience="client" /></Protected>}>
            <Route path="/app" element={<ClientHome />} />
            <Route path="/app/order" element={<ClientPlaceOrder />} />
            <Route path="/app/orders/:id" element={<ClientTrack />} />
            <Route path="/app/orders/:id/verify" element={<ClientVerify />} />
            <Route path="/app/invoices" element={<ClientInvoices />} />
            <Route path="/app/chat" element={<ClientChat />} />
            <Route path="/app/complaints" element={<ClientComplaints />} />
          </Route>

          {/* Delivery mobile web */}
          <Route element={<Protected roles={["delivery"]}><MobileLayout audience="delivery" /></Protected>}>
            <Route path="/delivery" element={<DeliveryTasks />} />
            <Route path="/delivery/pickup/:id" element={<DeliveryPickup />} />
            <Route path="/delivery/deliver/:id" element={<DeliveryDeliver />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
