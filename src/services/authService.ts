import { httpClient } from "./httpClient";
import type {
  AuthTokenResponse,
  SessionState,
  TelegramInitResponse,
  User,
} from "../types";
import { isTokenExpired, getTokenUserId } from "./tokenUtils";

export const TELEGRAM_CONNECT_WIP_KEY = "reaction_telegram_connect_wip";

const LEGACY_TELEGRAM_KEY = "reaction_telegram_messenger_account_id";

function persistToken(token: string) {
  localStorage.setItem("jwt_token", token);
}

export const authService = {
  async register(email: string, password: string): Promise<string> {
    const response = await httpClient.post<AuthTokenResponse>(
      "/auth/register",
      { email, password },
    );
    persistToken(response.token);
    return response.token;
  },

  async login(email: string, password: string): Promise<string> {
    const response = await httpClient.post<AuthTokenResponse>("/auth/login", {
      email,
      password,
    });
    persistToken(response.token);
    return response.token;
  },

  /**
   * Создаёт новую запись мессенджера и поднимает tdlib (каждый вызов — отдельный параллельный клиент).
   * id не кладётся в глобальный storage — храните в состоянии страницы / sessionStorage wip.
   */
  async initTelegramAuth(): Promise<string> {
    const res = await httpClient.post<TelegramInitResponse>(
      "/auth/telegram/init",
      {},
    );
    if (!res.messenger_account_id) {
      throw new Error("Ответ init без messenger_account_id");
    }
    return res.messenger_account_id;
  },

  async sendPhone(phone: string, messengerAccountId: string): Promise<void> {
    await httpClient.post("/auth/telegram/phone", {
      phone_number: phone,
      messenger_account_id: messengerAccountId,
    });
    await this.waitForStatusChange(messengerAccountId, "wait_code", 5, 1000);
  },

  async sendCode(code: string, messengerAccountId: string): Promise<void> {
    await httpClient.post("/auth/telegram/code", {
      code,
      messenger_account_id: messengerAccountId,
    });
    const status = await this.waitForStatusChange(
      messengerAccountId,
      ["ready", "wait_password"],
      5,
      1000,
    );
    if (!status) {
      throw new Error("Failed to verify code status");
    }
  },

  async sendTelegramPassword(
    password: string,
    messengerAccountId: string,
  ): Promise<void> {
    await httpClient.post("/auth/telegram/password", {
      password,
      messenger_account_id: messengerAccountId,
    });
    await this.waitForStatusChange(messengerAccountId, "ready", 5, 1000);
  },

  async getSessionStatusForMessenger(
    messengerAccountId: string,
  ): Promise<SessionState> {
    return httpClient.get<SessionState>(
      `/auth/session/status?messenger_account_id=${encodeURIComponent(messengerAccountId)}`,
    );
  },

  async waitForStatusChange(
    messengerAccountId: string,
    expectedStatus: string | string[],
    maxAttempts: number = 5,
    delayMs: number = 1000,
  ): Promise<SessionState | null> {
    const expectedStatuses = Array.isArray(expectedStatus)
      ? expectedStatus
      : [expectedStatus];

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      const status =
        await this.getSessionStatusForMessenger(messengerAccountId);
      if (expectedStatuses.includes(status.auth_state)) {
        return status;
      }
    }

    return null;
  },

  clearTelegramConnectWip(): void {
    sessionStorage.removeItem(TELEGRAM_CONNECT_WIP_KEY);
  },

  async logout(): Promise<void> {
    try {
      await httpClient.delete("/auth/session");
    } catch {
      /* ignore */
    }
    localStorage.removeItem("jwt_token");
    sessionStorage.removeItem(TELEGRAM_CONNECT_WIP_KEY);
    sessionStorage.removeItem(LEGACY_TELEGRAM_KEY);
  },

  async getCurrentUser(): Promise<User> {
    return httpClient.get<User>("/users/me");
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      return false;
    }

    if (isTokenExpired(token)) {
      localStorage.removeItem("jwt_token");
      return false;
    }

    return true;
  },

  getCurrentUserId(): string | null {
    const token = localStorage.getItem("jwt_token");
    if (!token) return null;
    return getTokenUserId(token);
  },
};
