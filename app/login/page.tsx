"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type LegacyUser = {
  username: string;
  password: string;
};

type LegacyTask = {
  id: string;
  text: string;
  date: string;
  time: string;
  priority: string;
  completed: boolean;
};

const LEGACY_USERS_KEY = "todo-next.users";
const LEGACY_TASKS_KEY = "todo-next.tasks";
const LEGACY_TASK_PREFIX = "todo-next.tasks.";
const LEGACY_PROFILE_PREFIX = "todo-next.profile.";

function readLegacyUsers(): LegacyUser[] {
  try {
    const saved = localStorage.getItem(LEGACY_USERS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readLegacyTasks(username: string): LegacyTask[] {
  try {
    const saved = localStorage.getItem(LEGACY_TASK_PREFIX + username.toLowerCase()) || localStorage.getItem(LEGACY_TASKS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function migrateLegacyProfile(username: string) {
  const saved = localStorage.getItem(LEGACY_PROFILE_PREFIX + username.toLowerCase());
  if (!saved) return;

  try {
    const profile = JSON.parse(saved) as { displayName?: string; email?: string };
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: profile.displayName || username, email: profile.email || "" }),
    });
  } catch {}
}

async function migrateLegacyTasks(username: string) {
  const tasks = readLegacyTasks(username);
  for (const task of tasks) {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: task.text,
        date: task.date || "",
        time: task.time || "",
        priority: task.priority || "none",
      }),
    });

    if (response.ok && task.completed) {
      const created = await response.json();
      await fetch("/api/tasks/" + created.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
    }
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      router.push("/");
      return;
    }

    const normalizedUsername = username.trim();
    const legacyAccount = readLegacyUsers().find(
      (user) => user.username.toLowerCase() === normalizedUsername.toLowerCase() && user.password === password,
    );

    if (!legacyAccount) {
      const result = await response.json().catch(() => ({ message: "Login failed" }));
      setMessage(result.message || "Login failed");
      return;
    }

    const migration = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: legacyAccount.username, password }),
    });

    if (!migration.ok) {
      const result = await migration.json().catch(() => ({ message: "Account migration failed" }));
      setMessage(result.message || "Account migration failed");
      return;
    }

    await migrateLegacyProfile(legacyAccount.username);
    await migrateLegacyTasks(legacyAccount.username);
    router.push("/");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="auth-kicker">To Do List</p>
        <h1 id="login-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to manage your tasks.</p>

        {message ? <div className="auth-message error">{message}</div> : null}

        <form className="auth-form" onSubmit={login}>
          <label>
            <span>Username</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>
          <button className="auth-submit" type="submit">Login</button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account? <Link href="/register">Register here</Link>
        </p>
      </section>
    </main>
  );
}
