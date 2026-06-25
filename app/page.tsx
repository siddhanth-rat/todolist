"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Priority = "none" | "P1" | "P2" | "P3" | "P4";
type Filter = "all" | "pending" | "completed" | "overdue";

type Task = {
  id: string;
  text: string;
  date: string;
  time: string;
  priority: Priority;
  completed: boolean;
  createdAt: number;
};

type ApiUser = {
  username: string;
  displayName: string;
  email: string;
};

const priorityLabels: Record<Priority, string> = {
  none: "Priority",
  P1: "P1 urgent",
  P2: "P2 high",
  P3: "P3 medium",
  P4: "P4 low",
};

const priorityClass: Record<Priority, string> = {
  none: "priority-none",
  P1: "priority-p1",
  P2: "priority-p2",
  P3: "priority-p3",
  P4: "priority-p4",
};

function getStatus(task: Task) {
  if (task.completed) return "Completed";
  if (!task.date) return "Pending";

  const deadline = new Date(`${task.date}T${task.time || "23:59"}`);
  if (!Number.isNaN(deadline.getTime()) && deadline < new Date()) return "Overdue";

  return "Pending";
}

function cleanTask(input: unknown): Task | null {
  if (!input || typeof input !== "object") return null;
  const item = input as Partial<Task>;
  if (!item.id || !item.text) return null;

  return {
    id: String(item.id),
    text: String(item.text),
    date: item.date ? String(item.date) : "",
    time: item.time ? String(item.time) : "",
    priority: ["none", "P1", "P2", "P3", "P4"].includes(String(item.priority)) ? (item.priority as Priority) : "none",
    completed: Boolean(item.completed),
    createdAt: Number(item.createdAt) || Date.now(),
  };
}

