import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import styles from "./Auth.module.css";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [message, setMessage] = useState("Подтверждаем email…");

  useEffect(() => {
    const token = params.get("token");
    if (!token?.trim()) {
      setMessage(
        "В ссылке нет токена. Запросите письмо повторно со страницы входа.",
      );
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await authService.verifyEmailFromQueryToken(token.trim());
        if (cancelled) return;
        await checkAuth();
        navigate("/", { replace: true });
      } catch {
        if (!cancelled) {
          setMessage(
            "Ссылка недействительна или устарела. На странице входа можно запросить новое письмо.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, navigate, checkAuth]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Подтверждение email</h2>
        <p className={styles.subtitle}>{message}</p>
        <p className={styles.footerHint}>
          <Link to="/auth">На страницу входа</Link>
        </p>
      </div>
    </div>
  );
}
