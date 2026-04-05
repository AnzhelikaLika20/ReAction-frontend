import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { authService } from "../services/authService";
import type { SessionState, User } from "../types";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  sessionState: SessionState | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
  signOut: () => void;
  deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      if (!authService.isAuthenticated()) {
        setIsAuthenticated(false);
        setUser(null);
        setSessionState(null);
        return;
      }

      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      setSessionState({ auth_state: "unknown" });

      setIsAuthenticated(true);
    } catch (error) {
      console.error("Auth check failed:", error);
      setIsAuthenticated(false);
      setUser(null);
      setSessionState(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    authService.clearSession();
    setIsAuthenticated(false);
    setUser(null);
    setSessionState(null);
  };

  const deleteAccount = async (password: string) => {
    await authService.deleteAccount(password);
    setIsAuthenticated(false);
    setUser(null);
    setSessionState(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        sessionState,
        loading,
        checkAuth,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
