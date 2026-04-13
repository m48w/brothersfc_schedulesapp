import { useNavigate } from "react-router-dom";
import { loginWithPassword } from "../features/auth/api";
import { LoginForm } from "../features/auth/components/LoginForm";

export function LoginPage() {
  const navigate = useNavigate();

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
        <h1 className="title">Brothers FC Login</h1>
        <p className="subtitle">Sign in with your registered account.</p>
        <LoginForm onSubmit={handleLogin} />
      </section>
    </main>
  );
}
