import fs from "fs";
import path from "path";

export const config = {
  api: {
    responseLimit: false,
  },
};

const MIME_MAP = {
  // Images
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".avif": "image/avif",
  // Videos
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/mp4",
  ".ogg": "video/ogg",
  ".ogv": "video/ogg",
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

    const mediaFiles = [];

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
                mediaFiles.push({
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
    mediaFiles.sort((a, b) => b.mtimeMs - a.mtimeMs);

    if (mediaFiles.length === 0) {
      return res.status(404).send("No background media found in directory");
    }

    const latest = mediaFiles[0];
    const isVideo = (MIME_MAP[latest.ext] || "").startsWith("video/");
    const contentType = MIME_MAP[latest.ext] || (isVideo ? "video/mp4" : "image/jpeg");

    // Keep public/background in sync for small images if available, without blocking event loop or mutating timestamps
    if (!isVideo && latest.size < 5 * 1024 * 1024) {
      try {
        const publicBgDir = path.resolve(process.cwd(), "public", "background");
        if (fs.existsSync(publicBgDir) && path.dirname(latest.filePath) !== publicBgDir) {
          const dest = path.join(publicBgDir, latest.file);
          if (!fs.existsSync(dest) || fs.statSync(dest).mtimeMs < latest.mtimeMs) {
            fs.copyFileSync(latest.filePath, dest);
            fs.utimesSync(dest, latest.mtime, latest.mtime);
          }
        }
      } catch {
        // Non-critical sync
      }
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
        type: isVideo ? "video" : "image",
        isVideo,
        contentType,
      });
    }

    const fileSize = latest.size;
    const rangeHeader = req.headers.range;

    // Common caching & validation headers
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("ETag", `"${Math.floor(latest.mtimeMs)}-${latest.size}"`);
    res.setHeader("Last-Modified", latest.mtime.toUTCString());

    // Only process Range if it starts with "bytes=" (RFC 9110: ignore unknown range units)
    const bytesRangeMatch = rangeHeader ? rangeHeader.match(/^bytes\s*=\s*(.+)$/i) : null;

    if (bytesRangeMatch) {
      // If multiple ranges requested (e.g. bytes=0-10, 20-30), take the first range
      const spec = bytesRangeMatch[1].split(",")[0].trim();
      const dashIdx = spec.indexOf("-");

      if (dashIdx === -1) {
        res.setHeader("Content-Range", `bytes */${fileSize}`);
        return res.status(416).end();
      }

      const rawStart = spec.substring(0, dashIdx).trim();
      const rawEnd = spec.substring(dashIdx + 1).trim();

      let start;
      let end;

      if (rawStart === "" && rawEnd !== "") {
        // Suffix range: bytes=-N (e.g. bytes=-500 -> last 500 bytes)
        const suffix = parseInt(rawEnd, 10);
        if (isNaN(suffix) || suffix <= 0) {
          res.setHeader("Content-Range", `bytes */${fileSize}`);
          return res.status(416).end();
        }
        start = Math.max(0, fileSize - suffix);
        end = fileSize - 1;
      } else if (rawStart !== "" && rawEnd === "") {
        // Prefix range: bytes=N- (from N to end of file)
        start = parseInt(rawStart, 10);
        end = fileSize - 1;
      } else if (rawStart !== "" && rawEnd !== "") {
        // Specific range: bytes=N-M
        start = parseInt(rawStart, 10);
        end = parseInt(rawEnd, 10);
      } else {
        res.setHeader("Content-Range", `bytes */${fileSize}`);
        return res.status(416).end();
      }

      if (isNaN(start) || isNaN(end) || start > end || start >= fileSize || start < 0) {
        res.setHeader("Content-Range", `bytes */${fileSize}`);
        return res.status(416).end();
      }

      if (end >= fileSize) {
        end = fileSize - 1;
      }

      const chunkSize = end - start + 1;

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      res.setHeader("Content-Length", chunkSize);
      res.setHeader("Content-Type", contentType);

      if (req.method === "HEAD") {
        return res.end();
      }

      const stream = fs.createReadStream(latest.filePath, { start, end });
      return new Promise((resolve) => {
        let resolved = false;
        const cleanup = () => {
          if (!resolved) {
            resolved = true;
            stream.destroy();
            resolve();
          }
        };

        res.on("close", cleanup);
        res.on("finish", cleanup);
        stream.on("end", cleanup);
        stream.on("error", () => {
          if (!res.headersSent) {
            res.status(500).send("Error streaming media");
          }
          cleanup();
        });

        stream.pipe(res);
      });
    }

    // Full content response (200 OK)
    res.status(200);
    res.setHeader("Content-Length", fileSize);
    res.setHeader("Content-Type", contentType);

    if (req.method === "HEAD") {
      return res.end();
    }

    const stream = fs.createReadStream(latest.filePath);
    return new Promise((resolve) => {
      let resolved = false;
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          stream.destroy();
          resolve();
        }
      };

      res.on("close", cleanup);
      res.on("finish", cleanup);
      stream.on("end", cleanup);
      stream.on("error", () => {
        if (!res.headersSent) {
          res.status(500).send("Error streaming media");
        }
        cleanup();
      });

      stream.pipe(res);
    });
  } catch {
    return res.status(500).send("Error reading background media");
  }
}
