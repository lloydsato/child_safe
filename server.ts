import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local environment variables (important for OPENROUTER_API_KEY)
// In production, server runs from dist-server/, so look in parent dir for .env.local
const projectRoot = process.env.NODE_ENV === "production" ? path.resolve(__dirname, "..") : __dirname;
dotenv.config({ path: path.join(projectRoot, ".env.local") });
dotenv.config({ path: path.join(projectRoot, ".env") }); // fallback to .env

const DB_PATH = process.env.NODE_ENV === "production"
  ? "/tmp/childguard.db"
  : path.join(__dirname, "childguard.db");

const db = new Database(DB_PATH);
const PORT = parseInt(process.env.PORT || "3000", 10);
const JWT_SECRET = process.env.JWT_SECRET || "childguard-demo-secret-key";

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('ADMIN', 'OFFICER'))
  );
  CREATE TABLE IF NOT EXISTS missing_children (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, age INTEGER, gender TEXT, location TEXT,
    photo_url TEXT, description TEXT, status TEXT DEFAULT 'MISSING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS found_children (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_url TEXT, location TEXT, description TEXT,
    reporter_contact TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS match_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    missing_child_id INTEGER, found_child_id INTEGER,
    confidence_score REAL,
    status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
    ai_analysis TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(missing_child_id) REFERENCES missing_children(id),
    FOREIGN KEY(found_child_id) REFERENCES found_children(id)
  );
