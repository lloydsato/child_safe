import React, { useState, useEffect } from "react";
import { Plus, Camera, MapPin, Calendar, User as UserIcon, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MissingChild, FoundChild } from "../types";
import { compareFaces } from "../services/geminiService";
import { useAuth } from "../App";

export default function MissingChildren() {
  const { authFetch } = useAuth();
  const [children, setChildren] = useState<MissingChild[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matchingStatus, setMatchingStatus] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "Male",
    location: "",
    description: "",
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await authFetch("/api/missing-children");
      if (!res.ok) return;
      const data = await res.json();
      setChildren(data);
    } catch (err) {
      console.error("Failed to fetch missing children:", err);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMatchingStatus("Uploading record...");

    const data = new FormData();
    data.append("name", formData.name);
    data.append("age", formData.age);
    data.append("gender", formData.gender);
    data.append("location", formData.location);
    data.append("description", formData.description);
    if (file) data.append("photo", file);

    try {
      const res = await authFetch("/api/missing-children", {
        method: "POST",
        body: data,
      });
      const missingChild = await res.json();

      if (res.ok && file) {
        setMatchingStatus("Initiating AI Matching against Found Records...");
        const foundRes = await authFetch("/api/found-children");
        if (!foundRes.ok) throw new Error("Failed to fetch found children");
        const foundChildren: FoundChild[] = await foundRes.json();
        
        const missingImageBase64 = await fileToBase64(file);

        for (const found of foundChildren) {
          if (!found.photo_url) continue;
          
          setMatchingStatus(`Comparing with Found Child from ${found.location}...`);
          try {
            const imgRes = await fetch(found.photo_url);
            // Validate the response is actually an image (not HTML from catch-all route)
            const contentType = imgRes.headers.get("content-type") || "";
            if (!imgRes.ok || !contentType.startsWith("image/")) {
              console.warn(`Skipping found child ${found.id}: got ${contentType} instead of image`);
              continue;
            }
            const blob = await imgRes.blob();
            const foundImageBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            });

            const matchResult = await compareFaces(missingImageBase64, foundImageBase64);
            
            if (matchResult.confidence_score > 30) {
              await authFetch("/api/matches", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  missing_child_id: missingChild.id,
                  found_child_id: found.id,
                  confidence_score: matchResult.confidence_score,
                  ai_analysis: matchResult.analysis
                })
              });
            }
          } catch (err) {
            console.error(`Failed to compare with found child:`, err);
          }
        }

        setModalOpen(false);
        fetchChildren();
        setFormData({ name: "", age: "", gender: "Male", location: "", description: "" });
        setFile(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setMatchingStatus("");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Missing Children</h1>
          <p className="text-slate-500 mt-1">Database of currently reported missing cases.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 shrink-0"
        >
          <Plus className="w-5 h-5" />
          Report Missing
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {children.map((child) => (
          <motion.div
            key={child.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="aspect-[4/5] relative overflow-hidden bg-slate-100">
              {child.photo_url ? (
                <img src={child.photo_url} alt={child.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <UserIcon className="w-12 h-12" />
                </div>
              )}
              <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                Missing
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">{child.name}</h3>
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
                <span className="bg-slate-100 px-2 py-0.5 rounded-md">{child.age} yrs</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded-md">{child.gender}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{child.location}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  Reported: {new Date(child.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] relative"
            >
              {loading && (
                <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                  <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Processing...</h3>
                  <p className="text-slate-500 font-medium">{matchingStatus}</p>
                  <div className="mt-8 w-full max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-emerald-600"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => !loading && setModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

              <div className="p-6 sm:p-10">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Report Missing Child</h2>
                <p className="text-slate-500 mb-8">Fill in the details accurately to help our AI matching system.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="Child's full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Age</label>
                      <input
                        type="number"
                        required
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="Years"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Last Seen Location</label>
                      <input
                        type="text"
                        required
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="City, Area, Landmark"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Photo Upload</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        {file ? (
                          <div className="flex items-center gap-2 text-emerald-600 font-medium">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="truncate max-w-[200px]">{file.name}</span>
                          </div>
                        ) : (
                          <>
                            <Camera className="w-8 h-8 text-slate-300 mb-2" />
                            <span className="text-sm text-slate-500">Click to upload recent photo</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Additional Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 focus:outline-none focus:border-emerald-500 transition-colors h-24 resize-none"
                      placeholder="Physical features, clothing, etc."
                    />
                  </div>

                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      <strong>AI Matching Notice:</strong> Upon submission, our system will compare this photo against all found child reports. This process may take a few moments.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? "Registering & Analyzing..." : "Register Missing Report"}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
