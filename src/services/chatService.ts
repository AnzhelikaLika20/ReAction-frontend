import { httpClient } from "./httpClient";
import type { Chat } from "../types";
import { mockChats } from "../mocks/data";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

let localChats = [...mockChats];

export const chatService = {
  async getAll(): Promise<Chat[]> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return [...localChats];
    }
    return httpClient.get<Chat[]>("/chats");
  },

  async updateSelection(chatIds: number[]): Promise<void> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      localChats = localChats.map((chat) => ({
        ...chat,
        is_selected: chatIds.includes(chat.id),
      }));
      return;
    }
    await httpClient.post("/chats/selection", { chat_ids: chatIds });
  },
};
