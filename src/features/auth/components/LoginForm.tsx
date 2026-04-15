import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { t } = useTranslation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await onSubmit(email, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("loginFailed");
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="label" htmlFor="email">
        {t("email")}
        <input
          id="email"
          className="input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label className="label" htmlFor="password">
        {t("password")}
        <input
          id="password"
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      <button className="button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("signingIn") : t("signIn")}
      </button>

      {errorMessage ? <p className="message-error">{errorMessage}</p> : null}
    </form>
  );
}
