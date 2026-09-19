import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Coffee,
  Dumbbell,
  Flame,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  X,
  Zap,
  UserRound,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { authApi, getToken, setToken, tasksApi } from "./services/api";

const CATEGORIES = [
  "DSA",
  "Python",
  "SQL",
  "College",
  "Projects",
  "Exercise",
  "Personal",
  "Other",
];
const PRIORITIES = ["High", "Medium", "Low"];
const STORAGE_KEY = "daily-task-studio-v1";
const AUTH_KEY = "taskflow-auth-v1";
const ACCOUNT_KEY = "taskflow-account-v1";
const ACCOUNTS_KEY = "taskflow-accounts-v1";
const colors = { High: "#ef6b73", Medium: "#e6a84d", Low: "#6ea7f4" };
const todayKey = () => new Date().toISOString().slice(0, 10);
const addDays = (date, amount) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + amount);
  return d.toISOString().slice(0, 10);
};
const formatDate = (
  date,
  opts = { month: "long", day: "numeric", year: "numeric" },
) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", opts);
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const points = (task) =>
  (({ High: 3, Medium: 2, Low: 1 })[task.priority] || 1) *
  Math.max(1, Math.ceil(Number(task.minutes || 30) / 30));
const emptyStore = () => ({ days: {}, theme: "light", displayName: "Anmol Panchal" });
const seedStore = () => {
  const today = todayKey();
  const tomorrow = addDays(today, 1);
  return {
    theme: "light",
    displayName: "Anmol Panchal",
    days: {
      [today]: {
        tasks: [
          {
            id: uid(),
            title: "Review dynamic programming patterns",
            category: "DSA",
            priority: "High",
            minutes: 75,
            notes: "Focus on knapsack and grid problems.",
            status: "pending",
          },
          {
            id: uid(),
            title: "Complete Python practice set",
            category: "Python",
            priority: "Medium",
            minutes: 45,
            notes: "",
            status: "completed",
          },
          {
            id: uid(),
            title: "Read project brief and outline",
            category: "Projects",
            priority: "Low",
            minutes: 30,
            notes: "",
            status: "pending",
          },
        ],
      },
      [tomorrow]: {
        tasks: [
          {
            id: uid(),
            title: "SQL joins practice",
            category: "SQL",
            priority: "Medium",
            minutes: 45,
            notes: "",
            status: "pending",
          },
          {
            id: uid(),
            title: "Morning strength session",
            category: "Exercise",
            priority: "Low",
            minutes: 30,
            notes: "",
            status: "pending",
          },
        ],
      },
    },
  };
};
const readStore = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...emptyStore(), ...JSON.parse(saved) } : seedStore();
  } catch {
    return seedStore();
  }
};
const accountStorageKey = (email) =>
  `taskflow-data-${encodeURIComponent(email.trim().toLowerCase())}`;
