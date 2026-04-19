import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { loginWithPassword } from "../features/auth/api";
import { LoginForm } from "../features/auth/components/LoginForm";
import { ClubLogo } from "../components/ClubLogo";

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogin = async (email: string, password: string) => {
    const profile = await loginWithPassword(email, password);

    if (profile.role === "admin") {
      navigate("/admin");
      return;
    }

    navigate("/player", { state: { playerName: profile.full_name } });
  };

  return (
    <main className="page-shell">
      <section className="card">
        <div className="login-logo-wrap">
          <ClubLogo className="login-logo" />
        </div>
        <h1 className="title">Brothers FC {t("login")}</h1>
        <p className="subtitle">{t("signInMessage")}</p>
        <LoginForm onSubmit={handleLogin} />
      </section>
    </main>
  );
}
