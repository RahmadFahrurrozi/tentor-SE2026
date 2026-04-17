import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/Login-page";
import UsersPage from "./pages/User";
import { NotFoundPage } from "./pages/404-page-not-found";
import TermsOfServicePage from "./pages/term-of-service";
import PrivacyPolicyPage from "./pages/prifacy-policy";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/users" element={<UsersPage />} />

      <Route path="/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