const readAccounts = () => {
  try {
    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
    if (Array.isArray(accounts) && accounts.length) return accounts;
    const legacyAccount = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
    return legacyAccount?.email ? [legacyAccount] : [];
  } catch {
    return [];
  }
};
const readAccountStore = (account, createNew = false) => {
  try {
    const scopedKey = accountStorageKey(account.email);
    const scoped = localStorage.getItem(scopedKey);
    if (scoped) return { ...emptyStore(), ...JSON.parse(scoped) };
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy && !createNew && readAccounts().length <= 1) {
      const migrated = { ...emptyStore(), ...JSON.parse(legacy), displayName: account.name };
      localStorage.setItem(scopedKey, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    return createNew ? emptyStore() : seedStore();
  }
  return createNew ? { ...emptyStore(), displayName: account.name } : seedStore();
};
const normalizeTask = (task, date) => ({
  ...task,
  id: task._id || task.id || uid(),
  date: task.date || date,
  status: task.status || "pending",
});
const tasksToDays = (tasks) =>
  tasks.reduce((days, task) => {
    const date = task.date || todayKey();
    days[date] = { ...(days[date] || { tasks: [] }), tasks: [...(days[date]?.tasks || []), normalizeTask(task, date)] };
    return days;
  }, {});

function App() {
  const [account, setAccount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNT_KEY)) || null;
    } catch {
      return null;
    }
  });
  const [store, setStore] = useState(() =>
    account ? readAccountStore(account) : readStore(),
  );
  const [apiReady, setApiReady] = useState(false);
  const [page, setPage] = useState(() =>
    sessionStorage.getItem(AUTH_KEY) && account ? "Dashboard" : "Landing",
  );
  const [authMode, setAuthMode] = useState("login");
  const [dark, setDark] = useState(store.theme === "dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    category: "All",
    priority: "All",
    sort: "priority",
  });
  const today = todayKey();
  const tomorrow = addDays(today, 1);

  useEffect(() => {
    if (account) {
      localStorage.setItem(
        accountStorageKey(account.email),
        JSON.stringify({ ...store, theme: dark ? "dark" : "light" }),
      );
    }
  }, [store, dark, account]);
  useEffect(() => {
    if (!account || !getToken()) return undefined;
    let active = true;
    Promise.all([authApi.me(), tasksApi.list()])
      .then(([meResponse, taskResponse]) => {
        if (!active) return;
        const user = meResponse.user || meResponse.data || meResponse;
        const tasks = taskResponse.tasks || taskResponse.data || taskResponse;
        const nextAccount = { name: user.name, email: user.email };
        setAccount(nextAccount);
        setStore((current) => ({
          ...current,
          displayName: user.name,
          days: tasksToDays(Array.isArray(tasks) ? tasks : []),
        }));
        setApiReady(true);
      })
      .catch(() => {
        if (active) setApiReady(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);
  useEffect(() => {
    if (!store.days[today])
      setStore((s) => ({
        ...s,
        days: {
          ...s.days,
          [today]: {
            tasks:
              s.days[tomorrow]?.tasks?.map((t) => ({
                ...t,
                id: uid(),
                status: "pending",
              })) || [],
          },
        },
      }));
  }, [today]);

  const updateDay = (date, tasks) =>
    setStore((s) => ({
      ...s,
      days: { ...s.days, [date]: { ...(s.days[date] || {}), tasks } },
    }));
  const tasks = store.days[today]?.tasks || [];
  const tomorrowTasks = store.days[tomorrow]?.tasks || [];
  const completed = tasks.filter((t) => t.status === "completed").length;
  const plannedPoints = tasks.reduce((sum, t) => sum + points(t), 0);
  const completedPoints = tasks
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + points(t), 0);
  const score = plannedPoints
    ? Math.round((completedPoints / plannedPoints) * 100)
    : 0;
  const completion = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;
  const history = Object.entries(store.days).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const productiveDays = history.filter(
    ([, d]) => d.tasks?.length && dayStats(d.tasks).score >= 60,
  ).length;
  const streak = useMemo(() => {
    let count = 0;
    let date = today;
    while (
      store.days[date]?.tasks?.length &&
      dayStats(store.days[date].tasks).score >= 60
    ) {
      count++;
      date = addDays(date, -1);
    }
    return count;
  }, [store.days, today]);
  const bestStreak = Math.max(
    streak,
    ...history.map(([, d]) => (dayStats(d.tasks || []).score >= 60 ? 1 : 0)),
  );
  const motivation =
    score === 100
      ? "Perfect day. You made every task count."
      : score >= 80
        ? "Excellent momentum — keep it going."
        : score >= 60
          ? "Good work. A little consistency goes a long way."
          : "Small steps today, stronger days tomorrow.";

  async function addTask(date, task) {
    const existing = store.days[date]?.tasks || [];
    if (
      existing.some(
        (t) => t.title.trim().toLowerCase() === task.title.trim().toLowerCase(),
      )
    )
      throw new Error("A task with this title already exists for that day.");
    const localTask = { ...task, id: uid(), date, status: task.status || "pending" };
    if (getToken()) {
      const response = await tasksApi.create(localTask);
      updateDay(date, [...existing, normalizeTask(response.task || response.data || response, date)]);
    } else updateDay(date, [...existing, localTask]);
    return true;
  }
  async function saveTask(date, task) {
    if (task.id) {
      const response = getToken()
        ? await tasksApi.update(task.id, { ...task, date })
        : null;
      const savedTask = response?.task || response?.data || task;
      updateDay(
        date,
        (store.days[date]?.tasks || []).map((t) =>
          t.id === task.id ? normalizeTask(savedTask, date) : t,
        ),
      );
    } else await addTask(date, task);
    setModal(null);
  }
  async function toggleTask(date, task) {
    const status = task.status === "completed" ? "pending" : "completed";
    if (getToken()) await tasksApi.status(task.id, status);
    updateDay(
      date,
      (store.days[date]?.tasks || []).map((t) =>
        t.id === task.id ? { ...t, status } : t,
      ),
    );
  }
  async function deleteTask(date, id) {
    if (window.confirm("Delete this task?")) {
      if (getToken()) await tasksApi.remove(id);
      updateDay(
        date,
        (store.days[date]?.tasks || []).filter((t) => t.id !== id),
      );
    }
  }

  const nav = [
    ["Dashboard", LayoutDashboard],
    ["Today’s Tasks", ListTodo],
    ["Tomorrow", CalendarDays],
    ["Analytics", BarChart3],
    ["History", Clock3],
    ["Settings", Settings],
  ];
  const displayName = store.displayName || "Anmol Panchal";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
  const selectPage = (nextPage) => {
    setPage(nextPage);
    setMobileMenuOpen(false);
  };
  function enterAuth(mode = "login") {
    setAuthMode(mode);
    setPage("Auth");
  }
  async function handleAuth({ name, email, password }) {
    const response = authMode === "signup"
      ? await authApi.register({ name, email, password })
      : await authApi.login({ email, password });
    const user = response.user || response.data?.user || response.data;
    setToken(response.token || response.data?.token);
    const nextAccount = { name: user.name || name, email: user.email || email };
    const accounts = readAccounts();
    const isNewAccount = authMode === "signup";
    const nextAccounts = accounts.some((item) => item.email === email)
      ? accounts.map((item) => (item.email === email ? nextAccount : item))
      : [...accounts, nextAccount];
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(nextAccounts));
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(nextAccount));
    sessionStorage.setItem(AUTH_KEY, "authenticated");
    setAccount(nextAccount);
    const nextStore = readAccountStore(nextAccount, isNewAccount);
    const taskResponse = await tasksApi.list();
    let remoteTasks = taskResponse.tasks || taskResponse.data || [];
    if (!remoteTasks.length && !isNewAccount) {
      const localTasks = Object.entries(nextStore.days).flatMap(([date, day]) =>
        (day.tasks || []).map((task) => ({ ...task, date })),
      );
      for (const task of localTasks) {
        await tasksApi.create(task);
      }
      const migratedResponse = await tasksApi.list();
      remoteTasks = migratedResponse.tasks || migratedResponse.data || [];
    }
    setStore({ ...nextStore, displayName: nextAccount.name, days: tasksToDays(remoteTasks) });
    setDark(nextStore.theme === "dark");
    setApiReady(true);
    setPage("Dashboard");
  }
  function logout() {
    authApi.logout().catch(() => {});
    setToken(null);
    sessionStorage.removeItem(AUTH_KEY);
    setPage("Landing");
    setMobileMenuOpen(false);
  }
  if (page === "Landing")
    return <Landing onLogin={() => enterAuth("login")} onSignup={() => enterAuth("signup")} />;
  if (page === "Auth")
    return (
      <AuthPage
        mode={authMode}
        account={account}
        onBack={() => setPage("Landing")}
        onModeChange={setAuthMode}
        onSuccess={handleAuth}
      />
    );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={17} />
          </div>
          <span>
            task<span className="brand-accent">flow</span>
          </span>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {nav.map(([label, Icon]) => (
            <button
              key={label}
              className={`nav-item ${page === label ? "active" : ""}`}
              onClick={() => selectPage(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "Today’s Tasks" && (
                <b>{tasks.filter((t) => t.status === "pending").length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="focus-card">
            <div className="focus-icon">
              <Target size={17} />
            </div>
            <strong>Keep your focus</strong>
            <span>Plan tonight. Win tomorrow.</span>
            <div className="focus-meter">
              <i style={{ width: `${completion}%` }} />
            </div>
          </div>
          <button className="profile" onClick={() => selectPage("Settings")}>
            <div className="avatar">{initials}</div>
            <div>
              <strong>{displayName}</strong>
              <span>Personal workspace</span>
            </div>
            <MoreHorizontal size={17} />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <div className="crumb">
            <span>{page}</span>
            <ChevronRight size={14} />
            <b>{page === "Dashboard" ? "Overview" : page}</b>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications">
              <Bell size={18} />
              <i />
            </button>
            <button className="theme-toggle" onClick={() => setDark((v) => !v)}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="avatar top-avatar" onClick={() => selectPage("Settings")}>
              {initials}
            </button>
          </div>
        </header>
        {page === "Dashboard" && (
          <Dashboard
            {...{
              today,
              tasks,
              tomorrowTasks,
              score,
              completion,
              streak,
              bestStreak,
              productiveDays,
              completed,
              motivation,
              setModal,
              toggleTask,
              deleteTask,
              setPage,
              history,
              displayName,
            }}
          />
        )}
        {page === "Today’s Tasks" && (
          <TasksPage
            {...{
              tasks,
              query,
              setQuery,
              filters,
              setFilters,
              setModal,
              toggleTask,
              deleteTask,
              today,
            }}
          />
        )}
        {page === "Tomorrow" && (
          <TomorrowPage
            {...{ tomorrow, tomorrowTasks, setModal, toggleTask, deleteTask }}
          />
        )}
        {page === "Analytics" && <AnalyticsPage {...{ store, history }} />}
        {page === "History" && (
          <HistoryPage {...{ store, selectedDate, setSelectedDate }} />
        )}
        {page === "Settings" && (
          <SettingsPage {...{ dark, setDark, setStore, displayName, account, onLogout: logout }} />
        )}
      </main>
      {mobileMenuOpen && (
        <button
          className="mobile-menu-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      {modal && (
        <TaskModal
          date={modal.date}
          task={modal.task}
          onClose={() => setModal(null)}
          onSave={saveTask}
        />
      )}
    </div>
  );
}

function Landing({ onLogin, onSignup }) {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={17} />
          </div>
          <span>
            task<span className="brand-accent">flow</span>
          </span>
        </div>
        <div className="landing-actions">
          <button className="landing-login" onClick={onLogin}>Log in</button>
          <button className="landing-signup" onClick={onSignup}>Get started <ChevronRight size={16} /></button>
        </div>
      </header>
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">A calmer way to get things done</p>
          <h1>Turn your plans into <span>progress.</span></h1>
          <p className="landing-description">
            Plan your day, keep your focus, and build momentum with a task
            workspace designed to make progress feel simple.
          </p>
          <button className="primary-button landing-cta" onClick={onSignup}>
            Start planning <ChevronRight size={17} />
          </button>
          <div className="landing-proof">
            <CheckCircle2 size={17} />
            <span>Everything you need for a more intentional day.</span>
          </div>
        </div>
        <div className="landing-preview" aria-label="Taskflow workspace preview">
          <div className="landing-preview-top">
            <div>
              <span className="label">TODAY'S FOCUS</span>
              <strong>Make it count.</strong>
            </div>
            <div className="landing-preview-score">82%</div>
          </div>
          <div className="landing-preview-progress"><i /></div>
          <div className="landing-preview-tasks">
            <div className="landing-preview-task is-done">
              <CheckCircle2 size={18} />
              <span>Review your priorities</span>
            </div>
            <div className="landing-preview-task">
              <span className="landing-preview-check" />
              <span>Complete focused work</span>
            </div>
            <div className="landing-preview-task">
              <span className="landing-preview-check" />
              <span>Reflect on your progress</span>
            </div>
          </div>
          <div className="landing-preview-footer">
            <span>Daily streak</span>
            <strong>7 days <Flame size={15} /></strong>
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthPage({ mode, onBack, onModeChange, onSuccess }) {
  const isSignup = mode === "signup";
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function changeMode(nextMode) {
    setForm({ name: "", email: "", password: "", confirm: "" });
    setError("");
    setShowPassword(false);
    onModeChange(nextMode);
  }

  function submit(event) {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (isSignup && !form.name.trim()) return setError("Please enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
    if (form.password.length < 8) return setError("Your password must be at least 8 characters.");
    if (isSignup && form.password !== form.confirm) return setError("Passwords do not match.");
    setError("");
    setLoading(true);
    Promise.resolve(onSuccess({
      name: isSignup ? form.name.trim() : undefined,
      email,
      password: form.password,
    }))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }

  return (
    <main className="auth-page">
      <button className="auth-back" onClick={onBack}><ArrowLeft size={16} /> Back to home</button>
      <section className="auth-card">
        <div className="auth-brand"><div className="brand-mark"><Sparkles size={17} /></div><span>task<span className="brand-accent">flow</span></span></div>
        <p className="eyebrow">{isSignup ? "START WITH INTENTION" : "WELCOME BACK"}</p>
        <h1>{isSignup ? "Build your best days." : "Pick up where you left off."}</h1>
        <p className="auth-subtitle">{isSignup ? "Create your private workspace and turn plans into progress." : "Your focus plan is waiting for you."}</p>
        <form className="auth-form" onSubmit={submit}>
          {isSignup && <label><span>Full name</span><div className="input-wrap"><UserRound size={17} /><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Anmol Panchal" autoComplete="name" /></div></label>}
          <label><span>Email address</span><div className="input-wrap"><Mail size={17} /><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" autoComplete="email" /></div></label>
          <label><span>Password</span><div className="input-wrap"><LockKeyhole size={17} /><input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" autoComplete={isSignup ? "new-password" : "current-password"} /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
          {isSignup && <label><span>Confirm password</span><div className="input-wrap"><LockKeyhole size={17} /><input type={showPassword ? "text" : "password"} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="Repeat your password" autoComplete="new-password" /></div></label>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="primary-button auth-submit" disabled={loading}>{loading ? "Opening workspace..." : isSignup ? "Create workspace" : "Log in"}</button>
        </form>
        <p className="auth-switch">{isSignup ? "Already have an account?" : "New to taskflow?"} <button type="button" onClick={() => changeMode(isSignup ? "login" : "signup")}>{isSignup ? "Log in" : "Create an account"}</button></p>
      </section>
    </main>
  );
}

function dayStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const skipped = tasks.filter((t) => t.status === "skipped").length;
  const totalPoints = tasks.reduce((a, t) => a + points(t), 0);
  const donePoints = tasks
    .filter((t) => t.status === "completed")
    .reduce((a, t) => a + points(t), 0);
  return {
    total,
    completed,
    skipped,
    score: totalPoints ? Math.round((donePoints / totalPoints) * 100) : 0,
    completion: total ? Math.round((completed / total) * 100) : 0,
  };
}
function greeting() {
  const hour = new Date().getHours();
  return hour < 12
    ? "Good morning"
    : hour < 18
      ? "Good afternoon"
      : "Good evening";
}

function Dashboard(p) {
  const recent = p.history
    .slice(-7)
    .map(([date, d]) => ({
      day: new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
      }),
      score: dayStats(d.tasks || []).score,
    }));
  return (
    <div className="content dashboard">
      <section className="welcome">
        <div>
          <p className="eyebrow">
            {formatDate(p.today, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1>
            {greeting()}, {p.displayName.split(/\s+/)[0]} <span className="wave">✦</span>
          </h1>
          <p className="muted">A clear plan makes room for your best work.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => p.setModal({ date: p.today })}
        >
          <Plus size={18} /> Add task
        </button>
      </section>
      <section className="stat-grid">
        <ProgressCard
          completion={p.completion}
          completed={p.completed}
          total={p.tasks.length}
        />
        <ScoreCard score={p.score} />
        <StreakCard streak={p.streak} />
      </section>
      <section className="section-header">
        <div>
          <h2>Today’s tasks</h2>
          <p className="muted">
            {p.tasks.length
              ? `${p.completed} of ${p.tasks.length} tasks complete`
              : "Start with one meaningful task"}
          </p>
        </div>
        <button
          className="text-button"
          onClick={() => p.setPage("Today’s Tasks")}
        >
          View all <ChevronRight size={16} />
        </button>
      </section>
      <div className="task-list">
        {p.tasks.length ? (
          p.tasks
            .slice(0, 4)
            .map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onToggle={() => p.toggleTask(p.today, t)}
                onEdit={() => p.setModal({ date: p.today, task: t })}
                onDelete={() => p.deleteTask(p.today, t.id)}
              />
            ))
        ) : (
          <EmptyState
            text="Your day is a blank canvas."
            action="Add your first task"
            onClick={() => p.setModal({ date: p.today })}
          />
        )}
      </div>
      {p.score >= 100 && (
        <div className="completion-banner">
          <div className="banner-icon">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <strong>Day complete</strong>
            <span>{p.motivation}</span>
          </div>
          <Sparkles size={22} />
        </div>
      )}
      <section className="lower-grid">
        <TomorrowPreview {...p} />
        <div className="card mini-chart">
          <div className="card-heading">
            <div>
              <h3>Weekly rhythm</h3>
              <p className="muted">Your last 7 days</p>
            </div>
            <TrendingUp size={18} className="green-icon" />
          </div>
          <div className="chart-wrap small">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recent}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip content={<ChartTip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--accent)"
                  strokeWidth={3}
                  dot={{ fill: "var(--accent)", strokeWidth: 0, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
      <p className="workflow">
        <span>
          <Check size={14} /> Plan
        </span>
        <b>→</b>
        <span>
          <Zap size={14} /> Execute
        </span>
        <b>→</b>
        <span>
          <Trophy size={14} /> Improve
        </span>
      </p>
    </div>
  );
}
function ProgressCard({ completion, completed, total }) {
  return (
    <div className="card progress-card">
      <div className="card-heading">
        <div>
          <p className="label">TODAY’S PROGRESS</p>
          <h2>
            {completion}% <small>complete</small>
          </h2>
        </div>
        <div
          className="ring-progress"
          style={{ "--progress": `${completion * 3.6}deg` }}
        >
          <span>{completion}%</span>
        </div>
      </div>
      <div className="progress-line">
        <i style={{ width: `${completion}%` }} />
      </div>
      <p className="card-foot">
        <CheckCircle2 size={15} /> {completed} completed{" "}
        <span>of {total} planned</span>
      </p>
    </div>
  );
}
function ScoreCard({ score }) {
  const label =
    score === 100
      ? "Perfect day"
      : score >= 80
        ? "Excellent"
        : score >= 60
          ? "Good progress"
          : score >= 40
            ? "Getting started"
            : "Needs improvement";
  return (
    <div className="card score-card">
      <div className="card-heading">
        <div>
          <p className="label">PRODUCTIVITY SCORE</p>
          <h2>
            {score}
            <small>/100</small>
          </h2>
        </div>
        <div className="score-badge">
          <Zap size={16} /> {label}
        </div>
      </div>
      <div className="score-bar">
        <i style={{ width: `${score}%` }} />
      </div>
      <p className="card-foot">
        <Sparkles size={15} /> Based on priority & effort
      </p>
    </div>
  );
}
function StreakCard({ streak, bestStreak = streak, productiveDays = streak }) {
  return (
    <div className="card streak-card">
      <div className="streak-top">
        <div className="flame">
          <Flame size={21} />
        </div>
        <div>
          <p className="label">CURRENT STREAK</p>
          <h2>
            {streak} <small>{streak === 1 ? "day" : "days"}</small>
          </h2>
        </div>
        <div className="streak-spark">✦</div>
      </div>
      <div className="streak-dots">
        {[...Array(7)].map((_, i) => (
          <i key={i} className={i >= 7 - Math.min(streak, 7) ? "on" : ""}>
            {i >= 7 - Math.min(streak, 7) ? "✓" : ""}
          </i>
        ))}
      </div>
      <div className="streak-stats">
        <span>
          <b>🏆 {bestStreak}</b> best
        </span>
        <span>
          <b>📅 {productiveDays}</b> productive days
        </span>
      </div>
      <p className="card-foot">Reach 60% daily to keep it alive</p>
    </div>
  );
}

function TaskRow({ task, onToggle, onEdit, onDelete, compact = false }) {
  return (
    <div className={`task-row ${task.status === "completed" ? "is-done" : ""}`}>
      <button
        className="check-button"
        aria-label={`Mark ${task.title} complete`}
        onClick={onToggle}
      >
        <Check size={14} />
      </button>
      <div className="task-main">
        <strong>{task.title}</strong>
        {!compact && task.notes && <span>{task.notes}</span>}
        <div className="task-meta">
          <em className={`tag ${task.category.toLowerCase()}`}>
            {task.category}
          </em>
          <em className={`priority ${task.priority.toLowerCase()}`}>
            <i />
            {task.priority}
          </em>
          <span>
            <Clock3 size={13} /> {task.minutes} min
          </span>
        </div>
      </div>
      <div className="task-actions">
        <button onClick={onEdit} aria-label="Edit task">
          <Pencil size={15} />
        </button>
        <button onClick={onDelete} aria-label="Delete task">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
function TomorrowPreview(p) {
  return (
    <div className="card tomorrow-preview">
      <div className="card-heading">
        <div>
          <p className="label">TOMORROW’S PLAN</p>
          <h3>
            {formatDate(addDays(p.today, 1), {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h3>
        </div>
        <button
          className="round-button"
          onClick={() => p.setModal({ date: addDays(p.today, 1) })}
        >
          <Plus size={17} />
        </button>
      </div>
      {p.tomorrowTasks.length ? (
        <div className="preview-items">
          {p.tomorrowTasks.slice(0, 3).map((t) => (
            <div className="preview-item" key={t.id}>
              <span
                className="tiny-dot"
                style={{ background: colors[t.priority] }}
              />
              {t.title}
              <small>{t.minutes}m</small>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          text="No plans yet for tomorrow."
          action="Plan tomorrow"
          onClick={() => p.setModal({ date: addDays(p.today, 1) })}
        />
      )}
    </div>
  );
}
function EmptyState({ text, action, onClick }) {
  return (
    <div className="empty-state">
      <Coffee size={21} />
      <span>{text}</span>
      {action && (
        <button className="text-button" onClick={onClick}>
          {action} <Plus size={14} />
        </button>
      )}
    </div>
  );
}

function TasksPage({
  tasks,
  query,
  setQuery,
  filters,
  setFilters,
  setModal,
  toggleTask,
  deleteTask,
  today,
}) {
  let shown = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) &&
      (filters.category === "All" || t.category === filters.category) &&
      (filters.priority === "All" || t.priority === filters.priority),
  );
  shown = [...shown].sort((a, b) =>
    filters.sort === "time"
      ? b.minutes - a.minutes
      : PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority),
  );
  return (
    <div className="content">
      <PageTitle
        title="Today’s tasks"
        subtitle={`${formatDate(today)} · ${tasks.filter((t) => t.status === "completed").length}/${tasks.length} completed`}
        action={
          <button
            className="primary-button"
            onClick={() => setModal({ date: today })}
          >
            <Plus size={18} /> Add task
          </button>
        }
      />
      <div className="filterbar">
        <div className="search">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
          />
        </div>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option>All</option>
          {CATEGORIES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
        >
          <option>All</option>
          {PRIORITIES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
        >
          <option value="priority">Sort: priority</option>
          <option value="time">Sort: time</option>
        </select>
      </div>
      <div className="task-list full-list">
        {shown.length ? (
          shown.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onToggle={() => toggleTask(today, t)}
              onEdit={() => setModal({ date: today, task: t })}
              onDelete={() => deleteTask(today, t.id)}
            />
          ))
        ) : (
          <EmptyState
            text={
              tasks.length
                ? "No tasks match these filters."
                : "No tasks planned for today."
            }
            action="Add a task"
            onClick={() => setModal({ date: today })}
          />
        )}
      </div>
    </div>
  );
}
function TomorrowPage({ tomorrow, tomorrowTasks, setModal, toggleTask, deleteTask }) {
  return (
    <div className="content">
      <PageTitle
        title="Tomorrow’s plan"
        subtitle={`${formatDate(tomorrow)} · Prepare a lighter, clearer day`}
        action={
          <button
            className="primary-button"
            onClick={() => setModal({ date: tomorrow })}
          >
            <Plus size={18} /> Add task
          </button>
        }
      />
      <div className="plan-callout">
        <div className="callout-icon">
          <Sun size={20} />
        </div>
        <div>
          <strong>Plan with intention</strong>
          <span>
            Choose the 3–5 things that will make tomorrow feel meaningful.
          </span>
        </div>
      </div>
      <div className="task-list full-list">
        {tomorrowTasks.length ? (
          tomorrowTasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              compact
              onToggle={() => toggleTask(tomorrow, t)}
              onEdit={() => setModal({ date: tomorrow, task: t })}
              onDelete={() => deleteTask(tomorrow, t.id)}
            />
          ))
        ) : (
          <EmptyState
            text="Tomorrow is wide open."
            action="Add your first plan"
            onClick={() => setModal({ date: tomorrow })}
          />
        )}
      </div>
    </div>
  );
}

function AnalyticsPage({ store, history }) {
  const days = history.slice(-30);
  const scores = days.map(([date, d]) => ({
    date: new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    score: dayStats(d.tasks || []).score,
  }));
  const seven = scores.slice(-7);
  const status = ["completed", "pending", "skipped"].map((key) => ({
    name: key[0].toUpperCase() + key.slice(1),
    value: days.reduce(
      (n, [, d]) => n + (d.tasks || []).filter((t) => t.status === key).length,
      0,
    ),
  }));
  const category = CATEGORIES.map((name) => {
    const ts = days
      .flatMap(([, d]) => d.tasks || [])
      .filter((t) => t.category === name);
    return {
      name,
      rate: ts.length
        ? Math.round(
            (ts.filter((t) => t.status === "completed").length / ts.length) *
              100,
          )
        : 0,
    };
  }).filter((x) => x.rate || days.length);
  const total = days.reduce((n, [, d]) => n + (d.tasks || []).length, 0);
  const done = days.reduce(
    (n, [, d]) =>
      n + (d.tasks || []).filter((t) => t.status === "completed").length,
    0,
  );
  const avg = scores.length
    ? Math.round(scores.reduce((n, d) => n + d.score, 0) / scores.length)
    : 0;
  return (
    <div className="content">
      <PageTitle
        title="Analytics"
        subtitle="Notice your patterns. Improve with intention."
      />
      <div className="analytics-summary">
        <div>
          <span>Total tasks</span>
          <strong>{total}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{done}</strong>
        </div>
        <div>
          <span>Completion rate</span>
          <strong>{total ? Math.round((done / total) * 100) : 0}%</strong>
        </div>
        <div>
          <span>Average score</span>
          <strong>{avg}</strong>
        </div>
      </div>
      <div className="analytics-grid">
        <ChartCard
          title="7-day productivity score"
          subtitle="A focused view of this week"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={seven}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
              />
              <Tooltip content={<ChartTip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--accent)"
                strokeWidth={3}
                dot={{ fill: "var(--accent)", strokeWidth: 0, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="30-day productivity trend"
          subtitle="Your longer rhythm"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scores}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="date" hide />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
              />
              <Tooltip content={<ChartTip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#8ca2bb"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="Category performance"
          subtitle="Completion rate by category"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={category}
              layout="vertical"
              margin={{ left: 8, right: 10 }}
            >
              <CartesianGrid horizontal={false} stroke="var(--line)" />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="name"
                width={68}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
              />
              <Bar
                dataKey="rate"
                fill="var(--accent)"
                radius={[0, 5, 5, 0]}
                barSize={12}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Task status" subtitle="Across the selected period">
          <div className="donut-wrap">
            <ResponsiveContainer width="56%" height="100%">
              <PieChart>
                <Pie
                  data={status}
                  dataKey="value"
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={4}
                >
                  {status.map((_, i) => (
                    <Cell key={i} fill={["#6fbe9b", "#e6a84d", "#9aaabd"][i]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="legend">
              {status.map((x, i) => (
                <div key={x.name}>
                  <i
                    style={{ background: ["#6fbe9b", "#e6a84d", "#9aaabd"][i] }}
                  />
                  <span>{x.name}</span>
                  <b>{x.value}</b>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card chart-card">
      <div className="card-heading">
        <div>
          <h3>{title}</h3>
          <p className="muted">{subtitle}</p>
        </div>
        <MoreHorizontal size={18} className="muted-icon" />
      </div>
      <div className="chart-wrap">{children}</div>
    </div>
  );
}
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <span>{label}</span>
      <strong>
        {payload[0].value}
        {payload[0].dataKey === "score" || payload[0].dataKey === "rate"
          ? "%"
          : ""}
      </strong>
    </div>
  );
}

function HistoryPage({ store, selectedDate, setSelectedDate }) {
  const selected = store.days[selectedDate]?.tasks || [];
  const stat = dayStats(selected);
  const month = new Date(`${selectedDate}T12:00:00`);
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  return (
    <div className="content">
      <PageTitle
        title="History"
        subtitle="A quiet record of the work you’ve done."
      />
      <div className="history-layout">
        <div className="card calendar-card">
          <div className="calendar-head">
            <button onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
              ‹
            </button>
            <h3>
              {month.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h3>
            <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
              ›
            </button>
          </div>
          <div className="weekday">
            {["S", "M", "T", "W", "T", "F", "S"].map((x, i) => (
              <span key={i}>{x}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {[...Array(first)].map((_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {[...Array(daysInMonth)].map((_, i) => {
              const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
              const st = dayStats(store.days[date]?.tasks || []);
              return (
                <button
                  key={date}
                  className={`${date === selectedDate ? "selected" : ""} ${date === todayKey() ? "today" : ""}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <span>{i + 1}</span>
                  {st.total > 0 && (
                    <i className={st.score >= 60 ? "good" : "low"} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="card history-detail">
          <div className="detail-date">
            <div className="date-block">
              <span>
                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                  "en-US",
                  { weekday: "short" },
                )}
              </span>
              <strong>{new Date(`${selectedDate}T12:00:00`).getDate()}</strong>
            </div>
            <div>
              <h3>
                {formatDate(selectedDate, { month: "long", day: "numeric" })}
              </h3>
              <p className="muted">
                {selectedDate === todayKey() ? "Today" : "Daily review"}
              </p>
            </div>
          </div>
          <div className="detail-score">
            <strong>{stat.score}</strong>
            <span>Daily score</span>
          </div>
          <div className="detail-stats">
            <div>
              <CheckCircle2 size={16} />
              <strong>{stat.completed}</strong>
              <span>Completed</span>
            </div>
            <div>
              <ListTodo size={16} />
              <strong>{stat.total}</strong>
              <span>Planned</span>
            </div>
            <div>
              <X size={16} />
              <strong>{stat.skipped}</strong>
              <span>Skipped</span>
            </div>
          </div>
          <h4>Tasks from this day</h4>
          {selected.length ? (
            selected.map((t) => (
              <div className="history-task" key={t.id}>
                <i className={t.status} /> <span>{t.title}</span>
                <small>{t.status}</small>
              </div>
            ))
          ) : (
            <EmptyState text="No tasks recorded for this day." />
          )}
        </div>
      </div>
    </div>
  );
}
function SettingsPage({ dark, setDark, setStore, displayName, account, onLogout }) {
  const [name, setName] = useState(displayName);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(displayName);
    setSaved(false);
  }, [displayName]);

  function saveName(event) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) return;
    setStore((store) => ({ ...store, displayName: nextName }));
    setName(nextName);
    setSaved(true);
  }

  return (
    <div className="content">
      <PageTitle title="Settings" subtitle="Make taskflow feel like yours." />
      <div className="settings-list card">
        <form className="setting-row personalization-row" onSubmit={saveName}>
          <div className="setting-icon">
            <Pencil size={18} />
          </div>
          <div className="setting-copy">
            <strong>Personalize your workspace</strong>
            <span>Choose the name taskflow uses to welcome you.</span>
            <input
              className="name-input"
              aria-label="Your name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSaved(false);
              }}
              maxLength={60}
              required
            />
          </div>
          <button className="outline-button" type="submit">
            Save name
          </button>
          {saved && <small className="saved-message">Saved</small>}
        </form>
        <div className="setting-row">
          <div className="setting-icon">
            <Moon size={18} />
          </div>
          <div className="setting-copy">
            <strong>Appearance</strong>
            <span>Use a calmer dark theme in low light.</span>
          </div>
          <button
            className={`switch ${dark ? "on" : ""}`}
            onClick={() => setDark((v) => !v)}
          >
            <i />
          </button>
        </div>
        <div className="setting-row">
          <div className="setting-icon">
            <Mail size={18} />
          </div>
          <div className="setting-copy">
            <strong>Account</strong>
            <span>{account?.email || "Personal workspace"}</span>
          </div>
          <button className="outline-button" onClick={onLogout}>
            <LogOut size={15} /> Log out
          </button>
        </div>
        <div className="setting-row">
          <div className="setting-icon">
            <Bell size={18} />
          </div>
          <div>
            <strong>Planning reminder</strong>
            <span>Keep tomorrow’s plan visible after 8pm.</span>
          </div>
          <button className="switch on">
            <i />
          </button>
        </div>
        <div className="setting-row">
          <div className="setting-icon">
            <CircleHelp size={18} />
          </div>
          <div>
            <strong>Scoring system</strong>
            <span>
              High 3 pts · Medium 2 pts · Low 1 pt, weighted by effort.
            </span>
          </div>
        </div>
        <div className="setting-row danger-row">
          <div className="setting-icon">
            <Trash2 size={18} />
          </div>
          <div>
            <strong>Reset workspace</strong>
            <span>Clear local tasks and start with a fresh workspace.</span>
          </div>
          <button
            className="outline-button"
            onClick={() => {
              if (window.confirm("Reset all local task data?"))
                setStore(emptyStore());
            }}
          >
            Reset data
          </button>
        </div>
      </div>
    </div>
  );
}
function PageTitle({ title, subtitle, action }) {
  return (
    <section className="page-title">
      <div>
        <p className="eyebrow">YOUR WORKSPACE</p>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      {action}
    </section>
  );
}
function TaskModal({ date, task, onClose, onSave }) {
  const [form, setForm] = useState(
    task || {
      title: "",
      notes: "",
      category: "Projects",
      priority: "Medium",
      minutes: 30,
    },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function submit() {
    const title = form.title.trim();
    const minutes = Number(form.minutes);
    if (!title) {
      setError("Task title is required.");
      return;
    }
    if (!CATEGORIES.includes(form.category)) {
      setError("Please choose a valid category.");
      return;
    }
    if (!PRIORITIES.includes(form.priority)) {
      setError("Please choose a valid priority.");
      return;
    }
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      setError("Estimated time must be a whole number from 1 to 1440 minutes.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(date, { ...form, title, minutes });
    } catch (saveError) {
      setError(saveError.message || "The task could not be saved.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-head">
          <div>
            <p className="eyebrow">{task ? "EDIT TASK" : "NEW TASK"}</p>
            <h2>{task ? "Refine your task" : "Add a task"}</h2>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <label>
          Task title
          <input
            autoFocus
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="What needs your attention?"
          />
        </label>
        <label>
          Notes <span className="optional">optional</span>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Add a little context..."
            rows="3"
          />
        </label>
        <div className="form-grid">
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {CATEGORIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
            >
              {PRIORITIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Estimated time{" "}
          <div className="time-input">
            <input
              type="number"
              min="5"
              step="5"
              value={form.minutes}
              onChange={(e) => set("minutes", Number(e.target.value))}
            />
            <span>minutes</span>
          </div>
        </label>
        <div className="modal-footer">
          <span>
            For{" "}
            {formatDate(date, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          <button
            className="primary-button"
            disabled={saving || !form.title.trim()}
            onClick={submit}
          >
            {saving ? "Saving..." : task ? "Save changes" : "Add task"}
          </button>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
      </div>
    </div>
  );
}

export default App;
