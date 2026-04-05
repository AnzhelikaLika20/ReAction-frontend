import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  LogOut,
  Calendar,
  Copy,
  MessageSquare,
  Trash2,
  UserX,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authService, TELEGRAM_CONNECT_WIP_KEY } from "../services/authService";
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

const CHATS_ACCOUNT_STORAGE_KEY = "reaction_chats_messenger_account_id";

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut, deleteAccount: removeUserAccount } = useAuth();

  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  const [calendarUrlLoading, setCalendarUrlLoading] = useState(true);
  const [calendarUrlError, setCalendarUrlError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [messengerAccounts, setMessengerAccounts] = useState<
    MessengerAccount[]
  >([]);
  const [messengerLoading, setMessengerLoading] = useState(true);
  const [messengerError, setMessengerError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [accountDeletePassword, setAccountDeletePassword] = useState("");
  const [accountDeleteErr, setAccountDeleteErr] = useState("");
  const [accountDeleteBusy, setAccountDeleteBusy] = useState(false);

  const loadMessengers = useCallback(async () => {
    try {
      setMessengerError(null);
      const list = await messengerService.list();
      setMessengerAccounts(list);
    } catch {
      setMessengerError("Не удалось загрузить список аккаунтов");
    } finally {
      setMessengerLoading(false);
    }
  }, []);

  useEffect(() => {
    setMessengerLoading(true);
    void loadMessengers();
  }, [loadMessengers]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadMessengers();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadMessengers]);

  const handleRemoveMessenger = async (id: string) => {
    if (
      !confirm(
        "Удалить привязку этого мессенджера? Сессия на сервере будет остановлена, выбор чатов для этого аккаунта пропадёт.",
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await messengerService.remove(id);
      if (sessionStorage.getItem(TELEGRAM_CONNECT_WIP_KEY) === id) {
        authService.clearTelegramConnectWip();
      }
      if (sessionStorage.getItem(CHATS_ACCOUNT_STORAGE_KEY) === id) {
        sessionStorage.removeItem(CHATS_ACCOUNT_STORAGE_KEY);
      }
      setMessengerLoading(true);
      await loadMessengers();
    } catch {
      alert("Не удалось удалить аккаунт");
    } finally {
      setDeletingId(null);
    }
  };

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

  const handleSignOut = () => {
    if (!confirm("Выйти из аккаунта на этом устройстве?")) {
      return;
    }
    signOut();
    navigate("/auth");
  };

  const handleDeleteAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountDeleteErr("");
    if (
      !confirm(
        "Удалить учётную запись безвозвратно? Профиль, сценарии, напоминания и привязки мессенджеров будут удалены.",
      )
    ) {
      return;
    }
    setAccountDeleteBusy(true);
    try {
      await removeUserAccount(accountDeletePassword);
      navigate("/auth");
    } catch (err) {
      setAccountDeleteErr(
        err instanceof Error ? err.message : "Не удалось удалить аккаунт",
      );
    } finally {
      setAccountDeleteBusy(false);
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
          Подключите один или несколько аккаунтов Telegram — каждый проходит
          отдельный вход по номеру. Аккаунт со статусом «ожидание подключения»
          можно нажать, чтобы продолжить ввод номера, кода или пароля. Список
          чатов доступен для аккаунтов, у которых на сервере запущен клиент
          (пометка «клиент на сервере» на странице чатов).
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
              {messengerAccounts.map((a) => {
                const isPending = a.connection_status === "pending";
                return (
                  <li
                    key={a.id}
                    className={`${styles.messengerCard} ${
                      isPending ? styles.messengerCardPending : ""
                    }`}
                  >
                    <div
                      className={styles.messengerCardMain}
                      role={isPending ? "button" : undefined}
                      tabIndex={isPending ? 0 : undefined}
                      onClick={
                        isPending
                          ? () =>
                              navigate(
                                `/connect-telegram?continue=${encodeURIComponent(a.id)}`,
                              )
                          : undefined
                      }
                      onKeyDown={
                        isPending
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                navigate(
                                  `/connect-telegram?continue=${encodeURIComponent(a.id)}`,
                                );
                              }
                            }
                          : undefined
                      }
                    >
                      <div className={styles.messengerCardTitle}>
                        {messengerTitle(a)}
                      </div>
                      <div className={styles.messengerCardMeta}>
                        ID: {a.id.slice(0, 8)}…
                        {isPending && (
                          <span className={styles.messengerContinueHint}>
                            {" "}
                            · нажмите, чтобы продолжить подключение
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.messengerCardActions}>
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
                          <span
                            className={`${styles.badge} ${styles.badgeActive}`}
                          >
                            Клиент на сервере
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.messengerRemoveButton}
                        title="Удалить привязку"
                        disabled={deletingId === a.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRemoveMessenger(a.id);
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </li>
                );
              })}
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

        <button
          type="button"
          className={styles.signOutButton}
          onClick={handleSignOut}
        >
          <LogOut size={20} />
          Выйти
        </button>

        <div className={styles.deleteAccountBlock}>
          <h3 className={styles.profileLabel}>Удаление аккаунта</h3>
          <p className={styles.deleteAccountHint}>
            Полное удаление учётной записи на сервере. Потребуется текущий
            пароль от входа по email.
          </p>
          <form onSubmit={(e) => void handleDeleteAccountSubmit(e)}>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Пароль"
              className={styles.deleteAccountInput}
              value={accountDeletePassword}
              onChange={(e) => setAccountDeletePassword(e.target.value)}
              disabled={accountDeleteBusy}
            />
            {accountDeleteErr ? (
              <p className={styles.deleteAccountError}>{accountDeleteErr}</p>
            ) : null}
            <button
              type="submit"
              className={styles.dangerButton}
              disabled={accountDeleteBusy || !accountDeletePassword.trim()}
            >
              <UserX size={20} />
              {accountDeleteBusy ? "Удаление…" : "Удалить аккаунт навсегда"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
