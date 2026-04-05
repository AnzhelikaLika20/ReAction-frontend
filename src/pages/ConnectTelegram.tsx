import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService, TELEGRAM_CONNECT_WIP_KEY } from "../services/authService";
import { ApiError } from "../services/httpClient";
import { useAuth } from "../context/AuthContext";
import styles from "./Auth.module.css";

export default function ConnectTelegram() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const resumePendingRef = useRef(false);
  const { checkAuth } = useAuth();

  const [step, setStep] = useState<"phone" | "code" | "password" | "loading">(
    "loading",
  );
  const [messengerAccountId, setMessengerAccountId] = useState<string | null>(
    null,
  );

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const persistWip = useCallback((id: string | null) => {
    if (id) {
      sessionStorage.setItem(TELEGRAM_CONNECT_WIP_KEY, id);
    } else {
      sessionStorage.removeItem(TELEGRAM_CONNECT_WIP_KEY);
    }
  }, []);

  const startNewAccountFlow = useCallback(() => {
    setMessengerAccountId(null);
    persistWip(null);
    setStep("phone");
    setPhone("");
    setCode("");
    setPassword("");
    setError("");
  }, [persistWip]);

  useLayoutEffect(() => {
    const c = searchParams.get("continue");
    if (c) {
      sessionStorage.setItem(TELEGRAM_CONNECT_WIP_KEY, c);
      resumePendingRef.current = true;
      setSearchParams({}, { replace: true });
      return;
    }
    if (!resumePendingRef.current) {
      sessionStorage.removeItem(TELEGRAM_CONNECT_WIP_KEY);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    void (async () => {
      try {
        if (!authService.isAuthenticated()) {
          navigate("/auth");
          return;
        }

        const wip = sessionStorage.getItem(TELEGRAM_CONNECT_WIP_KEY);
        if (!wip) {
          setMessengerAccountId(null);
          setPhone("");
          setCode("");
          setPassword("");
          setError("");
          setStep("phone");
          return;
        }

        setMessengerAccountId(wip);
        const status = await authService.getSessionStatusForMessenger(wip);

        if (status.phone) {
          setPhone(status.phone);
        }

        switch (status.auth_state) {
          case "ready":
            persistWip(null);
            await checkAuth();
            navigate("/settings");
            return;
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
        persistWip(null);
        setMessengerAccountId(null);
        setStep("phone");
      }
    })();
  }, [navigate, checkAuth, persistWip, searchParams]);

  useEffect(() => {
    persistWip(messengerAccountId);
  }, [messengerAccountId, persistWip]);

  const recoverStatus = async (mid: string | null) => {
    if (!mid) return null;
    return authService.getSessionStatusForMessenger(mid).catch(() => null);
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let mid = messengerAccountId;
      if (!mid) {
        mid = await authService.initTelegramAuth(phone);
        setMessengerAccountId(mid);
        await new Promise<void>((r) => setTimeout(r, 500));
        await authService.waitForStatusChange(mid, "wait_phone", 8, 500);
      }

      await authService.sendPhone(phone, mid);
      setStep("code");
    } catch (err) {
      const status = await recoverStatus(messengerAccountId);
      if (status?.auth_state === "ready") {
        persistWip(null);
        await checkAuth();
        navigate("/settings");
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        startNewAccountFlow();
      }
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Ошибка отправки номера телефона",
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messengerAccountId) {
      setError("Сессия подключения сброшена. Начните с номера телефона.");
      setStep("phone");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await authService.sendCode(code, messengerAccountId);
      await new Promise<void>((r) => setTimeout(r, 1500));
      const status =
        await authService.getSessionStatusForMessenger(messengerAccountId);

      if (status.auth_state === "wait_password") {
        setStep("password");
      } else if (status.auth_state === "ready") {
        persistWip(null);
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
    if (!messengerAccountId) {
      setError("Сессия подключения сброшена.");
      setStep("phone");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await authService.sendTelegramPassword(password, messengerAccountId);
      persistWip(null);
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
          Каждый запуск подключения создаёт отдельный клиент на сервере. Можно
          открыть несколько вкладок или нажать «другой номер» — параллельно идут
          независимые потоки входа.
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
            <button
              type="button"
              className={styles.textButton}
              style={{ marginTop: "1rem", display: "block" }}
              onClick={startNewAccountFlow}
              disabled={loading}
            >
              Подключить другой номер (новый клиент)
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
            <button
              type="button"
              className={styles.textButton}
              style={{ marginTop: "1rem", display: "block" }}
              onClick={startNewAccountFlow}
              disabled={loading}
            >
              Другой номер (новый клиент)
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
