import { createBrowserRouter } from "react-router-dom";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { PlayerWelcomePage } from "../pages/PlayerWelcomePage";

export const appRouter = createBrowserRouter([
  { path: "/", element: <LoginPage /> },
  { path: "/admin", element: <AdminDashboardPage /> },
  { path: "/player", element: <PlayerWelcomePage /> }
]);
