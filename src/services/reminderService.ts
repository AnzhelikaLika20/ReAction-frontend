import { httpClient } from "./httpClient";
import type { CalendarURLResponse, ReminderFile } from "../types";

export const reminderService = {
  async getCalendarUrl(): Promise<string> {
    const response = await httpClient.get<CalendarURLResponse>("/calendar/url");
    return response.url;
  },

  async getNewReminders(): Promise<ReminderFile[]> {
    return httpClient.get<ReminderFile[]>("/reminders/files/new");
  },

  async downloadReminderFile(fileId: string): Promise<void> {
    const blob = await httpClient.downloadFile(
      `/reminders/files/${fileId}/download`,
    );
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reminder-${fileId}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
