import { httpClient } from "./httpClient";
import type { AuthTokenResponse, SessionState, User } from "../types";
import { mockUser } from "../mocks/data";
import { isTokenExpired, getTokenUserId } from "./tokenUtils";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

export const authService = {
  async getToken(phone: string): Promise<string> {
    const response = await httpClient.post<AuthTokenResponse>("/auth/token", {
      phone_number: phone,
    });
    const token = response.token;

    localStorage.setItem('jwt_token', token);
    localStorage.setItem('auth_phone', phone);
  
    return token;
  },

  async initTelegramAuth(): Promise<void> {
    await httpClient.post("/auth/telegram/init");
  },

  async sendPhone(phone: string): Promise<void> {
    await httpClient.post("/auth/telegram/phone", { phone_number: phone });
  },

  async sendCode(code: string): Promise<void> {
    await httpClient.post("/auth/telegram/code", { code: code });
  },

  async sendPassword(password: string): Promise<void> {
    await httpClient.post("/auth/telegram/password", { password: password });
  },

  async getSessionStatus(): Promise<SessionState> {
    const response = await httpClient.get<SessionState>("/auth/session/status");
    console.log("KEKE " + response.auth_state);
    return response;
  },

  async logout(): Promise<void> {
    if (USE_MOCKS) {
      await new Promise(resolve => setTimeout(resolve, 300));
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('auth_phone');
      return;
    }
    await httpClient.delete('/auth/session');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('auth_phone');
  },

  async getCurrentUser(): Promise<User> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockUser;
    }
    return httpClient.get<User>("/users/me");
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      return false;
    }

    if (isTokenExpired(token)) {
      // TODO: refresh
      localStorage.removeItem("jwt_token");
      return false;
    }

    return true;
  },

  validateTokenForPhone(phone: string): boolean {
    const token = localStorage.getItem('jwt_token');
    const storedPhone = localStorage.getItem('auth_phone');

    if (!token || !storedPhone) {
      return false;
    }

    if (storedPhone !== phone) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('auth_phone');
      return false;
    }

    if (isTokenExpired(token)) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('auth_phone');
      return false;
    }

    const tokenUserId = getTokenUserId(token);
    if (tokenUserId && tokenUserId !== phone && tokenUserId !== storedPhone) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('auth_phone');
      return false;
    }

    return true;
  },
};
