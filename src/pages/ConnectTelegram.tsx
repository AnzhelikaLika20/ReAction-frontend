import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import styles from "./Auth.module.css";

export default function ConnectTelegram() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const [step, setStep] = useState<"phone" | "code" | "password" | "loading">(
    "loading",
  );
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void checkSessionStatus();
  }, []);

  const checkSessionStatus = async () => {
    try {
      if (!authService.isAuthenticated()) {
        navigate("/auth");
        return;
      }

      const status = await authService.getSessionStatus();

      switch (status.auth_state) {
        case "ready":
          await checkAuth();
          navigate("/settings");
          break;
        case "inited":
        case "wait_phone":
          setStep("phone");
          break;
        case "wait_code":
          setStep("code");
          break;
        case "wait_password":
          setStep("password");
          break;
        default:
          setStep("phone");
      }
    } catch {
      setStep("phone");
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.initTelegramAuth();
      await new Promise<void>((r) => setTimeout(r, 1000));
      await authService.sendPhone(phone);
      setStep("code");
    } catch (err) {
      const status = await authService.getSessionStatus().catch(() => null);
      if (status?.auth_state === "ready") {
        await checkAuth();
        navigate("/settings");
        return;
      }
      setError("Ошибка отправки номера телефона");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.sendCode(code);
      await new Promise<void>((r) => setTimeout(r, 2000));
      const status = await authService.getSessionStatus();

      if (status.auth_state === "wait_password") {
        setStep("password");
      } else if (status.auth_state === "ready") {
        await checkAuth();
        navigate("/settings");
      }
    } catch (err) {
      setError("Неверный код");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.sendTelegramPassword(password);
      await checkAuth();
      navigate("/settings");
    } catch (err) {
      setError("Неверный пароль");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (step === "loading") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <h1 className={styles.logoText}>Re:Action</h1>
        </div>

        <h2 className={styles.title}>Подключение Telegram</h2>
        <p className={styles.subtitle}>
          Войдите в аккаунт Telegram для выбора чатов и уведомлений
        </p>

        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="phone" className={styles.label}>
                Номер телефона (Telegram)
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+79001234567"
                className={styles.input}
                required
                disabled={loading}
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Отправка..." : "Получить код"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleCodeSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="code" className={styles.label}>
                Код из Telegram
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="12345"
                className={styles.input}
                required
                disabled={loading}
                autoFocus
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Проверка..." : "Отправить"}
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="tg-password" className={styles.label}>
                Пароль 2FA Telegram
              </label>
              <input
                id="tg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
                disabled={loading}
                autoFocus
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Проверка..." : "Подтвердить"}
            </button>
          </form>
        )}

        <p className={styles.footerHint}>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => navigate("/settings")}
          >
            ← Назад в настройки
          </button>
        </p>
      </div>
    </div>
  );
}
