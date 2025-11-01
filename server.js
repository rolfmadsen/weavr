import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Gun from 'gun';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 8080;
const distDir = path.join(__dirname, 'dist');

const requestHandler = (req, res) => {
    // Add CORS headers to every response to allow for HTTP fallbacks
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // First, check if Gun can handle the request for its own routes.
    if (Gun.serve(req, res)) {
        return; // Gun has handled the request.
    }

    // If Gun doesn't handle it, serve our app's static files.
    const requestedPath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);
    const normalizedPath = path.normalize(requestedPath);

    // Security check to prevent accessing files outside the 'dist' directory.
    if (!normalizedPath.startsWith(distDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(normalizedPath, (err, stats) => {
        if (err || !stats.isFile()) {
            // SPA fallback: If the file doesn't exist, serve index.html for client-side routing.
            res.setHeader('Content-Type', 'text/html');
            fs.createReadStream(path.join(distDir, 'index.html')).pipe(res);
        } else {
            // Serve the actual static file.
            const mimeTypes = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.svg': 'image/svg+xml',
            };
            const ext = path.extname(normalizedPath);
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            fs.createReadStream(normalizedPath).pipe(res);
        }
    });
};

// 1. Create the server with the request handler.
const server = http.createServer(requestHandler);

// 2. Attach Gun to the server instance BEFORE it starts listening.
Gun({ web: server });
console.log(`Gun relay is configured.`);

// 3. Start the fully configured server.
server.listen(port, () => {
    console.log(`Server with Gun relay is running at: http://localhost:${port}`);
});
