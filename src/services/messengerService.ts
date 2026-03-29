import { httpClient } from "./httpClient";
import type { MessengerAccount } from "../types";

export const messengerService = {
  async list(): Promise<MessengerAccount[]> {
    return httpClient.get<MessengerAccount[]>("/users/me/messenger-accounts");
  },
};