`);

const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "ADMIN");
  console.log("Seeded admin user: admin / admin123");
}

// Log API key status for debugging
const apiKeyStatus = process.env.OPENROUTER_API_KEY ? "SET" : (process.env.VITE_OPENROUTER_API_KEY ? "SET (VITE)" : "NOT SET - demo mode");
console.log(`🔑 OPENROUTER_API_KEY: ${apiKeyStatus}`);

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const UPLOAD_DIR = process.env.NODE_ENV === "production" ? "/tmp/uploads" : "./uploads";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s/g, "_"));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
app.use("/uploads", express.static(UPLOAD_DIR));

const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};
const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });
  next();
};

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.get("/api/users", authenticate, isAdmin, (req, res) => {
  res.json(db.prepare("SELECT id, username, role FROM users").all());
});
app.post("/api/users", authenticate, isAdmin, (req, res) => {
  const { username, password, role } = req.body;
  try {
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(username, bcrypt.hashSync(password, 10), role);
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: "Username already exists" });
  }
});

app.post("/api/missing-children", authenticate, upload.single("photo"), (req, res) => {
  const { name, age, gender, location, description } = req.body;
  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
  const result = db.prepare("INSERT INTO missing_children (name, age, gender, location, photo_url, description) VALUES (?, ?, ?, ?, ?, ?)").run(name, age, gender, location, photo_url, description);
  res.json({ id: result.lastInsertRowid, photo_url });
});
app.get("/api/missing-children", authenticate, (req, res) => {
  res.json(db.prepare("SELECT * FROM missing_children ORDER BY created_at DESC").all());
});

app.post("/api/found-children", authenticate, upload.single("photo"), (req, res) => {
  const { location, description, reporter_contact } = req.body;
  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
  const result = db.prepare("INSERT INTO found_children (photo_url, location, description, reporter_contact) VALUES (?, ?, ?, ?)").run(photo_url, location, description, reporter_contact);
  res.json({ id: result.lastInsertRowid, photo_url });
});
app.get("/api/found-children", authenticate, (req, res) => {
  res.json(db.prepare("SELECT * FROM found_children ORDER BY created_at DESC").all());
});

app.get("/api/matches", authenticate, (req, res) => {
  res.json(db.prepare(`
    SELECT m.*, mc.name as missing_name, mc.photo_url as missing_photo,
           fc.photo_url as found_photo, fc.location as found_location
    FROM match_results m
    JOIN missing_children mc ON m.missing_child_id = mc.id
    JOIN found_children fc ON m.found_child_id = fc.id
    ORDER BY m.confidence_score DESC
  `).all());
});
app.post("/api/matches", authenticate, (req, res) => {
  const { missing_child_id, found_child_id, confidence_score, ai_analysis } = req.body;
  db.prepare("INSERT INTO match_results (missing_child_id, found_child_id, confidence_score, ai_analysis) VALUES (?, ?, ?, ?)").run(missing_child_id, found_child_id, confidence_score, ai_analysis);
  res.json({ success: true });
});
app.patch("/api/matches/:id", authenticate, isAdmin, (req, res) => {
  db.prepare("UPDATE match_results SET status = ? WHERE id = ?").run(req.body.status, req.params.id);
  res.json({ success: true });
});

// AI Face Comparison Helper
async function analyzeFaces(image1Base64: string, image2Base64: string) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    const score = Math.floor(Math.random() * 60) + 20;
    return {
      confidence_score: score,
      analysis: `Demo mode (OPENROUTER_API_KEY not set): Simulated ${score}% similarity score.`
    };
  }

  try {
    // 30-second timeout to prevent hanging on deployed server
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://childsafety-production-58d4.up.railway.app",
        "X-Title": "ChildGuard Face Matcher"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-nano-12b-v2-vl:free",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `You are a professional facial recognition expert. Compare these two images of children. Determine if they could be the same child. Return ONLY valid JSON with keys "confidence_score" (number 0-100) and "analysis" (string describing facial features compared).` },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image1Base64}` } },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image2Base64}` } }
            ]
          }
        ]
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content.replace(/```json|```/g, "").trim();
    const result = JSON.parse(text);
    return {
      confidence_score: result.confidence_score || 0,
      analysis: result.analysis || "No analysis provided."
    };
  } catch (error: any) {
    console.error("OpenRouter API Error:", error?.message || error);
    const score = Math.floor(Math.random() * 50) + 10;
    return {
      confidence_score: score,
      analysis: "Try again (tokens consumed / API error). AI temporarily unavailable so a random simulation score was generated."
    };
  }
}

// REST route for frontend matching
app.post("/api/compare-faces", authenticate, async (req: any, res: any) => {
  const { image1Base64, image2Base64 } = req.body;
  console.log(`[compare-faces] Request received. Image1: ${image1Base64 ? `${image1Base64.length} chars` : 'MISSING'}, Image2: ${image2Base64 ? `${image2Base64.length} chars` : 'MISSING'}`);
  
  if (!image1Base64 || !image2Base64) {
    console.log("[compare-faces] Missing images, returning 400");
    return res.status(400).json({ error: "Two images required" });
  }
  
  const result = await analyzeFaces(image1Base64, image2Base64);
  console.log(`[compare-faces] Result: score=${result.confidence_score}, analysis=${result.analysis.substring(0, 100)}...`);
  res.json(result); // 200 OK so frontend handles it gracefully
});

// Debug endpoint to check server state
app.get("/api/debug", (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
  res.json({
    env: process.env.NODE_ENV,
    hasApiKey: !!apiKey,
    apiKeySource: process.env.OPENROUTER_API_KEY ? "OPENROUTER_API_KEY" : (process.env.VITE_OPENROUTER_API_KEY ? "VITE_OPENROUTER_API_KEY" : "NONE"),
    dbPath: DB_PATH,
    uploadDir: UPLOAD_DIR,
    missingCount: (db.prepare("SELECT COUNT(*) as count FROM missing_children").get() as any).count,
    foundCount: (db.prepare("SELECT COUNT(*) as count FROM found_children").get() as any).count,
    matchCount: (db.prepare("SELECT COUNT(*) as count FROM match_results").get() as any).count,
  });
});

// Server-side match all: compares ALL missing children against ALL found children
// Reads photos directly from disk — no frontend image fetching needed
app.post("/api/match-all", authenticate, async (req: any, res: any) => {
  try {
    const missingChildren = db.prepare("SELECT * FROM missing_children WHERE photo_url IS NOT NULL").all() as any[];
    const foundChildren = db.prepare("SELECT * FROM found_children WHERE photo_url IS NOT NULL").all() as any[];

    console.log(`[match-all] Starting: ${missingChildren.length} missing × ${foundChildren.length} found`);

    if (missingChildren.length === 0 || foundChildren.length === 0) {
      return res.json({ success: true, message: "No records to compare", matchesCreated: 0 });
    }

    let matchesCreated = 0;

    for (const missing of missingChildren) {
      for (const found of foundChildren) {
        // Check if this pair already has a match
        const existingMatch = db.prepare(
          "SELECT id FROM match_results WHERE missing_child_id = ? AND found_child_id = ?"
        ).get(missing.id, found.id);

        if (existingMatch) {
          console.log(`[match-all] Skipping existing match: missing=${missing.id}, found=${found.id}`);
          continue;
        }

        // Read photos from disk
        const missingPhotoPath = path.join(UPLOAD_DIR, missing.photo_url.replace("/uploads/", ""));
        const foundPhotoPath = path.join(UPLOAD_DIR, found.photo_url.replace("/uploads/", ""));

        if (!fs.existsSync(missingPhotoPath) || !fs.existsSync(foundPhotoPath)) {
          console.log(`[match-all] Photo file missing: ${missingPhotoPath} or ${foundPhotoPath}`);
          continue;
        }

        const missingBase64 = fs.readFileSync(missingPhotoPath).toString("base64");
        const foundBase64 = fs.readFileSync(foundPhotoPath).toString("base64");

        console.log(`[match-all] Comparing missing=${missing.id} (${missing.name}) vs found=${found.id}`);
        const result = await analyzeFaces(missingBase64, foundBase64);
        console.log(`[match-all] Result: score=${result.confidence_score}`);

        // Save match regardless of score (so user can see all comparisons)
        db.prepare(
          "INSERT INTO match_results (missing_child_id, found_child_id, confidence_score, ai_analysis) VALUES (?, ?, ?, ?)"
        ).run(missing.id, found.id, result.confidence_score, result.analysis);
        matchesCreated++;
      }
    }

    console.log(`[match-all] Complete: ${matchesCreated} matches created`);
    res.json({ success: true, matchesCreated });
  } catch (err: any) {
    console.error("[match-all] Error:", err);
    res.status(500).json({ error: "Failed to run matching", details: err?.message });
  }
});

// Retry Match Endpoint
app.post("/api/matches/:id/retry", authenticate, isAdmin, async (req: any, res: any) => {
  try {
    const match = db.prepare(`
      SELECT m.*, mc.photo_url as missing_photo, fc.photo_url as found_photo
      FROM match_results m
      JOIN missing_children mc ON m.missing_child_id = mc.id
      JOIN found_children fc ON m.found_child_id = fc.id
      WHERE m.id = ?
    `).get(req.params.id) as any;

    if (!match || !match.missing_photo || !match.found_photo) {
      return res.status(404).json({ error: "Match or photos not found" });
    }

    const missingPath = path.join(UPLOAD_DIR, match.missing_photo.replace("/uploads/", ""));
    const foundPath = path.join(UPLOAD_DIR, match.found_photo.replace("/uploads/", ""));

    if (!fs.existsSync(missingPath) || !fs.existsSync(foundPath)) {
      return res.status(404).json({ error: "Photo files missing from disk" });
    }

    const missingBase64 = fs.readFileSync(missingPath).toString("base64");
    const foundBase64 = fs.readFileSync(foundPath).toString("base64");

    const result = await analyzeFaces(missingBase64, foundBase64);

    db.prepare("UPDATE match_results SET confidence_score = ?, ai_analysis = ? WHERE id = ?").run(
      result.confidence_score, result.analysis, match.id
    );

    res.json({ success: true, result });
  } catch (err: any) {
    console.error("Retry match error:", err);
    res.status(500).json({ error: "Failed to retry match" });
  }
});

app.get("/api/stats", authenticate, (req, res) => {
  const q = (sql: string) => (db.prepare(sql).get() as any).count;
  res.json({
    missing: q("SELECT COUNT(*) as count FROM missing_children"),
    found: q("SELECT COUNT(*) as count FROM found_children"),
    pending: q("SELECT COUNT(*) as count FROM match_results WHERE status = 'PENDING'"),
    approved: q("SELECT COUNT(*) as count FROM match_results WHERE status = 'APPROVED'"),
  });
});

// Serve React build in production
const distPath = path.resolve(__dirname, "../dist");
if (process.env.NODE_ENV === "production") {
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ ChildGuard running on http://localhost:${PORT}`);
});
