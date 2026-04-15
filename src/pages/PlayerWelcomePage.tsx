import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getCurrentUserProfile, logout } from "../features/auth/api";

interface PlayerLocationState {
  playerName?: string;
}

export function PlayerWelcomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as PlayerLocationState | null;
  const [playerName, setPlayerName] = useState(state?.playerName ?? "");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(!state?.playerName);
  const { t } = useTranslation();

  useEffect(() => {
    const resolveProfile = async () => {
      if (playerName) {
        return;
      }
      try {
        const profile = await getCurrentUserProfile();
        if (!profile || profile.role !== "player") {
          navigate("/", { replace: true });
          return;
        }
        setPlayerName(profile.full_name);
      } catch {
        navigate("/", { replace: true });
      } finally {
        setIsLoadingProfile(false);
      }
    };
    void resolveProfile();
  }, [navigate, playerName]);

  if (isLoadingProfile) {
    return (
      <main className="page-shell">
        <section className="card">
          <p>{t("loading")}</p>
        </section>
      </main>
    );
  }

  if (!playerName) {
    return null;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="card">
        <h1 className="title">(Brothers FC) {t("welcome")}, {playerName}</h1>
        <p className="subtitle">{t("playerAccessGranted")}</p>
        <div style={{ marginTop: "1rem", display: "flex", gap: "1rem" }}>
          <button className="button button-secondary" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? t("loggingOut") : t("logout")}
          </button>
          <Link to="/settings" className="button button-secondary">
            {t("settings")}
          </Link>
        </div>
      </section>
    </main>
  );
}
