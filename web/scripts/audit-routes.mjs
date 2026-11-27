import fs from "fs";
import path from "path";

const navContent = fs.readFileSync("web/src/lib/nav.ts", "utf8");
const hrefRegex = /href:\s*"([^"]+)"/g;
let match;
const hrefs = new Set();
while ((match = hrefRegex.exec(navContent)) !== null) {
  hrefs.add(match[1]);
}

console.log(`Total unique nav hrefs: ${hrefs.size}`);

// Check which routes have direct files, slug catch-alls, or might be missing
const results = {
  direct: [],
  slugCatchAll: [],
  missing: [],
};

for (const href of Array.from(hrefs).sort()) {
  const clean = href.split("?")[0].replace(/^\//, "");
  const directPath = path.join("web/src/app/(console)", clean, "page.tsx");
  if (fs.existsSync(directPath)) {
    results.direct.push(href);
    continue;
  }

  // Check parent directories for slug catch-all like [...slug]/page.tsx or [[...slug]]/page.tsx or [slug]/page.tsx
  const parts = clean.split("/");
  let found = false;
  for (let i = parts.length - 1; i >= 1; i--) {
    const parentDir = path.join("web/src/app/(console)", parts.slice(0, i).join("/"));
    const catchAll = path.join(parentDir, "[...slug]", "page.tsx");
    const optCatchAll = path.join(parentDir, "[[...slug]]", "page.tsx");
    const singleSlug = path.join(parentDir, "[slug]", "page.tsx");

    if (fs.existsSync(catchAll)) {
      results.slugCatchAll.push({ href, file: catchAll.replace(/\\/g, "/"), key: parts.slice(i).join("/") });
      found = true;
      break;
    }
    if (fs.existsSync(optCatchAll)) {
      results.slugCatchAll.push({ href, file: optCatchAll.replace(/\\/g, "/"), key: parts.slice(i).join("/") });
      found = true;
      break;
    }
    if (i === parts.length - 1 && fs.existsSync(singleSlug)) {
      results.slugCatchAll.push({ href, file: singleSlug.replace(/\\/g, "/"), key: parts[i] });
      found = true;
      break;
    }
  }

  if (!found) {
    // Check root (console) catch-all
    results.missing.push(href);
  }
}

console.log(`Direct page files: ${results.direct.length}`);
console.log(`Handled by slug catch-alls: ${results.slugCatchAll.length}`);
console.log(`Completely missing route folders: ${results.missing.length}`);
if (results.missing.length > 0) {
  console.log("Missing hrefs:", results.missing);
}

// Now let us analyze the slugCatchAll routes to see which ones are handled vs fallback to DepartmentPage
const unhandledByCatchAll = [];
const handledByCatchAll = [];

for (const item of results.slugCatchAll) {
  const fileContent = fs.readFileSync(item.file, "utf8");
  // Check if key is explicitly handled
  const keyEscaped = item.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const isHandled =
    new RegExp(`key === "${keyEscaped}"|key === ''|slug === "${keyEscaped}"`).test(fileContent) ||
    new RegExp(`VARIANTS\\[key\\]|CONFIGS\\[key\\]|PRODUCTION_PAGES\\[key|KINDS\\[key\\]|ROUTES\\[key\\]`).test(fileContent);

  if (isHandled) {
    handledByCatchAll.push(item);
  } else {
    unhandledByCatchAll.push(item);
  }
}

console.log(`\nCatch-all routes handled: ${handledByCatchAll.length}`);
console.log(`Catch-all routes unhandled (FALLBACK TO DepartmentPage): ${unhandledByCatchAll.length}`);

console.log("\n--- UNHANDLED ROUTES FALLING BACK TO 'Module not built yet' ---");
for (const u of unhandledByCatchAll) {
  console.log(`${u.href} -> ${u.file} (key: "${u.key}")`);
}
