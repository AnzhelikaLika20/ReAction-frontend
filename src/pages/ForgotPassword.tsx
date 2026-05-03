import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../services/authService";
import styles from "./Auth.module.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.requestPasswordReset(email.trim());
      setDone(true);
    } catch (err) {
      console.error(err);
      setError("Не удалось отправить запрос. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <h1 className={styles.logoText}>Re:Action</h1>
        </div>
        <h2 className={styles.title}>Восстановление пароля</h2>
        {done ? (
          <>
            <p className={styles.subtitle}>
              Если аккаунт с адресом <strong>{email}</strong> существует и email
              подтверждён, мы отправили ссылку для сброса пароля.
            </p>
            <p className={styles.footerHint}>
              <Link to="/auth">На страницу входа</Link>
            </p>
          </>
        ) : (
          <>
            <p className={styles.subtitle}>
              Укажите email — пришлём ссылку для нового пароля.
            </p>
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
              {error ? <div className={styles.error}>{error}</div> : null}
              <button type="submit" className={styles.button} disabled={loading}>
                {loading ? "Отправка…" : "Отправить ссылку"}
              </button>
            </form>
            <p className={styles.footerHint}>
              <Link to="/auth">Назад ко входу</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
