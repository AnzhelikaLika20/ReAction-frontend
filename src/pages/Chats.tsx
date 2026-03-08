import { useState, useEffect, useMemo } from 'react';
import { User, Users, Radio, Search } from 'lucide-react';
import { chatService } from '../services/chatService';
import type { Chat } from '../types';
import styles from './Chats.module.css';

export default function Chats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
      console.error('Failed to load chats:', error);
    }
  };

  const handleToggleAll = (checked: boolean) => {
    setAnalyzeAll(checked);
    setChats(chats.map((chat) => ({ ...chat, is_selected: checked })));
    setHasChanges(true);
  };

  const handleToggleChat = (chatId: number, checked: boolean) => {
    setChats(
      chats.map((chat) => (chat.id === chatId ? { ...chat, is_selected: checked } : chat))
    );
    setHasChanges(true);

    const updatedChats = chats.map((chat) =>
      chat.id === chatId ? { ...chat, is_selected: checked } : chat
    );
    const allSelected = updatedChats.every((chat) => chat.is_selected);
    setAnalyzeAll(allSelected);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const selectedIds = chats.filter((chat) => chat.is_selected).map((chat) => chat.id);
      await chatService.updateSelection(selectedIds);
      setHasChanges(false);
      alert('Настройки сохранены');
    } catch (error) {
      console.error('Failed to save chat selection:', error);
      alert('Ошибка при сохранении настроек');
    } finally {
      setLoading(false);
    }
  };

  const getChatIcon = (type: Chat['type']) => {
    switch (type) {
      case 'private':
        return <User size={20} />;
      case 'group':
        return <Users size={20} />;
      case 'channel':
        return <Radio size={20} />;
    }
  };

  const getChatTypeLabel = (type: Chat['type']) => {
    switch (type) {
      case 'private':
        return 'Личный чат';
      case 'group':
        return 'Группа';
      case 'channel':
        return 'Канал';
    }
  };

  const getChatIconClass = (type: Chat['type']) => {
    switch (type) {
      case 'private':
        return styles.chatIconPrivate;
      case 'group':
        return styles.chatIconGroup;
      case 'channel':
        return styles.chatIconChannel;
    }
  };

  const formatMessageCount = (count?: number) => {
    if (!count) return '';
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
          Выберите чаты для анализа сообщений и создания напоминаний
        </p>
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
              onChange={(e) => handleToggleAll(e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>

      {chats.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>Нет доступных чатов</div>
          <p>Чаты будут загружены из вашего Telegram аккаунта</p>
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
                      onChange={(e) => handleToggleChat(chat.id, e.target.checked)}
                    />
                    <div className={`${styles.chatIcon} ${getChatIconClass(chat.type)}`}>
                      {getChatIcon(chat.type)}
                    </div>
                    <div className={styles.chatInfo}>
                      <h3 className={styles.chatName}>{chat.name}</h3>
                      <div className={styles.chatMeta}>
                        <span className={styles.chatType}>{getChatTypeLabel(chat.type)}</span>
                        {chat.message_count && (
                          <>
                            <span className={styles.chatMetaSeparator}>•</span>
                            <span className={styles.chatMessageCount}>
                              {formatMessageCount(chat.message_count)}
                            </span>
                          </>
                        )}
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
                {searchQuery ? 'Результаты поиска' : 'Все чаты'}
              </h2>
              <div className={styles.chatList}>
                {otherChats.map((chat) => (
                  <div key={chat.id} className={styles.chatItem}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={chat.is_selected}
                      onChange={(e) => handleToggleChat(chat.id, e.target.checked)}
                    />
                    <div className={`${styles.chatIcon} ${getChatIconClass(chat.type)}`}>
                      {getChatIcon(chat.type)}
                    </div>
                    <div className={styles.chatInfo}>
                      <h3 className={styles.chatName}>{chat.name}</h3>
                      <div className={styles.chatMeta}>
                        <span className={styles.chatType}>{getChatTypeLabel(chat.type)}</span>
                        {chat.message_count && (
                          <>
                            <span className={styles.chatMetaSeparator}>•</span>
                            <span className={styles.chatMessageCount}>
                              {formatMessageCount(chat.message_count)}
                            </span>
                          </>
                        )}
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
              disabled={loading || !hasChanges}
            >
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