export default function Home() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<Priority>("none");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [dueBy, setDueBy] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("none");
  const [dragId, setDragId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileDraftName, setProfileDraftName] = useState("");
  const [profileDraftEmail, setProfileDraftEmail] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [usernameModalOpen, setUsernameModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernamePassword, setUsernamePassword] = useState("");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadApp() {
      const authResponse = await fetch("/api/auth-status");
      const auth = await authResponse.json();

      if (!auth.loggedIn) {
        router.replace("/login");
        return;
      }

      const user = auth.user as ApiUser;
      const tasksResponse = await fetch("/api/tasks");
      const serverTasks = tasksResponse.ok ? await tasksResponse.json() : [];

      if (!active) return;
      setUsername(user.username);
      setDisplayName(user.displayName || user.username);
      setEmail(user.email || "");
      setTasks((Array.isArray(serverTasks) ? serverTasks : []).map(cleanTask).filter(Boolean) as Task[]);
    }

    loadApp().catch(() => router.replace("/login"));

    return () => {
      active = false;
    };
  }, [router]);

  const counts = useMemo(() => {
    return tasks.reduce(
      (next, task) => {
        const status = getStatus(task);
        next.total += 1;
        if (status === "Completed") next.completed += 1;
        if (status === "Pending") next.pending += 1;
        if (status === "Overdue") next.overdue += 1;
        return next;
      },
      { total: 0, pending: 0, completed: 0, overdue: 0 },
    );
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const status = getStatus(task);
      if (filter === "pending" && status !== "Pending") return false;
      if (filter === "completed" && status !== "Completed") return false;
      if (filter === "overdue" && status !== "Overdue") return false;
      if (query && !task.text.toLowerCase().includes(query)) return false;
      if (dueBy && (task.completed || !task.date || task.date > dueBy)) return false;
      return true;
    });
  }, [dueBy, filter, search, tasks]);

  function resetForm() {
    setText("");
    setDate("");
    setTime("");
    setPriority("none");
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed, date, time, priority }),
    });

    if (!response.ok) return;
    const task = cleanTask(await response.json());
    if (task) setTasks((current) => [task, ...current]);
    resetForm();
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditText(task.text);
    setEditDate(task.date);
    setEditTime(task.time);
    setEditPriority(task.priority);
  }

  async function saveEdit(id: string) {
    const trimmed = editText.trim();
    if (!trimmed) return;

    const response = await fetch("/api/tasks/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed, date: editDate, time: editTime, priority: editPriority }),
    });

    if (!response.ok) return;
    const updated = cleanTask(await response.json());
    if (updated) setTasks((current) => current.map((task) => task.id === id ? updated : task));
    setEditingId(null);
  }

  async function toggleTask(id: string) {
    const currentTask = tasks.find((task) => task.id === id);
    if (!currentTask) return;

    const response = await fetch("/api/tasks/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !currentTask.completed }),
    });

    if (!response.ok) return;
    const updated = cleanTask(await response.json());
    if (updated) setTasks((current) => current.map((task) => task.id === id ? updated : task));
  }

  async function deleteTask(id: string) {
    const response = await fetch("/api/tasks/" + id, { method: "DELETE" });
    if (response.ok) setTasks((current) => current.filter((task) => task.id !== id));
  }

  async function clearCompleted() {
    const completedTasks = tasks.filter((task) => task.completed);
    await Promise.all(completedTasks.map((task) => fetch("/api/tasks/" + task.id, { method: "DELETE" })));
    setTasks((current) => current.filter((task) => !task.completed));
  }

  async function clearAll() {
    if (tasks.length === 0) return;
    if (!window.confirm("Clear every task?")) return;

    const response = await fetch("/api/tasks", { method: "DELETE" });
    if (response.ok) setTasks([]);
  }

  function clearFilters() {
    setSearch("");
    setFilter("all");
    setDueBy("");
  }

  function openProfileEditor() {
    setProfileDraftName(displayName || username);
    setProfileDraftEmail(email);
    setProfileMessage("");
    setProfileOpen(false);
    setProfileModalOpen(true);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = profileDraftName.trim() || username;
    const nextEmail = profileDraftEmail.trim();

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: nextName, email: nextEmail }),
    });

    if (!response.ok) {
      setProfileMessage("Profile update failed.");
      return;
    }

    const result = await response.json();
    setDisplayName(result.user.displayName || result.user.username);
    setEmail(result.user.email || "");
    setProfileMessage("Profile updated.");
  }

  function openUsernameEditor() {
    setNewUsername("");
    setUsernamePassword("");
    setUsernameMessage("");
    setProfileOpen(false);
    setUsernameModalOpen(true);
  }

  async function saveUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextUsername = newUsername.trim();

    const response = await fetch("/api/change-username", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newUsername: nextUsername, password: usernamePassword }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({ message: "Username change failed" }));
      setUsernameMessage(result.message || "Username change failed");
      return;
    }

    const result = await response.json();
    setUsername(result.user.username);
    setDisplayName(result.user.displayName || result.user.username);
    setEmail(result.user.email || "");
    setUsernameMessage("Username changed.");
    setNewUsername("");
    setUsernamePassword("");
  }

  function openPasswordEditor() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("");
    setProfileOpen(false);
    setPasswordModalOpen(true);
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match");
      return;
    }

    const response = await fetch("/api/change-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({ message: "Password change failed" }));
      setPasswordMessage(result.message || "Password change failed");
      return;
    }

    setPasswordMessage("Password changed.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    setProfileOpen(false);
    router.push("/login");
  }

  function moveTask(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setTasks((current) => {
      const from = current.findIndex((task) => task.id === dragId);
      const to = current.findIndex((task) => task.id === targetId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  const profileInitial = (displayName || username || "?").charAt(0).toUpperCase();

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Signed in as {displayName || username || "..."}</p>
          <h1>To Do List</h1>
        </div>
        <div className="top-actions">
          <button className="button secondary" type="button" onClick={clearCompleted}>Clear completed</button>
          <button className="button danger" type="button" onClick={clearAll}>Clear all</button>
          <div className="profile-menu">
            <button className="profile-trigger" type="button" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-haspopup="menu">
              <span className="profile-avatar">{profileInitial}</span>
              <span>{displayName || username || "Profile"}</span>
              <span className="profile-caret">v</span>
            </button>
            {profileOpen ? (
              <div className="profile-dropdown" role="menu">
                <div className="profile-dropdown-header">
                  <strong>{displayName || username}</strong>
                  <span>@{username}</span>
                  {email ? <span>{email}</span> : null}
                </div>
                <button type="button" role="menuitem" onClick={openProfileEditor}>Edit profile</button>
                <button type="button" role="menuitem" onClick={openUsernameEditor}>Change username</button>
                <button type="button" role="menuitem" onClick={openPasswordEditor}>Change password</button>
                <button type="button" role="menuitem" onClick={logout}>Logout</button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {profileModalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setProfileModalOpen(false)}>
          <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close profile" onClick={() => setProfileModalOpen(false)}>x</button>
            <div className="modal-heading">
              <div className="profile-avatar large">{profileInitial}</div>
              <div>
                <h2 id="profile-title">Edit Profile</h2>
                <p>Update your display name and email for this browser session.</p>
              </div>
            </div>
            <form className="profile-form" onSubmit={saveProfile}>
              <label>
                <span>Display name</span>
                <input value={profileDraftName} onChange={(event) => setProfileDraftName(event.target.value)} placeholder="Your name" />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={profileDraftEmail} onChange={(event) => setProfileDraftEmail(event.target.value)} placeholder="you@example.com" />
              </label>
              {profileMessage ? <div className="profile-message">{profileMessage}</div> : null}
              <div className="modal-actions">
                <button className="button primary" type="submit">Save changes</button>
                <button className="button secondary" type="button" onClick={() => setProfileModalOpen(false)}>Close</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {usernameModalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setUsernameModalOpen(false)}>
          <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="username-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close username" onClick={() => setUsernameModalOpen(false)}>x</button>
            <div className="modal-heading">
              <div className="profile-avatar large">{profileInitial}</div>
              <div>
                <h2 id="username-title">Change Username</h2>
                <p>Enter a new username and confirm with your current password.</p>
              </div>
            </div>
            <form className="profile-form" onSubmit={saveUsername}>
              <label>
                <span>New username</span>
                <input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} placeholder="New username" />
              </label>
              <label>
                <span>Current password</span>
                <input type="password" value={usernamePassword} onChange={(event) => setUsernamePassword(event.target.value)} placeholder="Current password" />
              </label>
              {usernameMessage ? <div className={usernameMessage.endsWith(".") ? "profile-message" : "profile-message error"}>{usernameMessage}</div> : null}
              <div className="modal-actions">
                <button className="button primary" type="submit">Change username</button>
                <button className="button secondary" type="button" onClick={() => setUsernameModalOpen(false)}>Close</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {passwordModalOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPasswordModalOpen(false)}>
          <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="password-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close password" onClick={() => setPasswordModalOpen(false)}>x</button>
            <div className="modal-heading">
              <div className="profile-avatar large">{profileInitial}</div>
              <div>
                <h2 id="password-title">Change Password</h2>
                <p>Use your current password to set a new one.</p>
              </div>
            </div>
            <form className="profile-form" onSubmit={savePassword}>
              <label>
                <span>Current password</span>
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" />
              </label>
              <label>
                <span>New password</span>
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" />
              </label>
              <label>
                <span>Confirm new password</span>
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" />
              </label>
              {passwordMessage ? <div className={passwordMessage.endsWith(".") ? "profile-message" : "profile-message error"}>{passwordMessage}</div> : null}
              <div className="modal-actions">
                <button className="button primary" type="submit">Change password</button>
                <button className="button secondary" type="button" onClick={() => setPasswordModalOpen(false)}>Close</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <section className="stats-grid" aria-label="Task summary">
        <div className="stat-card"><span>Total</span><strong>{counts.total}</strong></div>
        <div className="stat-card"><span>Pending</span><strong>{counts.pending}</strong></div>
        <div className="stat-card"><span>Done</span><strong>{counts.completed}</strong></div>
        <div className="stat-card"><span>Overdue</span><strong>{counts.overdue}</strong></div>
      </section>

      <form className="task-form" onSubmit={addTask}>
        <input aria-label="Task description" value={text} onChange={(event) => setText(event.target.value)} placeholder="What needs to be done?" />
        <select aria-label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
          {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input aria-label="Due date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <input aria-label="Due time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        <button className="button primary" type="submit">Add task</button>
      </form>

      <section className="toolbar" aria-label="Search and filters">
        <input aria-label="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" />
        <div className="filter-buttons" role="group" aria-label="Status filter">
          {(["all", "pending", "completed", "overdue"] as Filter[]).map((item) => (
            <button key={item} className={filter === item ? "filter active" : "filter"} type="button" onClick={() => setFilter(item)}>{item}</button>
          ))}
        </div>
        <label className="due-filter"><span>Due by</span><input type="date" value={dueBy} onChange={(event) => setDueBy(event.target.value)} /></label>
        <button className="button secondary" type="button" onClick={clearFilters}>Reset filters</button>
      </section>

      <section className="task-list" aria-label="Tasks">
        {visibleTasks.length === 0 ? (
          <div className="empty-state"><h2>No tasks here</h2><p>Add a task or change your filters.</p></div>
        ) : visibleTasks.map((task) => {
          const status = getStatus(task);
          const isEditing = editingId === task.id;
          return (
            <article className={`task-row ${task.completed ? "is-complete" : ""} ${status === "Overdue" ? "is-overdue" : ""}`} draggable={!isEditing} key={task.id} onDragStart={() => setDragId(task.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveTask(task.id)} onDragEnd={() => setDragId(null)}>
              <div className={`priority-bar ${priorityClass[task.priority]}`} />
              <button className="check-button" type="button" aria-label={task.completed ? "Mark pending" : "Mark complete"} onClick={() => toggleTask(task.id)}>{task.completed ? "Done" : "Todo"}</button>
              {isEditing ? (
                <div className="edit-panel">
                  <input value={editText} onChange={(event) => setEditText(event.target.value)} aria-label="Edit task" />
                  <select value={editPriority} onChange={(event) => setEditPriority(event.target.value as Priority)} aria-label="Edit priority">{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  <input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} aria-label="Edit due date" />
                  <input type="time" value={editTime} onChange={(event) => setEditTime(event.target.value)} aria-label="Edit due time" />
                  <div className="row-actions"><button className="button primary" type="button" onClick={() => saveEdit(task.id)}>Save</button><button className="button secondary" type="button" onClick={() => setEditingId(null)}>Cancel</button></div>
                </div>
              ) : (
                <>
                  <div className="task-main"><p>{task.text}</p><div className="task-meta"><span className={`status ${status.toLowerCase()}`}>{status}</span><span>{priorityLabels[task.priority]}</span><span>{task.date ? `${task.date}${task.time ? ` at ${task.time}` : ""}` : "No due date"}</span></div></div>
                  <div className="row-actions"><button className="button secondary" type="button" onClick={() => startEdit(task)}>Edit</button><button className="button danger ghost" type="button" onClick={() => deleteTask(task.id)}>Delete</button></div>
                </>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
