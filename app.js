#!/usr/bin/env node

/**
 * Unified Chatipelago application
 * Combines server.js and admin-server.js into a single process
 */

import { StreamerbotClient } from '@streamerbot/client';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as config from './config.js';
import * as webhook from './webhook-put.js';
import { init as initializeBot } from './bot-get.js';
import { fileURLToPath } from 'url';
import { getCustomConfigPath } from './config-unpacker-esm.js';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fssync from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const customConfigPath = getCustomConfigPath();

// Read version from package.json
const packageJson = JSON.parse(fssync.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const VERSION = packageJson.version;

// Load config immediately
config.loadFiles();

// Shared console log listeners for SSE
const consoleListeners = new Set();

// Console log capture - unified for both server and admin
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function createLogInterceptor(original, level) {
  return (...args) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      message: message,
      level: level
    };
    
    // Send to all SSE listeners
    consoleListeners.forEach(res => {
      try {
        res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
      } catch (error) {
        consoleListeners.delete(res);
      }
    });
    
    // Call original console method
    original(...args);
  };
}

console.log = createLogInterceptor(originalConsoleLog, 'log');
console.error = createLogInterceptor(originalConsoleError, 'error');
console.warn = createLogInterceptor(originalConsoleWarn, 'warn');

// Initialize Streamerbot client with global error handler
const streamerbotConfigWithErrorHandler = {
  ...config.streamerbotConfig,
  onError: (err) => {
    // Suppress full traceback, just log the error message
    console.error('[Streamer.bot] Connection error:', err.message);
  }
};

const streamerbotclient = new StreamerbotClient(streamerbotConfigWithErrorHandler);
webhook.setStreamerbotClient(streamerbotclient);

// Restart signal monitoring
const restartSignalPath = path.join(customConfigPath, 'tmp', 'restart_signal');
let lastRestartSignal = null;

async function checkForRestartSignal() {
  try {
    const signalData = await fs.readFile(restartSignalPath, 'utf8');
    const signalTime = parseInt(signalData);
    
    if (lastRestartSignal !== signalTime) {
      lastRestartSignal = signalTime;
      console.log('Restart signal detected, exiting for restart...');
      process.exit(0);
    }
  } catch (error) {
    // File doesn't exist or can't be read, that's fine
  }
}

// Check for restart signals every 2 seconds
setInterval(checkForRestartSignal, 2000);

// Export functions for bot integration
export { setOnEvent, sayGoodBye };

var onEvent;

function setOnEvent(fct) {
  onEvent = fct;
}

function sayGoodBye() {
  process.exit();
}

// Streamer.bot command handler
if (config.streamerbot) {
  try {
    initializeBot();
  } catch (e) {
    console.error('[Bot Init] Failed to initialize:', e?.message || e);
  }

  streamerbotclient.on('Command.Triggered', (data) => {
    const payload = data?.data || data;
    const command = payload?.command;
    const name = payload?.name;
    const message = (payload?.message || '').trim();
    const args = message.length > 0 ? message.split(/\s+/) : [];

    if (name === 'ChatiChat' || name === 'ChatiMod') {
      if (typeof onEvent === 'function') {
        onEvent(`/${command}${args.length ? '+' + args.join('+') : ''}`);
      } else {
        console.log('[Streamer.bot] onEvent handler not ready');
      }
    }
  });
}

// Mixitup HTTP server
if (config.mixitup) {
  const port = process.env.PORT || 8013;
  http.createServer((req, res) => {
    onEvent(req.url);
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello, World\n');
  }).listen(port);
  console.log(`Mixitup HTTP server listening on port ${port}`);
}

// Express Admin API
const app = express();
const ADMIN_PORT = 8015;

const corsOptions = {
  origin: 'https://chati.prismativerse.com',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Multer configuration for file uploads
const tmpDir = path.join(customConfigPath, 'tmp');
if (!fssync.existsSync(tmpDir)) {
  fssync.mkdirSync(tmpDir, { recursive: true });
}

const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/x-yaml' || 
        file.originalname.endsWith('.yaml') || 
        file.originalname.endsWith('.yml')) {
      cb(null, true);
    } else {
      cb(new Error('Only YAML files are allowed'), false);
    }
  }
});

// API Routes
app.get('/api/config', async (req, res) => {
  try {
    const configPath = path.join(customConfigPath, 'config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configData);
    res.json(config);
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ error: 'Failed to read configuration' });
  }
});

