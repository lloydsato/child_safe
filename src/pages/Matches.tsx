import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertCircle, ExternalLink, Info, Loader2, X, RefreshCw, MapPin, Clock, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MatchResult } from "../types";
import { useAuth } from "../App";

export default function Matches() {
  const { authFetch } = useAuth();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [matchAllLoading, setMatchAllLoading] = useState(false);
  const [matchAllResult, setMatchAllResult] = useState("");

  const handleMatchAll = async () => {
    setMatchAllLoading(true);
    setMatchAllResult("");
    try {
      const res = await authFetch("/api/match-all", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMatchAllResult(`✅ ${data.matchesCreated} match(es) created`);
        fetchMatches();
      } else {
        setMatchAllResult("❌ Failed to run matching");
      }
    } catch (err) {
      console.error(err);
      setMatchAllResult("❌ Error running matching");
    } finally {
      setMatchAllLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const res = await authFetch("/api/matches");
      if (!res.ok) return;
      const data = await res.json();
      setMatches(data);
    } catch (err) {
      console.error("Failed to fetch matches:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryAnalysis = async (id: number) => {
    setRetryLoading(true);
    try {
      const res = await authFetch(`/api/matches/${id}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        const updatedMatch = data.result;
        
        // Refresh background list
        fetchMatches(); 
        
        // Update currently viewed match
        if (selectedMatch) {
          setSelectedMatch({
            ...selectedMatch,
            confidence_score: updatedMatch.confidence_score,
            ai_analysis: updatedMatch.analysis
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRetryLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchMatches();
        setSelectedMatch(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI Match Results</h1>
          <p className="text-slate-500 mt-1">Review and verify potential matches identified by the AI engine.</p>
        </div>
        <div className="flex items-center gap-3">
          {matchAllResult && (
            <span className="text-sm font-medium text-slate-600">{matchAllResult}</span>
          )}
          <button
            onClick={handleMatchAll}
            disabled={matchAllLoading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 shrink-0"
          >
            {matchAllLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            {matchAllLoading ? "Scanning..." : "Run AI Matching"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {matches.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No matches found yet</h3>
            <p className="text-slate-500 mb-6">Click "Run AI Matching" above to scan all existing records, or matches will appear automatically when you upload new children.</p>
            <button
              onClick={handleMatchAll}
              disabled={matchAllLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {matchAllLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {matchAllLoading ? "Scanning All Records..." : "Scan All Records Now"}
            </button>
          </div>
        ) : (
          matches.map((match) => (
            <motion.div
              key={match.id}
              layout
              className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-center gap-4 sm:gap-8"
            >
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-slate-100 mb-2">
                    <img src={match.missing_photo} alt="Missing" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Missing Report</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    match.confidence_score > 80 ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                  )}>
                    {match.confidence_score.toFixed(1)}% Match
                  </div>
                  <div className="h-px w-8 bg-slate-200" />
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-slate-100 mb-2">
                    <img src={match.found_photo} alt="Found" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Found Child</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">Potential Match: {match.missing_name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4">{match.ai_analysis}</p>
                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    Found at: {match.found_location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    Identified: {new Date(match.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full md:w-auto">
                <div className={cn(
                  "px-4 py-2 rounded-xl text-center text-xs font-bold uppercase tracking-widest mb-2",
                  match.status === 'PENDING' ? "bg-amber-50 text-amber-600" :
                  match.status === 'APPROVED' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                )}>
                  {match.status}
                </div>
                <button
                  onClick={() => setSelectedMatch(match)}
                  className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Info className="w-4 h-4" />
                  Review Details
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] relative"
            >
              <button
                onClick={() => setSelectedMatch(null)}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

              <div className="p-6 sm:p-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Match Verification</h2>
                    <p className="text-slate-500 text-sm">Review AI analysis and confirm identification.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 mb-10">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Missing Record</label>
                        <div className="aspect-square rounded-3xl overflow-hidden border border-slate-200">
                          <img src={selectedMatch.missing_photo} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-center font-bold text-slate-900 mt-2 truncate">{selectedMatch.missing_name}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Found Record</label>
                        <div className="aspect-square rounded-3xl overflow-hidden border border-slate-200">
                          <img src={selectedMatch.found_photo} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-center font-bold text-slate-900 mt-2">Found Child</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">AI Analysis Report</h4>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="text-4xl font-bold text-emerald-600">{selectedMatch.confidence_score.toFixed(1)}%</div>
                        <div className="text-xs font-medium text-slate-500 leading-tight">
                          Confidence score calculated based on facial geometry and key feature alignment.
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed italic">
                        "{selectedMatch.ai_analysis}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                      <p className="text-xs text-amber-700">
                        <strong>Officer Note:</strong> Please verify physical descriptions and contact the reporter before final approval.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusUpdate(selectedMatch.id, 'REJECTED')}
                    className="flex-1 min-w-[140px] bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject Match
                  </button>
                  <button
                    disabled={retryLoading}
                    onClick={() => handleRetryAnalysis(selectedMatch.id)}
                    className="flex-1 min-w-[140px] bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-600 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    {retryLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    Retry Analysis
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusUpdate(selectedMatch.id, 'APPROVED')}
                    className="flex-1 min-w-[140px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Approve Identification
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
