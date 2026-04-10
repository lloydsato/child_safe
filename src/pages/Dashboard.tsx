import { useState, useEffect } from "react";
import { ShieldAlert, Search, CheckCircle2, AlertCircle, TrendingUp, Clock } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../App";

interface Stats {
  missing: number;
  found: number;
  pending: number;
  approved: number;
}

export default function Dashboard() {
  const { authFetch } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    authFetch("/api/stats")
      .then(res => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [authFetch]);

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="h-32 bg-slate-200 rounded-3xl w-full" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl" />)}
    </div>
  </div>;

  if (error) return (
    <div className="bg-red-50 border border-red-200 p-8 rounded-3xl text-center">
      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
      <h3 className="text-lg font-bold text-red-700">Failed to load dashboard</h3>
      <p className="text-red-500 text-sm mt-1">Please try refreshing the page.</p>
    </div>
  );

  const cards = [
    { label: "Missing Children", value: stats?.missing, icon: ShieldAlert, color: "bg-red-500", text: "text-red-500" },
    { label: "Found Children", value: stats?.found, icon: Search, color: "bg-blue-500", text: "text-blue-500" },
    { label: "Pending Matches", value: stats?.pending, icon: Clock, color: "bg-amber-500", text: "text-amber-500" },
    { label: "Approved Matches", value: stats?.approved, icon: CheckCircle2, color: "bg-emerald-500", text: "text-emerald-500" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Overview</h1>
          <p className="text-slate-500 mt-1">Real-time monitoring and identification statistics.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-2 text-sm font-medium text-slate-600">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          System Active
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn("p-3 rounded-2xl", card.color + "10")}>
                <card.icon className={cn("w-6 h-6", card.text)} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{card.value}</p>
            <p className="text-sm font-medium text-slate-500 mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-emerald-500" />
            Recent Activity
          </h2>
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-sm">AI Match Approved</p>
                <p className="text-xs text-slate-500 truncate">Case #8291 has been successfully identified.</p>
              </div>
              <span className="ml-auto text-xs text-slate-400 shrink-0">2h ago</span>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Search className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-sm">New Found Child Registered</p>
                <p className="text-xs text-slate-500 truncate">Location: Central Park, Sector 4</p>
              </div>
              <span className="ml-auto text-xs text-slate-400 shrink-0">5h ago</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-4">AI Performance</h2>
            <p className="text-slate-400 text-sm mb-8">Our Gemini-powered facial recognition engine maintains high precision across diverse conditions.</p>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Recognition Accuracy</span>
                  <span className="text-emerald-400">98.4%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[98.4%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Processing Speed</span>
                  <span className="text-blue-400">1.2s / case</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[85%]" />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
