import { useState } from "react";
import { signInAdmin } from "../services/authService";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setIsSigningIn(true);
      setErrorMessage("");

      await signInAdmin(email, password);

      window.location.href = "/admin";
    } catch (error) {
      console.error("Admin sign in failed:", error);
      setErrorMessage("Login failed. Check your email/password or admin access.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
      <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Vancouver Event Map
        </p>

        <h1 className="mt-2 text-2xl font-bold">Admin Login</h1>

        <p className="mt-2 text-sm text-slate-500">
          Sign in to review imported events before they appear on the public map.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="admin@example.com"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="••••••••"
              required
            />
          </label>

          {errorMessage && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSigningIn ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
