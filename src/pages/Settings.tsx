import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, LogOut, Calendar, Copy, MessageSquare } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { reminderService } from "../services/reminderService";
import { messengerService } from "../services/messengerService";
import type { MessengerAccount } from "../types";
import styles from "./Settings.module.css";

function messengerStatusLabel(status: string): string {
  switch (status) {
    case "connected":
      return "Подключён";
    case "pending":
      return "Ожидание подключения";
    default:
      return status;
  }
}

function messengerTitle(a: MessengerAccount): string {
  const prov = a.provider === "telegram" ? "Telegram" : a.provider;
  const lbl = (a.label && a.label.trim()) || "номер не указан";
  return `${prov} · ${lbl}`;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  const [calendarUrlLoading, setCalendarUrlLoading] = useState(true);
  const [calendarUrlError, setCalendarUrlError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [messengerAccounts, setMessengerAccounts] = useState<
    MessengerAccount[]
  >([]);
  const [messengerLoading, setMessengerLoading] = useState(true);
  const [messengerError, setMessengerError] = useState<string | null>(null);

  useEffect(() => {
    const loadMessengers = async () => {
      try {
        setMessengerError(null);
        const list = await messengerService.list();
        setMessengerAccounts(list);
      } catch {
        setMessengerError("Не удалось загрузить список аккаунтов");
      } finally {
        setMessengerLoading(false);
      }
    };
    loadMessengers();
  }, []);

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
          <MessageSquare size={24} />
          Мессенджеры
        </h2>
        <p className={styles.calendarHint}>
          Подключите Telegram, чтобы загружать список чатов и получать события
          из выбранных диалогов. Несколько аккаунтов можно настроить по очереди.
        </p>
        {messengerLoading && (
          <p className={styles.calendarLoading}>Загрузка аккаунтов...</p>
        )}
        {messengerError && (
          <div className={`${styles.status} ${styles.statusError}`}>
            {messengerError}
          </div>
        )}
        {!messengerLoading &&
          !messengerError &&
          messengerAccounts.length === 0 && (
            <p className={styles.messengerEmpty}>
              Пока нет аккаунтов мессенджеров.
            </p>
          )}
        {!messengerLoading &&
          !messengerError &&
          messengerAccounts.length > 0 && (
            <ul className={styles.messengerList}>
              {messengerAccounts.map((a) => (
                <li key={a.id} className={styles.messengerCard}>
                  <div className={styles.messengerCardMain}>
                    <div className={styles.messengerCardTitle}>
                      {messengerTitle(a)}
                    </div>
                    <div className={styles.messengerCardMeta}>
                      ID: {a.id.slice(0, 8)}…
                    </div>
                  </div>
                  <div className={styles.messengerBadges}>
                    <span
                      className={`${styles.badge} ${
                        a.connection_status === "connected"
                          ? styles.badgeConnected
                          : styles.badgePending
                      }`}
                    >
                      {messengerStatusLabel(a.connection_status)}
                    </span>
                    {a.is_active_for_session && (
                      <span className={`${styles.badge} ${styles.badgeActive}`}>
                        Активная сессия
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        <Link to="/connect-telegram" className={styles.copyButton}>
          Подключить Telegram
        </Link>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <User size={24} />
          Профиль
        </h2>

        <div className={styles.profileInfo}>
          {user?.email && (
            <div className={styles.profileField}>
              <div className={styles.profileLabel}>Email</div>
              <div className={styles.profileValue}>{user.email}</div>
            </div>
          )}

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
            <div className={styles.profileLabel}>Телефон (Telegram)</div>
            <div className={styles.profileValue}>
              {user?.phone_number || "Не подключён"}
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
