import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../services/httpClient";
import {
  CREDENTIAL_PASSWORD_HINT,
  getCredentialPasswordError,
} from "../utils/passwordPolicy";
import styles from "./Auth.module.css";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const token = params.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const pwdErr = getCredentialPasswordError(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают.");
      return;
    }
    if (!token) {
      setError("В ссылке нет токена. Запросите новое письмо со страницы входа.");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPasswordWithToken(token, password);
      await checkAuth();
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const msg = err.message.toLowerCase();
        if (msg.includes("invalid") || msg.includes("expired")) {
          setError(
            "Ссылка недействительна или устарела. Запросите восстановление пароля снова.",
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("Не удалось сменить пароль. Попробуйте позже.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h2 className={styles.title}>Сброс пароля</h2>
          <p className={styles.subtitle}>
            В ссылке нет токена. Откройте письмо из почты или{" "}
            <Link to="/forgot-password">запросите новое</Link>.
          </p>
          <p className={styles.footerHint}>
            <Link to="/auth">На страницу входа</Link>
          </p>
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
        <h2 className={styles.title}>Новый пароль</h2>
        <p className={styles.subtitle}>Придумайте пароль для входа в аккаунт.</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Новый пароль
              <span className={styles.hint}> ({CREDENTIAL_PASSWORD_HINT})</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="confirm" className={styles.label}>
              Повторите пароль
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={styles.input}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>
          {error ? <div className={styles.error}>{error}</div> : null}
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Сохранение…" : "Сохранить и войти"}
          </button>
        </form>
        <p className={styles.footerHint}>
          <Link to="/auth">На страницу входа</Link>
        </p>
      </div>
    </div>
  );
}
