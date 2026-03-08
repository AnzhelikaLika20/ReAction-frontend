import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import styles from "./Auth.module.css";

export default function Auth() {
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
    checkSessionStatus();
  }, []);

  const checkSessionStatus = async () => {
    try {
      const hasToken = authService.isAuthenticated();

      if (!hasToken) {
        setStep("phone");
        return;
      }

      const status = await authService.getSessionStatus();

      switch (status.auth_state) {
        case "ready":
          navigate("/");
          break;
        case "inited":
          setStep("phone");
          break;
        case "wait_phone":
          setStep("phone");
          break;
        case "wait_code":
          setPhone(status.phone || "");
          setStep("code");
          break;
        case "wait_password":
          setStep("password");
          break;
        default:
          setStep("phone");
      }
    } catch (err) {
      console.error("Session check failed:", err);
      setStep("phone");
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.getToken(phone);
      await authService.initTelegramAuth();

      const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
      await sleep(10_000);
      
      await authService.sendPhone(phone);

      setStep("code");
    } catch (err) {
      const status = await authService.getSessionStatus();

      if (status.auth_state === "ready") {
        console.log("ready already");
        await checkAuth();
        navigate("/");
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
      const status = await authService.getSessionStatus();

      if (status.auth_state === "wait_password") {
        setStep("password");
      } else if (status.auth_state === "ready") {
        await checkAuth();
        navigate("/");
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
      await authService.sendPassword(password);
      await checkAuth();
      navigate("/");
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

        {step === "phone" && (
          <>
            <h2 className={styles.title}>Вход через Telegram</h2>
            <p className={styles.subtitle}>Введите номер телефона</p>

            <form onSubmit={handlePhoneSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="phone" className={styles.label}>
                  Номер телефона
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

              <button
                type="submit"
                className={styles.button}
                disabled={loading}
              >
                {loading ? "Отправка..." : "Получить код"}
              </button>
            </form>
          </>
        )}

        {step === "code" && (
          <>
            <h2 className={styles.title}>Введите код</h2>
            <p className={styles.subtitle}>Код отправлен на {phone}</p>

            <form onSubmit={handleCodeSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="code" className={styles.label}>
                  Код подтверждения
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

              <button
                type="submit"
                className={styles.button}
                disabled={loading}
              >
                {loading ? "Проверка..." : "Отправить код"}
              </button>
            </form>
          </>
        )}

        {step === "password" && (
          <>
            <h2 className={styles.title}>Двухфакторная аутентификация</h2>
            <p className={styles.subtitle}>Введите пароль 2FA</p>

            <form onSubmit={handlePasswordSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>
                  Пароль
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  className={styles.input}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <button
                type="submit"
                className={styles.button}
                disabled={loading}
              >
                {loading ? "Проверка..." : "Подтвердить"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
