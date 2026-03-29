import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FileText, MessageSquare, Settings } from "lucide-react";
import styles from "./MainLayout.module.css";

export default function MainLayout() {
  const { user } = useAuth();

  const getInitials = () => {
    if (!user) return "U";
    if (user.first_name) {
      return user.first_name[0].toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const getUserName = () => {
    if (!user) return "Пользователь";
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) {
      return user.first_name;
    }
    if (user.username) {
      return user.username;
    }
    if (user.email) {
      return user.email;
    }
    return user.phone_number || user.phone || "Пользователь";
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Re:Action</h1>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{getUserName()}</span>
          <div className={styles.avatar}>{getInitials()}</div>
        </div>
      </header>

      <div className={styles.main}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            <NavLink
              to="/scenarios"
              className={({ isActive }) =>
                isActive
                  ? `${styles.navLink} ${styles.navLinkActive}`
                  : styles.navLink
              }
            >
              <FileText size={20} />
              Мои сценарии
            </NavLink>
            <NavLink
              to="/chats"
              className={({ isActive }) =>
                isActive
                  ? `${styles.navLink} ${styles.navLinkActive}`
                  : styles.navLink
              }
            >
              <MessageSquare size={20} />
              Чаты
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                isActive
                  ? `${styles.navLink} ${styles.navLinkActive}`
                  : styles.navLink
              }
            >
              <Settings size={20} />
              Настройки
            </NavLink>
          </nav>
        </aside>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      <nav className={styles.bottomNav}>
        <NavLink
          to="/scenarios"
          className={({ isActive }) =>
            isActive
              ? `${styles.bottomNavLink} ${styles.bottomNavLinkActive}`
              : styles.bottomNavLink
          }
        >
          <FileText size={24} />
          Сценарии
        </NavLink>
        <NavLink
          to="/chats"
          className={({ isActive }) =>
            isActive
              ? `${styles.bottomNavLink} ${styles.bottomNavLinkActive}`
              : styles.bottomNavLink
          }
        >
          <MessageSquare size={24} />
          Чаты
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive
              ? `${styles.bottomNavLink} ${styles.bottomNavLinkActive}`
              : styles.bottomNavLink
          }
        >
          <Settings size={24} />
          Настройки
        </NavLink>
      </nav>
    </div>
  );
}
