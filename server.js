const http = require('http');
const fs = require('fs');
const path = require('path');
const urlModule = require('url');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    const parsed = urlModule.parse(req.url, true);
    const pathname = parsed.pathname;

    // ===== RUTA: /watch?vid=VIDEO_ID =====
    // Sirve el reproductor con el video de YouTube especificado
    if (pathname === '/watch' && parsed.query.vid) {
        const vid = parsed.query.vid;
        // Validar que solo contenga caracteres de ID de YouTube
        if (!/^[a-zA-Z0-9_-]{11}$/.test(vid)) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('ID de video inválido');
            return;
        }
        // Servir el reproductor (el HTML lee ?vid= del URL automáticamente)
        const htmlPath = path.join(__dirname, 'reproductor.html');
        fs.readFile(htmlPath, 'utf-8', (err, data) => {
            if (err) { res.writeHead(500); res.end('Error interno'); return; }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
        });
        return;
    }

    // ===== API: /api/generate-link?videoId=URL_O_ID =====
    // Recibe una URL o ID de YouTube y devuelve el enlace personalizado
    if (pathname === '/api/generate-link' && parsed.query.videoId) {
        const input = decodeURIComponent(parsed.query.videoId).trim();
        const videoId = extractYouTubeId(input);
        if (!videoId) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'No se pudo extraer un ID de YouTube válido' }));
            return;
        }
        const host = req.headers.host || `localhost:${PORT}`;
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const link = `${protocol}://${host}/watch?vid=${videoId}`;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ videoId, link }));
        return;
    }

    // ===== ARCHIVOS ESTÁTICOS =====
    let filePath = pathname === '/' ? '/reproductor.html' : pathname;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('No encontrado');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

// Extraer ID de YouTube de cualquier formato
function extractYouTubeId(input) {
    const patterns = [
        /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const p of patterns) {
        const m = input.match(p);
        if (m) return m[1];
    }
    return null;
}

server.listen(PORT, () => {
    console.log(`Reproductor corriendo en: http://localhost:${PORT}`);
    console.log(`Enlace directo ejemplo: http://localhost:${PORT}/watch?vid=dQw4w9WgXcQ`);
    console.log(`API generar enlace:     http://localhost:${PORT}/api/generate-link?videoId=URL_O_ID`);
});
