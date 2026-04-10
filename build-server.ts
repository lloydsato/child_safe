// This script bundles server.ts into dist-server/server.js for production
import { execSync } from "child_process";
import { mkdirSync } from "fs";

mkdirSync("dist-server", { recursive: true });

execSync(
  `npx esbuild server.ts --bundle --format=esm --platform=node --target=node20 --outfile=dist-server/server.js --external:better-sqlite3 --external:bcryptjs --external:express --external:jsonwebtoken --external:multer --external:cors --external:vite --external:lightningcss --external:dotenv`,
  { stdio: "inherit" }
);

console.log("Server bundled to dist-server/server.js");