app.put('/api/config', async (req, res) => {
  try {
    const configPath = path.join(customConfigPath, 'config.json');
    const configData = JSON.stringify(req.body, null, 2);
    await fs.writeFile(configPath, configData, 'utf8');
    restartChatipelago();
    res.json({ success: true, message: 'Configuration updated and client restarted' });
  } catch (error) {
    console.error('Error writing config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const messagesDir = path.join(customConfigPath, 'messages');
    const files = await fs.readdir(messagesDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    res.json(jsonFiles);
  } catch (error) {
    console.error('Error reading messages directory:', error);
    res.status(500).json({ error: 'Failed to read messages directory' });
  }
});

app.get('/api/messages/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename.endsWith('.json')) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    const filePath = path.join(customConfigPath, 'messages', filename);
    const fileData = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(fileData);
    const responseData = Array.isArray(jsonData) 
      ? { messages: jsonData } 
      : jsonData;
    
    res.json(responseData);
  } catch (error) {
    console.error('Error reading message file:', error);
    res.status(500).json({ error: 'Failed to read message file' });
  }
});

app.put('/api/messages/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename.endsWith('.json')) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    const filePath = path.join(customConfigPath, 'messages', filename);
    let dataToWrite = req.body;
    if (req.body && req.body.messages && Array.isArray(req.body.messages)) {
      dataToWrite = req.body.messages;
    }
    
    const jsonData = JSON.stringify(dataToWrite, null, 2);
    await fs.writeFile(filePath, jsonData, 'utf8');
    res.json({ success: true, message: 'Message file updated' });
  } catch (error) {
    console.error('Error writing message file:', error);
    res.status(500).json({ error: 'Failed to update message file' });
  }
});

app.post('/api/console/log', (req, res) => {
  const logEntry = {
    timestamp: req.body.timestamp || new Date().toISOString(),
    message: req.body.message || '',
    level: req.body.level || 'log'
  };
  
  consoleListeners.forEach(listener => {
    try {
      listener.write(`data: ${JSON.stringify(logEntry)}\n\n`);
    } catch (error) {
      consoleListeners.delete(listener);
    }
  });
  
  res.json({ success: true });
});

app.get('/api/console', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'https://chati.prismativerse.com',
    'Access-Control-Allow-Credentials': 'true'
  });

  consoleListeners.add(res);

  res.write(`data: ${JSON.stringify({
    timestamp: new Date().toISOString(),
    message: 'Connected to console stream',
    level: 'info'
  })}\n\n`);

  req.on('close', () => {
    consoleListeners.delete(res);
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'connected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: VERSION
  });
});

app.post('/api/restart', (req, res) => {
  try {
    restartChatipelago();
    res.json({ success: true, message: 'Chatipelago client restart initiated' });
  } catch (error) {
    console.error('Error restarting client:', error);
    res.status(500).json({ error: 'Failed to restart client' });
  }
});

app.get('/api/streamerbot/actions-text', async (req, res) => {
  try {
    const actionsPath = path.join(__dirname, 'streamer.bot', 'chatipelago_streamer_bot_actions');
    const data = await fs.readFile(actionsPath, 'utf8');
    res.json({ text: data });
  } catch (error) {
    console.error('Error reading streamer.bot actions file:', error);
    res.status(500).json({ error: 'Failed to read streamer.bot actions' });
  }
});

app.post('/api/streamerbot/connect', async (req, res) => {
  try {
    if (!config.streamerbot) {
      return res.status(400).json({ error: 'Streamer.bot integration is not enabled' });
    }

    if (!streamerbotclient) {
      return res.status(500).json({ error: 'Streamer.bot client not initialized' });
    }

    await streamerbotclient.connect();
    res.json({ success: true, message: 'Streamer.bot connection initiated' });
  } catch (error) {
    console.error('Error connecting to Streamer.bot:', error);
    res.status(500).json({ error: `Failed to connect: ${error.message}` });
  }
});

function restartChatipelago() {
  console.log('Restarting Chatipelago...');
  const restartSignalPath = path.join(customConfigPath, 'tmp', 'restart_signal');
  fs.writeFile(restartSignalPath, Date.now().toString(), 'utf8')
    .then(() => {
      console.log('Restart signal written, process should restart shortly...');
    })
    .catch((error) => {
      console.error('Failed to write restart signal:', error);
    });
}

// Start admin server
async function startServer() {
  await ensureTmpDir();
  
  app.listen(ADMIN_PORT, () => {
    console.log(`Admin API server running on port ${ADMIN_PORT}`);
    console.log(`CORS enabled for: https://chati.prismativerse.com`);
    console.log('Chatipelago started successfully!');
  });
}

async function ensureTmpDir() {
  try {
    await fs.access(tmpDir);
  } catch {
    await fs.mkdir(tmpDir, { recursive: true });
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down Chatipelago...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down Chatipelago...');
  process.exit(0);
});

startServer().catch(console.error);
