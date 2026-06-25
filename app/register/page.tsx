"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";



export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({ message: "Registration failed" }));
      setMessage(result.message || "Registration failed");
      return;
    }

    router.push("/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="register-title">
        <p className="auth-kicker">To Do List</p>
        <h1 id="register-title">Create Account</h1>
        <p className="auth-subtitle">Sign up to start organizing your schedule.</p>

        {message ? <div className="auth-message error">{message}</div> : null}

        <form className="auth-form" onSubmit={register}>
          <label>
            <span>Username</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Choose a username"
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              autoComplete="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Choose a strong password"
              required
            />
          </label>
          <button className="auth-submit" type="submit">Register</button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link href="/login">Login here</Link>
        </p>
      </section>
    </main>
  );
}
