import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../services/httpClient";
import styles from "./Auth.module.css";

type Mode = "login" | "register";

export default function Auth() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registerDone, setRegisterDone] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [info, setInfo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (mode === "register") {
        await authService.register(email, password);
        setRegisterDone(true);
      } else {
        await authService.login(email, password);
        await checkAuth();
        navigate("/");
      }
    } catch (err) {
      if (mode === "register") {
        if (err instanceof ApiError && err.status === 409) {
          setError("Этот email уже зарегистрирован.");
        } else {
          setError(
            "Не удалось зарегистрироваться. Проверьте данные или попробуйте позже.",
          );
        }
      } else if (err instanceof ApiError && err.status === 403) {
        setError(
          "Сначала подтвердите email по ссылке из письма или запросите новое письмо ниже.",
        );
      } else {
        setError("Неверный email или пароль.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError("Укажите email, на который отправить письмо.");
      return;
    }
    setError("");
    setInfo("");
    setResendLoading(true);
    try {
      await authService.resendVerificationEmail(email.trim());
      setInfo(
        "Если аккаунт с таким email есть и он не подтверждён, мы отправили новое письмо.",
      );
    } catch (e) {
      console.error(e);
      setError("Не удалось отправить письмо. Попробуйте позже.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <h1 className={styles.logoText}>Re:Action</h1>
        </div>

        <h2 className={styles.title}>
          {mode === "login" ? "Вход" : "Регистрация"}
        </h2>
        <p className={styles.subtitle}>
          {mode === "login"
            ? "Войдите по email и паролю"
            : "Создайте аккаунт, затем подключите Telegram в настройках"}
        </p>

        <div className={styles.tabRow}>
          <button
            type="button"
            className={`${styles.tab} ${mode === "login" ? styles.tabActive : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
              setInfo("");
              setRegisterDone(false);
            }}
          >
            Вход
          </button>
          <button
            type="button"
            className={`${styles.tab} ${mode === "register" ? styles.tabActive : ""}`}
            onClick={() => {
              setMode("register");
              setError("");
              setInfo("");
              setRegisterDone(false);
            }}
          >
            Регистрация
          </button>
        </div>

        {registerDone && mode === "register" ? (
          <div className={styles.form}>
            <p className={styles.subtitle}>
              Мы отправили письмо со ссылкой на <strong>{email}</strong>.
              Перейдите по ссылке, затем войдите с паролем.
            </p>
            {info ? (
              <p
                className={styles.subtitle}
                style={{ color: "var(--color-success, #2d7a3e)" }}
              >
                {info}
              </p>
            ) : null}
            <button
              type="button"
              className={styles.button}
              disabled={resendLoading}
              onClick={handleResend}
            >
              {resendLoading ? "Отправка…" : "Отправить письмо ещё раз"}
            </button>
          </div>
        ) : null}

        {!registerDone || mode !== "register" ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={styles.input}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                Пароль
                {mode === "register" && (
                  <span className={styles.hint}> (минимум 8 символов)</span>
                )}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
                required
                minLength={mode === "register" ? 8 : undefined}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                disabled={loading}
              />
              {mode === "login" && (
                <p className={styles.forgotPasswordRow}>
                  <Link to="/forgot-password">Забыли пароль?</Link>
                </p>
              )}
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {info && !error && (
              <div
                className={styles.subtitle}
                style={{ color: "var(--color-success, #2d7a3e)" }}
              >
                {info}
              </div>
            )}

            <button type="submit" className={styles.button} disabled={loading}>
              {loading
                ? "Подождите..."
                : mode === "login"
                  ? "Войти"
                  : "Зарегистрироваться"}
            </button>
          </form>
        ) : null}

        {mode === "login" && (
          <p className={styles.footerHint} style={{ marginTop: "1rem" }}>
            Не пришло письмо после регистрации?{" "}
            <button
              type="button"
              className={styles.footerHintButton}
              disabled={resendLoading}
              onClick={handleResend}
            >
              Отправить ссылку снова
            </button>
          </p>
        )}

        <p className={styles.footerHint}>
          После входа подключите Telegram в разделе «Настройки» для работы
          Re:Action с чатами.
        </p>
        <p className={styles.privacyNotice}>
          Приложение может обрабатывать данные переписки в подключённом
          мессенджере, но не сохраняет содержимое
          переписки.
        </p>
      </div>
    </div>
  );
}
