import { httpClient } from "./httpClient";
import type { ReminderFile } from "../types";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

const mockIcsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Re:Action//Calendar//EN
BEGIN:VEVENT
UID:${Date.now()}@reaction.app
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART:${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, "").split(".")[0]}Z
SUMMARY:Тестовое напоминание
DESCRIPTION:Это тестовое напоминание из Re:Action
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Напоминание
END:VALARM
END:VEVENT
END:VCALENDAR`;

export const reminderService = {
  async getNewReminders(): Promise<ReminderFile[]> {
    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return [{ file_id: "mock-file-1" }, { file_id: "mock-file-2" }];
    }
    return httpClient.get<ReminderFile[]>("/reminders/files/new");
  },

  async downloadReminderFile(fileId: string): Promise<void> {
    let blob: Blob;

    if (USE_MOCKS) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      blob = new Blob([mockIcsContent], { type: "text/calendar" });
    } else {
      blob = await httpClient.downloadFile(
        `/reminders/files/${fileId}/download`,
      );
    }

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
