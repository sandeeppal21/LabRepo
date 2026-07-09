import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import ProtectedRoute from "./routes/ProtectedRoute";

// Public pages
import Home from "./pages/public/Home";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";

// Dashboard pages
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import VendorDashboard from "./pages/dashboard/VendorDashboard";
import PublicReport from "./pages/dashboard/vendor/PublicReport";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── PUBLIC ── */}
        <Route path="/report/:billId" element={<PublicReport />} />
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* ── ADMIN DASHBOARD ──
            Same pattern as vendor: :tab param drives which content
            section AdminDashboard renders. Sidebar & header stay fixed,
            only the tab content swaps. Needs both routes below or
            /dashboard/admin/profile falls through to the catch-all.
        ── */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/:tab"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── VENDOR DASHBOARD ──
            All vendor tabs live inside VendorDashboard.
            The :tab param drives which content section is shown.
            Navigating to /dashboard/vendor/profile updates the URL
            but only swaps the content — sidebar & header stay fixed.
        ── */}
        <Route
          path="/dashboard/vendor"
          element={
            <ProtectedRoute allowedRole="vendor">
              <VendorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/vendor/:tab"
          element={
            <ProtectedRoute allowedRole="vendor">
              <VendorDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── CATCH ALL ── */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}