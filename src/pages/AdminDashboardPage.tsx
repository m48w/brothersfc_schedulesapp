import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../features/auth/api";

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
        <h1 className="title">Brothers FC Dashboard</h1>
        <p className="subtitle">Admin access granted.</p>
        <button className="button button-secondary" onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </section>
    </main>
  );
}
