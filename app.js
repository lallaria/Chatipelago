#!/usr/bin/env node

/**
 * Unified Chatipelago application
 * Combines server.js and admin-server.js into a single process
 */
import * as path from 'path';
import * as fs from 'fs/promises';
import * as config from './config.js';
import * as server from './server.js';
import { streamerbotclient, reloadChatBotConfig, getStreamerbotStatus, getMixitupStatus, attachStreamerbotListeners } from './server.js';
import { connect as reconnectAP, getAPStatus, getAPUptime } from './archipelagoHelper.js';
import { fileURLToPath } from 'url';
import { getCustomConfigPath } from './config-unpacker-esm.js';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fssync from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const customConfigPath = getCustomConfigPath();

// Version is injected during build via esbuild define, fallback to reading from package.json in dev
let VERSION = process.env.VERSION;
if (!VERSION) {
  // In development, read from package.json
  try {
    const packageJson = JSON.parse(fssync.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    VERSION = packageJson.version;
  } catch (error) {
    VERSION = 'unknown';
  }
}

// Shared console log listeners for SSE
const consoleListeners = new Set();

// Console log capture - unified for both server and admin
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;
const originalConsoleInfo = console.info;

function appCreateLogInterceptor(original, level) {
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

console.log = appCreateLogInterceptor(originalConsoleLog, 'log');
console.error = appCreateLogInterceptor(originalConsoleError, 'error');
console.warn = appCreateLogInterceptor(originalConsoleWarn, 'warn');
console.debug = appCreateLogInterceptor(originalConsoleDebug, 'debug');
console.info = appCreateLogInterceptor(originalConsoleInfo, 'info');

// Restart signal monitoring
const restartSignalPath = path.join(customConfigPath, 'tmp', 'restart_signal');
let lastRestartSignal = null;

async function checkForRestartSignal() {
  try {
    const signalData = await fs.readFile(restartSignalPath, 'utf8');
    const signalTime = parseInt(signalData);
    
    if (lastRestartSignal !== signalTime) {
      lastRestartSignal = signalTime;
      console.info('Restart needed for reconfiguration, exiting for restart...');
      // Delete the signal file before exiting to prevent restart loop
      await fs.unlink(restartSignalPath).catch(() => {});
      process.exit(0);
    }
  } catch (error) {
    // File doesn't exist or can't be read, that's fine
  }
}

// Check for restart signals every 2 seconds
setInterval(checkForRestartSignal, 2000);

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
    
    // Store old config values to detect changes
    const oldAPConfig = JSON.stringify(config.connectionInfo);
    const oldStreamerbot = config.streamerbot;
    const oldMixitup = config.mixitup;
    
    // Write new config
    const configData = JSON.stringify(req.body, null, 2);
    await fs.writeFile(configPath, configData, 'utf8');
    
    // Reload config module
    config.loadFiles();
    
    // Check what changed and reload appropriate components
    const newAPConfig = JSON.stringify(config.connectionInfo);
    if (oldAPConfig !== newAPConfig) {
      console.info('Archipelago connection info changed, reconnecting...');
      reconnectAP().catch(err => {
        console.error('Failed to reconnect to Archipelago:', err);
      });
    }
    
    // Reload server components (Streamer.bot, MixItUp)
    if (oldStreamerbot !== config.streamerbot || oldMixitup !== config.mixitup) {
      console.info('Chatbot components changed, reloading...');
      reloadChatBotConfig();
    }
    
    res.json({ success: true, message: 'Configuration updated and reloaded' });
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
  const archipelagoUrl = getAPStatus();
  const streamerbotStatus = getStreamerbotStatus();
  const mixitupStatus = getMixitupStatus();
  
  // Determine which chatbot is active
  let chatbot = null;
  if (config.streamerbot && streamerbotStatus) {
    chatbot = {
      type: 'streamerbot',
      ...streamerbotStatus
    };
  } else if (config.mixitup && mixitupStatus) {
    chatbot = {
      type: 'mixitup',
      ...mixitupStatus
    };
  }
  
  res.json({
    status: 'connected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: VERSION,
    api: {
      connected: true,
      uptime: process.uptime()
    },
    archipelago: {
      connected: !!archipelagoUrl,
      url: archipelagoUrl || null,
      uptime: getAPUptime()
    },
    chatbot: chatbot
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

    // Ensure listeners are attached before attempting connection
    // This handles the case where the client was in a bad state
    attachStreamerbotListeners();
    
    await streamerbotclient.connect();
    res.json({ success: true, message: 'Streamer.bot connection initiated' });
  } catch (error) {
    console.error('Error connecting to Streamer.bot:', error);
    res.status(500).json({ error: `Failed to connect: ${error.message}` });
  }
});

app.post('/api/archipelago/connect', async (req, res) => {
  try {
    await reconnectAP('');
    res.json({ success: true, message: 'Archipelago connection initiated' });
  } catch (error) {
    console.error('Error connecting to Archipelago:', error);
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
  
  const server = app.listen(ADMIN_PORT, () => {
    console.log(`Admin API server running on port ${ADMIN_PORT}`);
    console.log(`CORS enabled for: https://chati.prismativerse.com`);
    console.info('Chatipelago started successfully!');
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\nError: Admin server can't start - do you have another Chatipelago process running?`);
      console.error(`Port ${ADMIN_PORT} is already in use.\n`);
      process.exit(1);
    } else {
      console.error('[Admin API] Server error:', error.message);
      process.exit(1);
    }
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
  console.info('\nShutting down Chatipelago...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.info('\nShutting down Chatipelago...');
  process.exit(0);
});

startServer().catch(console.error);
