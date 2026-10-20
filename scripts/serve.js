#!/usr/bin/env node
/**
 * serve.js - a tiny static server for the demo and the browser tests (Node built-ins only).
 * Serves the repo root on the derived dev port; `/` redirects to the demo.
 *
 *   npm run serve      then open http://localhost:<port>/demo/
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { DEV_PORT } = require('./dev-port.js');

const ROOT = path.resolve(__dirname, '..');
const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') {
        res.writeHead(302, { Location: '/demo/' });
        return res.end();
    }
    let file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT + path.sep)) {
        res.writeHead(403);
        return res.end('forbidden');
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, body) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('not found');
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(body);
    });
});

server.listen(DEV_PORT, () => console.log(`rjl-rain demo: http://localhost:${DEV_PORT}/demo/`));
