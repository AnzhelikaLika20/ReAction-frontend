import { httpClient } from "./httpClient";
import type { Chat } from "../types";

export const chatService = {
  async getAll(): Promise<Chat[]> {
    return httpClient.get<Chat[]>("/chats");
  },

  async updateSelection(chatIds: number[]): Promise<void> {
    await httpClient.post("/chats/selection", { chat_ids: chatIds });
  },
};
