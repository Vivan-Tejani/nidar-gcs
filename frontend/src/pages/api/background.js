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
    const bgDir = path.join(process.cwd(), "public", "background");

    if (!fs.existsSync(bgDir)) {
      return res.status(404).send("Background directory not found");
    }

    const files = fs.readdirSync(bgDir);

    // Collect all valid image files with their stats
    const imageFiles = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return Boolean(MIME_MAP[ext]);
      })
      .map((file) => {
        const filePath = path.join(bgDir, file);
        const stat = fs.statSync(filePath);
        return {
          file,
          filePath,
          ext: path.extname(file).toLowerCase(),
          mtimeMs: stat.mtimeMs,
          size: stat.size,
          mtime: stat.mtime,
        };
      })
      // Sort newest modified first
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    if (imageFiles.length === 0) {
      return res.status(404).send("No image found in background directory");
    }

    const latest = imageFiles[0];

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
