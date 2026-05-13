import AdminLoginPage from "./pages/AdminLoginPage";
import AdminReviewPage from "./pages/AdminReviewPage";
import LoginPage from "./pages/LoginPage";
import FavoritesPage from "./pages/FavoritesPage";
import MapHomePage from "./pages/MapHomePage";

export default function App() {
  const pathname = window.location.pathname;

  if (pathname === "/login") {
    return <LoginPage />;
  }

  if (pathname === "/admin/login") {
    return <AdminLoginPage />;
  }

  if (pathname === "/admin") {
    return <AdminReviewPage />;
  }

  if (pathname === "/favorites") {
    return <FavoritesPage />;
  }

  return <MapHomePage />;
}
