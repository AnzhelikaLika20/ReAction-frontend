import { httpClient } from "./httpClient";
import type { Chat } from "../types";

function chatsQuery(messengerAccountId: string): string {
  const q = new URLSearchParams({
    messenger_account_id: messengerAccountId,
  });
  return `/chats?${q.toString()}`;
}

export const chatService = {
  async getAll(messengerAccountId: string): Promise<Chat[]> {
    return httpClient.get<Chat[]>(chatsQuery(messengerAccountId));
  },

  async updateSelection(
    chatIds: number[],
    messengerAccountId: string,
  ): Promise<void> {
    await httpClient.post("/chats/selection", {
      chat_ids: chatIds,
      messenger_account_id: messengerAccountId,
    });
  },
};
