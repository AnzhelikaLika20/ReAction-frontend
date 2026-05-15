import { httpClient, ApiError } from "./httpClient";
import type {
  AuthTokenResponse,
  RegisterPendingResponse,
  SessionState,
  TelegramInitResponse,
  User,
} from "../types";
import { isTokenExpired, getTokenUserId } from "./tokenUtils";

export const TELEGRAM_CONNECT_WIP_KEY = "reaction_telegram_connect_wip";

const LEGACY_TELEGRAM_KEY = "reaction_telegram_messenger_account_id";
const CHATS_MESSENGER_ACCOUNT_STORAGE_KEY =
  "reaction_chats_messenger_account_id";

const REFRESH_TOKEN_KEY = "refresh_token";

const TELEGRAM_AUTH_POLL_MS = 400;
const TELEGRAM_AUTH_PHASE_MS = 5 * 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function persistTokenPair(accessToken: string, refreshToken?: string) {
  localStorage.setItem("jwt_token", accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

const emailVerifyByToken = new Map<string, Promise<string>>();

export const authService = {
  async register(
    email: string,
    password: string,
  ): Promise<RegisterPendingResponse> {
    return httpClient.post<RegisterPendingResponse>("/auth/register", {
      email,
      password,
    });
  },

  async verifyEmailFromQueryToken(token: string): Promise<string> {
    const key = token.trim();
    const cached = emailVerifyByToken.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const p = (async () => {
      const response = await httpClient.get<AuthTokenResponse>(
        `/auth/verify-email?token=${encodeURIComponent(key)}`,
      );
      persistTokenPair(response.token, response.refresh_token);
      return response.token;
    })();
    emailVerifyByToken.set(key, p);
    p.catch(() => {
      emailVerifyByToken.delete(key);
    });
    return p;
  },

  async resendVerificationEmail(email: string): Promise<void> {
    await httpClient.postVoid("/auth/resend-verification", { email });
  },

  async requestPasswordReset(email: string): Promise<void> {
    await httpClient.postVoid("/auth/forgot-password", { email });
  },

  async resetPasswordWithToken(token: string, password: string): Promise<string> {
    const response = await httpClient.postSkipRefresh<AuthTokenResponse>(
      "/auth/reset-password",
      { token: token.trim(), password },
    );
    persistTokenPair(response.token, response.refresh_token);
    return response.token;
  },

  async login(email: string, password: string): Promise<string> {
    const response = await httpClient.postSkipRefresh<AuthTokenResponse>(
      "/auth/login",
      {
        email,
        password,
      },
    );
    persistTokenPair(response.token, response.refresh_token);
    return response.token;
  },

  async refreshTokens(): Promise<string> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    const response = await httpClient.postSkipRefresh<AuthTokenResponse>(
      "/auth/refresh",
      { refresh_token: refreshToken },
    );
    persistTokenPair(response.token, response.refresh_token);
    return response.token;
  },

  async initTelegramAuth(phoneNumber: string): Promise<string> {
    const res = await httpClient.post<TelegramInitResponse>(
      "/auth/telegram/init",
      { phone_number: phoneNumber },
    );
    if (!res.messenger_account_id) {
      throw new Error("Ответ init без messenger_account_id");
    }
    return res.messenger_account_id;
  },

  async waitUntilAuthStates(
    messengerAccountId: string,
    accepted: SessionState["auth_state"][],
    phaseEndMs: number = Date.now() + TELEGRAM_AUTH_PHASE_MS,
  ): Promise<SessionState> {
    let last: SessionState = { auth_state: "unknown" };
    while (Date.now() < phaseEndMs) {
      try {
        last = await this.getSessionStatusForMessenger(messengerAccountId);
        if (accepted.includes(last.auth_state)) {
          return last;
        }
      } catch {
      }
      await sleep(TELEGRAM_AUTH_POLL_MS);
    }
    return last;
  },

  async runTelegramPhonePhase(
    phone: string,
    messengerAccountId: string,
  ): Promise<SessionState> {
    const phaseEnd = Date.now() + TELEGRAM_AUTH_PHASE_MS;

    let s = await this.waitUntilAuthStates(
      messengerAccountId,
      ["wait_phone", "wait_code", "wait_password", "ready"],
      phaseEnd,
    );

    if (s.auth_state !== "wait_phone") {
      return s;
    }

    while (Date.now() < phaseEnd) {
      try {
        await httpClient.post("/auth/telegram/phone", {
          phone_number: phone,
          messenger_account_id: messengerAccountId,
        });
        break;
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          throw e;
        }
        await sleep(TELEGRAM_AUTH_POLL_MS);
        try {
          s = await this.getSessionStatusForMessenger(messengerAccountId);
        } catch {
        }
        if (
          s.auth_state === "wait_code" ||
          s.auth_state === "wait_password" ||
          s.auth_state === "ready"
        ) {
          return s;
        }
      }
    }

    if (Date.now() >= phaseEnd) {
      return s;
    }

    return await this.waitUntilAuthStates(
      messengerAccountId,
      ["wait_code", "wait_password", "ready"],
      phaseEnd,
    );
  },

  async sendPhone(phone: string, messengerAccountId: string): Promise<SessionState> {
    return this.runTelegramPhonePhase(phone, messengerAccountId);
  },

  async sendCode(code: string, messengerAccountId: string): Promise<SessionState> {
    await httpClient.post("/auth/telegram/code", {
      code,
      messenger_account_id: messengerAccountId,
    });
    return this.waitUntilAuthStates(messengerAccountId, [
      "ready",
      "wait_password",
    ]);
  },

  async sendTelegramPassword(
    password: string,
    messengerAccountId: string,
  ): Promise<SessionState> {
    await httpClient.post("/auth/telegram/password", {
      password,
      messenger_account_id: messengerAccountId,
    });
    return this.waitUntilAuthStates(messengerAccountId, ["ready"]);
  },

  async getSessionStatusForMessenger(
    messengerAccountId: string,
  ): Promise<SessionState> {
    return httpClient.get<SessionState>(
      `/auth/session/status?messenger_account_id=${encodeURIComponent(messengerAccountId)}`,
    );
  },

  async waitForTelegramSessionStep(
    messengerAccountId: string,
  ): Promise<SessionState> {
    return this.waitUntilAuthStates(
      messengerAccountId,
      ["inited", "wait_phone", "wait_code", "wait_password", "ready"],
    );
  },

  clearTelegramConnectWip(): void {
    sessionStorage.removeItem(TELEGRAM_CONNECT_WIP_KEY);
  },

  clearSession(): void {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(TELEGRAM_CONNECT_WIP_KEY);
    sessionStorage.removeItem(LEGACY_TELEGRAM_KEY);
    sessionStorage.removeItem(CHATS_MESSENGER_ACCOUNT_STORAGE_KEY);
  },

  async deleteAccount(password: string): Promise<void> {
    await httpClient.deleteJson("/users/me", { password });
    this.clearSession();
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

  async restoreSession(): Promise<boolean> {
    const token = localStorage.getItem("jwt_token");
    if (token && !isTokenExpired(token)) {
      return true;
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      if (token) {
        localStorage.removeItem("jwt_token");
      }
      return false;
    }

    try {
      await this.refreshTokens();
      return true;
    } catch {
      this.clearSession();
      return false;
    }
  },

  getCurrentUserId(): string | null {
    const token = localStorage.getItem("jwt_token");
    if (!token) return null;
    return getTokenUserId(token);
  },
};
