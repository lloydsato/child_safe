import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, UserPlus, Search, ShieldAlert, CheckCircle2, LogOut, Menu, X, PlusCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Types & Context ---
import { User } from "./types";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper: check if a JWT is expired by decoding its payload
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // If we can't decode it, treat as expired
  }
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

// --- Components ---
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import MissingChildren from "./pages/MissingChildren";
import FoundChildren from "./pages/FoundChildren";
import Matches from "./pages/Matches";
import UserManagement from "./pages/UserManagement";

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== "ADMIN") return <Navigate to="/" />;
  return <>{children}</>;
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  // Default sidebar closed on small screens (<1024px)
  const [isSidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);

  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Missing Children", path: "/missing", icon: ShieldAlert },
    { label: "Found Children", path: "/found", icon: Search },
    { label: "AI Matches", path: "/matches", icon: CheckCircle2 },
    ...(user?.role === "ADMIN" ? [{ label: "User Management", path: "/users", icon: UserPlus }] : []),
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      {/* Mobile overlay when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900 text-white transition-all duration-300 flex flex-col shrink-0",
        isSidebarOpen ? "w-64 fixed inset-y-0 left-0 z-30 lg:static lg:z-auto" : "w-0 lg:w-20 overflow-hidden"
      )}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          {isSidebarOpen && <span className="font-bold text-xl tracking-tight whitespace-nowrap">CHILDGUARD</span>}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors group"
            >
              <item.icon className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 shrink-0" />
              {isSidebarOpen && <span className="font-medium whitespace-nowrap">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold">{user?.username}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={window.location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // On mount: validate stored token before setting auth state
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      // Quick client-side expiry check
      if (isTokenExpired(storedToken)) {
        // Token expired — clear it
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setReady(true);
        return;
      }

      // Token looks valid client-side — verify with server
      fetch("/api/stats", {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => {
          if (res.ok) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          } else {
            // Server rejected the token
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        })
        .catch(() => {
          // Network error — still allow the user in with the token (offline-friendly)
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        })
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  // Wrapper around fetch that auto-logouts on 401
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const currentToken = localStorage.getItem("token");
    const headers = new Headers(options.headers || {});
    if (currentToken) {
      headers.set("Authorization", `Bearer ${currentToken}`);
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      // Token rejected by server — auto-logout
      logout();
    }

    return res;
  }, [logout]);

  // Show nothing while validating token (prevents flash of unauthorized)
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, authFetch }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/missing" element={<ProtectedRoute><Layout><MissingChildren /></Layout></ProtectedRoute>} />
          <Route path="/found" element={<ProtectedRoute><Layout><FoundChildren /></Layout></ProtectedRoute>} />
          <Route path="/matches" element={<ProtectedRoute><Layout><Matches /></Layout></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute adminOnly><Layout><UserManagement /></Layout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
