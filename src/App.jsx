import AdminLoginPage from "./pages/AdminLoginPage";
import AdminReviewPage from "./pages/AdminReviewPage";
import MapHomePage from "./pages/MapHomePage";

export default function App() {
  const pathname = window.location.pathname;

  if (pathname === "/admin/login") {
    return <AdminLoginPage />;
  }

  if (pathname === "/admin") {
    return <AdminReviewPage />;
  }

  return <MapHomePage />;
}
