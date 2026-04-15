import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(event.target.value);
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
          <div style={{ marginBottom: "1rem" }}>
            <label className="label">
              {t("language")}
              <select className="input" value={i18n.language} onChange={handleLanguageChange}>
                <option value="en">{t("english")}</option>
                <option value="ja">{t("japanese")}</option>
              </select>
            </label>
          </div>
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
