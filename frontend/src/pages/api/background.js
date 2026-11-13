import fs from "fs";
import path from "path";

const MIME_MAP = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export default function handler(req, res) {
  try {
    const candidateDirs = [
      path.resolve(process.cwd(), "..", "background"),
      path.resolve(process.cwd(), "background"),
      path.resolve(process.cwd(), "public", "background"),
      path.resolve(process.cwd(), "frontend", "public", "background"),
    ];

    const uniqueDirs = Array.from(new Set(candidateDirs)).filter((dir) =>
      fs.existsSync(dir)
    );

    if (uniqueDirs.length === 0) {
      return res.status(404).send("Background directory not found");
    }

    const imageFiles = [];

    for (const dir of uniqueDirs) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (MIME_MAP[ext]) {
            const filePath = path.join(dir, file);
            try {
              const stat = fs.statSync(filePath);
              if (stat.isFile()) {
                imageFiles.push({
                  file,
                  filePath,
                  ext,
                  mtimeMs: stat.mtimeMs,
                  size: stat.size,
                  mtime: stat.mtime,
                });
              }
            } catch {
              // Ignore unreadable file
            }
          }
        }
      } catch {
        // Ignore unreadable directory
      }
    }

    // Sort newest modified first
    imageFiles.sort((a, b) => b.mtimeMs - a.mtimeMs);

    if (imageFiles.length === 0) {
      return res.status(404).send("No image found in background directory");
    }

    const latest = imageFiles[0];

    // Keep public/background in sync if available
    try {
      const publicBgDir = path.resolve(process.cwd(), "public", "background");
      if (fs.existsSync(publicBgDir) && path.dirname(latest.filePath) !== publicBgDir) {
        const dest = path.join(publicBgDir, latest.file);
        if (!fs.existsSync(dest) || fs.statSync(dest).mtimeMs < latest.mtimeMs) {
          fs.copyFileSync(latest.filePath, dest);
        }
      }
    } catch {
      // Non-critical sync
    }

    // Info endpoint for real-time polling / hot reload
    if (req.query.info) {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
      );
      return res.status(200).json({
        name: latest.file,
        version: `${Math.floor(latest.mtimeMs)}-${latest.size}`,
        size: latest.size,
        mtime: latest.mtimeMs,
      });
    }

    const contentType = MIME_MAP[latest.ext] || "image/jpeg";
    const imageBuffer = fs.readFileSync(latest.filePath);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", imageBuffer.length);
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("ETag", `"${Math.floor(latest.mtimeMs)}-${latest.size}"`);
    res.setHeader("Last-Modified", latest.mtime.toUTCString());

    return res.status(200).send(imageBuffer);
  } catch {
    return res.status(500).send("Error reading background image");
  }
}
