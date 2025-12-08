import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import Gun from 'gun';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 8080;
const distDir = path.join(__dirname, 'dist');

const app = express();

// 1. Enable Gzip Compression for all responses
app.use(compression());

// 2. GunDB Middleware
// This handles HTTP/REST requests to Gun (fallback for WS).
app.use(Gun.serve);

// 3. Serve Static Files with Caching
// Immutable assets (hashed by Vite) can be cached long-term.
app.use(express.static(distDir, {
    maxAge: '1y', // Cache for 1 year
    setHeaders: (res, path) => {
        // Optional: Granular cache control if needed
        if (path.endsWith('.html')) {
            // HTML files should re-validate content
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
    }
}));

// 4. SPA Fallback (Serve index.html for unknown routes)
app.get(/.*/, (req, res, next) => { // Added 'next' parameter for consistency with 'return next()'
    if (!req.accepts('html') || req.path.startsWith('/gun')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
});

// 5. Create HTTP Server
const server = app.listen(port, () => {
    console.log(`Server with Gun relay (and Express + Compression) is running at: http://localhost:${port}`);
});

// 6. Attach Gun to the Server
Gun({ web: server });
console.log(`Gun relay is configured.`);
