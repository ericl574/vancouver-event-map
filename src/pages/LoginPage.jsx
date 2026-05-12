import { useState } from "react";
import { signInUser } from "../services/authService";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setIsSigningIn(true);
      setErrorMessage("");

      await signInUser(email, password);

      window.location.href = "/";
    } catch (error) {
      console.error("User sign in failed:", error);
      setErrorMessage("Login failed. Please check your email and password.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900">
      <section className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-2xl shadow-slate-900/10">
        <p className="text-sm font-semibold uppercase tracking-wide text-pink-600">
          Vancouver Event Map
        </p>

        <h1 className="mt-2 text-2xl font-bold">Log in</h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Sign in to your account. Later, this account can be used to save events
          you want to attend.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
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
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSigningIn ? "Logging in..." : "Log in"}
          </button>
        </form>

        <a
          href="/"
          className="mt-4 block text-center text-sm font-semibold text-slate-500 transition hover:text-pink-600"
        >
          Back to map
        </a>
      </section>
    </main>
  );
}
