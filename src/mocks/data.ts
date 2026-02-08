import type { Chat, User } from "../types";

export const mockUser: User = {
  id: "1",
  phone: "+79001234567",
  first_name: "Иван",
  last_name: "Петров",
  username: "ivanpetrov",
};

export const mockChats: Chat[] = [
  {
    id: 1,
    name: "Семья",
    type: "group",
    is_selected: true,
  },
  {
    id: 2,
    name: "Работа",
    type: "group",
    is_selected: true,
  },
  {
    id: 3,
    name: "Иван Иванов",
    type: "private",
    is_selected: false,
  },
  {
    id: 4,
    name: "Новости IT",
    type: "channel",
    is_selected: false,
  },
];
