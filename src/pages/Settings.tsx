import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, User, LogOut, Download, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { reminderService } from "../services/reminderService";
import type { ReminderFile } from "../types";
import styles from "./Settings.module.css";

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<
    "loading" | "success" | "error" | null
  >(null);
  const [reminders, setReminders] = useState<ReminderFile[]>([]);

  const handleCheckReminders = async () => {
    setChecking(true);
    setStatusMessage("Проверка новых напоминаний...");
    setStatusType("loading");
    setReminders([]);

    try {
      const files = await reminderService.getNewReminders();

      if (files.length === 0) {
        setStatusMessage("Новых напоминаний не найдено");
        setStatusType("success");
      } else {
        setReminders(files);
        setStatusMessage(
          `Найдено ${files.length} ${files.length === 1 ? "напоминание" : "напоминаний"}`,
        );
        setStatusType("success");
      }
    } catch (error) {
      console.error("Failed to check reminders:", error);
      setStatusMessage("Ошибка при проверке напоминаний");
      setStatusType("error");
    } finally {
      setChecking(false);
    }
  };

  const handleDownloadReminder = async (fileId: string) => {
    try {
      await reminderService.downloadReminderFile(fileId);
      setReminders(reminders.filter((r) => r.file_id !== fileId));

      if (reminders.length === 1) {
        setStatusMessage("Все напоминания загружены");
        setStatusType("success");
      }
    } catch (error) {
      console.error("Failed to download reminder:", error);
      alert("Ошибка при загрузке напоминания");
    }
  };

  const handleLogout = async () => {
    if (!confirm("Вы уверены, что хотите выйти?")) {
      return;
    }

    try {
      await logout();
      navigate("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Ошибка при выходе");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Настройки</h1>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Bell size={24} />
          Проверка напоминаний
        </h2>
        <p className={styles.sectionDescription}>
          Нажмите кнопку, чтобы проверить новые напоминания. Найденные
          напоминания будут автоматически предложены для добавления в ваш
          календарь.
        </p>

        <button
          className={styles.checkButton}
          onClick={handleCheckReminders}
          disabled={checking}
        >
          <RefreshCw size={20} className={checking ? "animate-spin" : ""} />
          {checking ? "Проверка..." : "Проверить новые напоминания"}
        </button>

        {statusMessage && statusType && (
          <div
            className={`${styles.status} ${
              statusType === "loading"
                ? styles.statusLoading
                : statusType === "success"
                  ? styles.statusSuccess
                  : styles.statusError
            }`}
          >
            {statusMessage}
          </div>
        )}

        {reminders.length > 0 && (
          <div className={styles.remindersList}>
            {reminders.map((reminder) => (
              <div key={reminder.file_id} className={styles.reminderItem}>
                <span>Напоминание {reminder.file_id}</span>
                <button
                  className={styles.downloadButton}
                  onClick={() => handleDownloadReminder(reminder.file_id)}
                >
                  <Download size={16} />
                  Добавить в календарь
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <User size={24} />
          Профиль
        </h2>

        <div className={styles.profileInfo}>
          {user?.first_name && (
            <div className={styles.profileField}>
              <div className={styles.profileLabel}>Имя</div>
              <div className={styles.profileValue}>
                {user.first_name} {user.last_name || ""}
              </div>
            </div>
          )}

          {user?.username && (
            <div className={styles.profileField}>
              <div className={styles.profileLabel}>Имя пользователя</div>
              <div className={styles.profileValue}>@{user.username}</div>
            </div>
          )}

          <div className={styles.profileField}>
            <div className={styles.profileLabel}>Номер телефона</div>
            <div className={styles.profileValue}>
              {user?.phone || "Не указан"}
            </div>
          </div>
        </div>

        <button className={styles.logoutButton} onClick={handleLogout}>
          <LogOut size={20} />
          Выйти
        </button>
      </div>
    </div>
  );
}
