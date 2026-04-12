import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/MainLayout";
import Auth from "./pages/Auth";
import VerifyEmail from "./pages/VerifyEmail";
import ConnectTelegram from "./pages/ConnectTelegram";
import Scenarios from "./pages/Scenarios";
import Chats from "./pages/Chats";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/scenarios" replace />} />
            <Route path="scenarios" element={<Scenarios />} />
            <Route path="chats" element={<Chats />} />
            <Route path="settings" element={<Settings />} />
            <Route path="connect-telegram" element={<ConnectTelegram />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
