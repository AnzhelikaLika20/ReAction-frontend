import { httpClient } from "./httpClient";
import type { AuthTokenResponse, SessionState, User } from "../types";
import { mockUser } from "../mocks/data";
import { isTokenExpired } from "./tokenUtils";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

export const authService = {
  async getToken(phone: string): Promise<string> {
    const response = await httpClient.post<AuthTokenResponse>("/auth/token", {
      phone_number: phone,
    });
    const token = response.token;
    localStorage.setItem("jwt_token", token);
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
    return response;
  },

  async logout(): Promise<void> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      localStorage.removeItem("jwt_token");
      return;
    }
    await httpClient.delete("/auth/session");
    localStorage.removeItem("jwt_token");
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
};
