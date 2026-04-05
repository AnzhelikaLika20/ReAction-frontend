import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { User, Users, Radio, Search } from "lucide-react";
import { chatService } from "../services/chatService";
import { messengerService } from "../services/messengerService";
import type { Chat, MessengerAccount } from "../types";
import styles from "./Chats.module.css";

const STORAGE_KEY = "reaction_chats_messenger_account_id";

function selectOptionLabel(a: MessengerAccount): string {
  const prov = a.provider === "telegram" ? "Telegram" : a.provider;
  const lbl = (a.label && a.label.trim()) || "без номера";
  const active = a.is_active_for_session ? " · клиент на сервере" : "";
  return `${prov} — ${lbl}${active}`;
}

export default function Chats() {
  const [accounts, setAccounts] = useState<MessengerAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [analyzeAll, setAnalyzeAll] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setAccountsError(null);
        const list = await messengerService.list();
        if (!cancelled) setAccounts(list);
      } catch {
        if (!cancelled) setAccountsError("Не удалось загрузить аккаунты");
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedAccountId("");
      return;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && accounts.some((a) => a.id === stored)) {
      setSelectedAccountId(stored);
      return;
    }
    const active = accounts.find((a) => a.is_active_for_session);
    const pick = active ?? accounts[0];
    setSelectedAccountId(pick.id);
    sessionStorage.setItem(STORAGE_KEY, pick.id);
  }, [accounts]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const canLoadTelegramChats = Boolean(
    selectedAccount?.is_active_for_session,
  );

  useEffect(() => {
    if (!selectedAccountId || accountsLoading) return;

    if (!canLoadTelegramChats) {
      setChats([]);
      setAnalyzeAll(false);
      setHasChanges(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setChatsLoading(true);
      try {
        const data = await chatService.getAll(selectedAccountId);
        if (cancelled) return;
        setChats(data);
        setAnalyzeAll(
          data.length > 0 && data.every((chat) => chat.is_selected),
        );
        setHasChanges(false);
      } catch (error) {
        console.error("Failed to load chats:", error);
        if (!cancelled) {
          setChats([]);
          setAnalyzeAll(false);
        }
      } finally {
        if (!cancelled) setChatsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedAccountId, accountsLoading, canLoadTelegramChats]);

  const onAccountChange = (id: string) => {
    setSelectedAccountId(id);
    sessionStorage.setItem(STORAGE_KEY, id);
    setSearchQuery("");
    setHasChanges(false);
  };

  const handleToggleAll = (checked: boolean) => {
    if (!canLoadTelegramChats || chatsLoading) return;
    setAnalyzeAll(checked);
    setChats(chats.map((chat) => ({ ...chat, is_selected: checked })));
    setHasChanges(true);
  };

  const handleToggleChat = (chatId: number, checked: boolean) => {
    if (!canLoadTelegramChats || chatsLoading) return;
    setChats(
      chats.map((chat) =>
        chat.id === chatId ? { ...chat, is_selected: checked } : chat,
      ),
    );
    setHasChanges(true);

    const updatedChats = chats.map((chat) =>
      chat.id === chatId ? { ...chat, is_selected: checked } : chat,
    );
    const allSelected = updatedChats.every((chat) => chat.is_selected);
    setAnalyzeAll(allSelected);
  };

  const handleSave = async () => {
    if (!selectedAccountId || !canLoadTelegramChats) return;
    setSaveLoading(true);
    try {
      const selectedIds = chats
        .filter((chat) => chat.is_selected)
        .map((chat) => chat.id);
      await chatService.updateSelection(selectedIds, selectedAccountId);
      setHasChanges(false);
      alert("Настройки сохранены");
    } catch (error) {
      console.error("Failed to save chat selection:", error);
      alert("Ошибка при сохранении настроек");
    } finally {
      setSaveLoading(false);
    }
  };

  const getChatIcon = (type: Chat["type"]) => {
    switch (type) {
      case "private":
        return <User size={20} />;
      case "group":
        return <Users size={20} />;
      case "channel":
        return <Radio size={20} />;
    }
  };

  const getChatTypeLabel = (type: Chat["type"]) => {
    switch (type) {
      case "private":
        return "Личный чат";
      case "group":
        return "Группа";
      case "channel":
        return "Канал";
    }
  };

  const getChatIconClass = (type: Chat["type"]) => {
    switch (type) {
      case "private":
        return styles.chatIconPrivate;
      case "group":
        return styles.chatIconGroup;
      case "channel":
        return styles.chatIconChannel;
    }
  };

  const formatMessageCount = (count?: number) => {
    if (!count) return "";
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k сообщений`;
    }
    return `${count} сообщений`;
  };

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter((chat) => chat.name.toLowerCase().includes(query));
  }, [chats, searchQuery]);

  const popularChats = useMemo(() => {
    if (searchQuery.trim()) return [];
    return [...filteredChats]
      .sort((a, b) => (b.message_count || 0) - (a.message_count || 0))
      .slice(0, 5);
  }, [filteredChats, searchQuery]);

  const otherChats = useMemo(() => {
    if (searchQuery.trim()) return filteredChats;
    const popularIds = new Set(popularChats.map((c) => c.id));
    return filteredChats.filter((chat) => !popularIds.has(chat.id));
  }, [filteredChats, popularChats, searchQuery]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Управление чатами</h1>
        <p className={styles.subtitle}>
          Выберите аккаунт мессенджера и отметьте чаты для анализа и напоминаний
        </p>
      </div>

      <div className={styles.accountBar}>
        <span className={styles.accountBarLabel}>Аккаунт мессенджера</span>
        {accountsLoading ? (
          <p className={styles.accountHint}>Загрузка аккаунтов...</p>
        ) : accountsError ? (
          <p className={`${styles.accountHint} ${styles.accountHintWarn}`}>
            {accountsError}
          </p>
        ) : accounts.length === 0 ? (
          <p className={`${styles.accountHint} ${styles.accountHintWarn}`}>
            Нет подключённых аккаунтов.{" "}
            <Link to="/connect-telegram">Подключите Telegram</Link>.
          </p>
        ) : (
          <select
            className={styles.accountSelect}
            value={selectedAccountId}
            onChange={(e) => onAccountChange(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {selectOptionLabel(a)}
              </option>
            ))}
          </select>
        )}
        {selectedAccount &&
          !canLoadTelegramChats &&
          !accountsLoading &&
          !accountsError && (
            <p className={`${styles.accountHint} ${styles.accountHintWarn}`}>
              Для этого аккаунта на сервере не запущен Telegram-клиент
              (tdlib). Подключите аккаунт или дождитесь восстановления сессий на
              сервере.{" "}
              <Link to="/connect-telegram">Подключение Telegram</Link>.
            </p>
          )}
      </div>

      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} size={20} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Поиск по названию чата..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!canLoadTelegramChats || chatsLoading}
          />
        </div>

        <div className={styles.globalToggle}>
          <label htmlFor="analyzeAll" className={styles.toggleLabel}>
            Анализировать все чаты
          </label>
          <label className={styles.switch}>
            <input
              id="analyzeAll"
              type="checkbox"
              className={styles.switchInput}
              checked={analyzeAll}
              disabled={
                !canLoadTelegramChats || chatsLoading || chats.length === 0
              }
              onChange={(e) => handleToggleAll(e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

      {chatsLoading && canLoadTelegramChats && (
        <p className={styles.accountHint}>Загрузка чатов...</p>
      )}

      {canLoadTelegramChats && accounts.length > 0 && !chatsLoading && (
        <>
          {chats.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>Нет доступных чатов</div>
              <p>
                Убедитесь, что Telegram подключён и авторизация завершена. Затем
                обновите страницу.
              </p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>Ничего не найдено</div>
              <p>Попробуйте изменить поисковый запрос</p>
            </div>
          ) : (
            <>
              {!searchQuery && popularChats.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Популярные чаты</h2>
                  <div className={styles.chatList}>
                    {popularChats.map((chat) => (
                      <div key={chat.id} className={styles.chatItem}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={chat.is_selected}
                          disabled={!canLoadTelegramChats || chatsLoading}
                          onChange={(e) =>
                            handleToggleChat(chat.id, e.target.checked)
                          }
                        />
                        <div
                          className={`${styles.chatIcon} ${getChatIconClass(chat.type)}`}
                        >
                          {getChatIcon(chat.type)}
                        </div>
                        <div className={styles.chatInfo}>
                          <h3 className={styles.chatName}>{chat.name}</h3>
                          <div className={styles.chatMeta}>
                            <span className={styles.chatType}>
                              {getChatTypeLabel(chat.type)}
                            </span>
                            {chat.message_count ? (
                              <>
                                <span className={styles.chatMetaSeparator}>
                                  •
                                </span>
                                <span className={styles.chatMessageCount}>
                                  {formatMessageCount(chat.message_count)}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {otherChats.length > 0 && (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    {searchQuery ? "Результаты поиска" : "Все чаты"}
                  </h2>
                  <div className={styles.chatList}>
                    {otherChats.map((chat) => (
                      <div key={chat.id} className={styles.chatItem}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={chat.is_selected}
                          disabled={!canLoadTelegramChats || chatsLoading}
                          onChange={(e) =>
                            handleToggleChat(chat.id, e.target.checked)
                          }
                        />
                        <div
                          className={`${styles.chatIcon} ${getChatIconClass(chat.type)}`}
                        >
                          {getChatIcon(chat.type)}
                        </div>
                        <div className={styles.chatInfo}>
                          <h3 className={styles.chatName}>{chat.name}</h3>
                          <div className={styles.chatMeta}>
                            <span className={styles.chatType}>
                              {getChatTypeLabel(chat.type)}
                            </span>
                            {chat.message_count ? (
                              <>
                                <span className={styles.chatMetaSeparator}>
                                  •
                                </span>
                                <span className={styles.chatMessageCount}>
                                  {formatMessageCount(chat.message_count)}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.actions}>
                <button
                  className={styles.saveButton}
                  onClick={handleSave}
                  disabled={
                    saveLoading ||
                    !hasChanges ||
                    !canLoadTelegramChats ||
                    chatsLoading
                  }
                >
                  {saveLoading ? "Сохранение..." : "Сохранить изменения"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
