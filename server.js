import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

// Middleware for COOP and COEP headers (required for ffmpeg.wasm)
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// Serve static files from the build folder
app.use(express.static(distPath));

// Fallback to index.html for SPA routing (Express 5 safe)
app.use((req, res) => {
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Arquivos de build não encontrados. O deploy pode estar incompleto.');
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running! Port: ${PORT}`);
    console.log(`Serving files from: ${distPath}`);
    console.log(`Index file exists: ${fs.existsSync(indexPath)}`);
});

