import { ChangeEvent, FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { updatePasswordWithCurrentPassword } from "../features/auth/api";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [message, setMessage] = useState("");

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    localStorage.setItem("i18nextLng", event.target.value);
    void i18n.changeLanguage(event.target.value);
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingPassword(true);
    setMessage("");
    try {
      await updatePasswordWithCurrentPassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setMessage(t("passwordUpdated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("errorUpdatePassword"));
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">FC</div>
          <div>
            <p className="brand-name">{t("brandName")}</p>
            <p className="brand-sub">{t("brandSub")}</p>
          </div>
        </div>
      </header>

      <section className="content-card">
        <section className="section">
          <h2 className="section-title">{t("settings")}</h2>
          {message ? <p className="message-error">{message}</p> : null}
          <div style={{ marginBottom: "1rem" }}>
            <label className="label">
              {t("language")}
              <select className="input" value={i18n.language} onChange={handleLanguageChange}>
                <option value="en">{t("english")}</option>
                <option value="ja">{t("japanese")}</option>
              </select>
            </label>
          </div>
          <form className="form form-compact" onSubmit={handlePasswordSubmit}>
            <label className="label">
              {t("currentPassword")}
              <input
                className="input input-compact"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                required
              />
            </label>
            <label className="label">
              {t("newPassword")}
              <input
                className="input input-compact"
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                }
                required
              />
            </label>
            <button className="button button-compact" type="submit" disabled={isSavingPassword}>
              {isSavingPassword ? t("saving") : t("updatePassword")}
            </button>
          </form>
          <div>
            <button className="button button-secondary" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
