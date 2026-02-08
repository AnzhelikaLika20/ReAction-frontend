import { useState, useEffect } from "react";
import { User, Users, Radio } from "lucide-react";
import { chatService } from "../services/chatService";
import type { Chat } from "../types";
import styles from "./Chats.module.css";

export default function Chats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [analyzeAll, setAnalyzeAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const data = await chatService.getAll();
      setChats(data);
      const allSelected = data.every((chat) => chat.is_selected);
      setAnalyzeAll(allSelected);
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  };

  const handleToggleAll = (checked: boolean) => {
    setAnalyzeAll(checked);
    setChats(chats.map((chat) => ({ ...chat, is_selected: checked })));
    setHasChanges(true);
  };

  const handleToggleChat = (chatId: number, checked: boolean) => {
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
    setLoading(true);
    try {
      const selectedIds = chats
        .filter((chat) => chat.is_selected)
        .map((chat) => chat.id);
      await chatService.updateSelection(selectedIds);
      setHasChanges(false);
      alert("Настройки сохранены");
    } catch (error) {
      console.error("Failed to save chat selection:", error);
      alert("Ошибка при сохранении настроек");
    } finally {
      setLoading(false);
    }
  };

  const getChatIcon = (type: Chat["type"]) => {
    switch (type) {
      case "private":
        return <User size={24} />;
      case "group":
        return <Users size={24} />;
      case "channel":
        return <Radio size={24} />;
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Управление чатами</h1>
        <p className={styles.subtitle}>
          Выберите чаты для анализа сообщений и создания напоминаний
        </p>
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
            onChange={(e) => handleToggleAll(e.target.checked)}
          />
          <span className={styles.slider}></span>
        </label>
      </div>

      {chats.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>Нет доступных чатов</div>
          <p>Чаты будут загружены из вашего Telegram аккаунта</p>
        </div>
      ) : (
        <>
          <div className={styles.chatList}>
            {chats.map((chat) => (
              <div key={chat.id} className={styles.chatItem}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={chat.is_selected}
                  onChange={(e) => handleToggleChat(chat.id, e.target.checked)}
                />
                <div
                  className={`${styles.chatIcon} ${getChatIconClass(chat.type)}`}
                >
                  {getChatIcon(chat.type)}
                </div>
                <div className={styles.chatInfo}>
                  <h3 className={styles.chatName}>{chat.name}</h3>
                  <div className={styles.chatType}>
                    {getChatTypeLabel(chat.type)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <button
              className={styles.saveButton}
              onClick={handleSave}
              disabled={loading || !hasChanges}
            >
              {loading ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
