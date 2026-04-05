import { httpClient } from "./httpClient";
import type { MessengerAccount } from "../types";

export const messengerService = {
  async list(): Promise<MessengerAccount[]> {
    return httpClient.get<MessengerAccount[]>("/users/me/messenger-accounts");
  },

  async remove(messengerAccountId: string): Promise<void> {
    const id = encodeURIComponent(messengerAccountId);
    await httpClient.delete(`/users/me/messenger-accounts/${id}`);
  },
};
