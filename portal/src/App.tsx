import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login-page";
import UsersPage from "./pages/User";
import UnauthorizedPage from "./pages/Unauthorized-page";
import { NotFoundPage } from "./pages/404-page-not-found";
import TermsOfServicePage from "./pages/term-of-service";
import PrivacyPolicyPage from "./pages/prifacy-policy";
import { AuthGuard } from "./components/auth/auth-guard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Only Routes */}
      <Route element={<AuthGuard allowedRoles={["admin"]} />}>
        <Route path="/users" element={<UsersPage />} />
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
