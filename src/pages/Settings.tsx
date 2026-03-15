import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Calendar, Copy } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { reminderService } from "../services/reminderService";
import styles from "./Settings.module.css";

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  const [calendarUrlLoading, setCalendarUrlLoading] = useState(true);
  const [calendarUrlError, setCalendarUrlError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    const loadCalendarUrl = async () => {
      try {
        setCalendarUrlError(null);
        const url = await reminderService.getCalendarUrl();
        setCalendarUrl(url);
      } catch (error) {
        console.error("Failed to load calendar URL:", error);
        setCalendarUrlError("Не удалось загрузить ссылку на календарь");
      } finally {
        setCalendarUrlLoading(false);
      }
    };
    loadCalendarUrl();
  }, []);

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

  const copyCalendarUrl = () => {
    if (calendarUrl) {
      navigator.clipboard.writeText(calendarUrl);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Настройки</h1>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Calendar size={24} />
          Подписной календарь
        </h2>
        {calendarUrlLoading && (
          <p className={styles.calendarLoading}>Загрузка ссылки...</p>
        )}
        {calendarUrlError && (
          <div className={`${styles.status} ${styles.statusError}`}>
            {calendarUrlError}
          </div>
        )}
        {!calendarUrlLoading && !calendarUrlError && calendarUrl && (
          <>
            <p className={styles.calendarHint}>
              Добавьте подписной календарь по этой ссылке в ваше календарное
              приложение, чтобы получать видеть события Re:Action и получать
              уведомления.
            </p>
            <button
              type="button"
              className={styles.copyButton}
              onClick={copyCalendarUrl}
              title="Скопировать ссылку"
            >
              <Copy size={18} />
              {copyFeedback ? "Скопировано" : "Копировать ссылку"}
            </button>
          </>
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
