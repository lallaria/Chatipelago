import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import yaml from 'yaml';
import { getCustomConfigPath, getConfigDir } from './config-unpacker-esm.js';

const __filename = fileURLToPath(import.meta.url);
const __projectRoot = path.dirname(__filename);

// Version is injected during build via esbuild define, fallback to reading from package.json in dev
let VERSION = process.env.VERSION;
if (!VERSION) {
  // In development, read from package.json
  try {
    const packageJson = JSON.parse(fssync.readFileSync(path.join(__projectRoot, 'package.json'), 'utf8'));
    VERSION = packageJson.version;
  } catch (error) {
    VERSION = 'unknown';
  }
}

// Use unpacked config path if running as nexe executable, otherwise use local path
const customConfigPath = getCustomConfigPath();
const __dirname = customConfigPath;

const app = express();
const PORT = 8015;

// CORS configuration for chati.prismativerse.com
const corsOptions = {
  origin: 'https://chati.prismativerse.com',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Multer configuration for file uploads
const tmpDir = path.join(__dirname, 'tmp');
if (!fssync.existsSync(tmpDir)) {
  fssync.mkdirSync(tmpDir, { recursive: true });
}

const upload = multer({
  dest: tmpDir,
  limits: {
    fileSize: 1024 * 1024 // 1MB limit
  },
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

// Store console log listeners for SSE
const consoleListeners = new Set();

// Console log capture
const originalConsoleLog = console.log;
console.log = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    message: message,
    level: 'log'
  };
  
  // Send to all SSE listeners
  consoleListeners.forEach(res => {
    try {
      res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
    } catch (error) {
      consoleListeners.delete(res);
    }
  });
  
  // Call original console.log
  originalConsoleLog(...args);
};

// API Routes

// Configuration endpoints
app.get('/api/config', async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'config.json');
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
    const configPath = path.join(__dirname, 'config.json');
    const configData = JSON.stringify(req.body, null, 2);
    await fs.writeFile(configPath, configData, 'utf8');
    
    // Trigger restart of main Chatipelago process
    restartChatipelago();
    
    res.json({ success: true, message: 'Configuration updated and client restarted' });
  } catch (error) {
    console.error('Error writing config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Message file endpoints
app.get('/api/messages', async (req, res) => {
  try {
    const messagesDir = path.join(__dirname, 'messages');
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
    
    const filePath = path.join(__dirname, 'messages', filename);
    const fileData = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(fileData);
    
    // If the file is an array, wrap it in an object with 'messages' property
    // This maintains backward compatibility with old array format
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
    
    const filePath = path.join(__dirname, 'messages', filename);
    
    // If the request body has a 'messages' property, extract it
    // Otherwise use the body as-is for backward compatibility
    let dataToWrite = req.body;
    if (req.body && req.body.messages && Array.isArray(req.body.messages)) {
      // Save as array format to maintain compatibility with existing code
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

// Endpoint for main client to send logs
app.post('/api/console/log', (req, res) => {
  const logEntry = {
    timestamp: req.body.timestamp || new Date().toISOString(),
    message: req.body.message || '',
    level: req.body.level || 'log'
  };
  
  // Send to all SSE listeners
  consoleListeners.forEach(listener => {
    try {
      listener.write(`data: ${JSON.stringify(logEntry)}\n\n`);
    } catch (error) {
      consoleListeners.delete(listener);
    }
  });
  
  res.json({ success: true });
});

// Console log streaming via SSE
app.get('/api/console', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': 'https://chati.prismativerse.com',
    'Access-Control-Allow-Credentials': 'true'
  });

  // Add this response to listeners
  consoleListeners.add(res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    timestamp: new Date().toISOString(),
    message: 'Connected to console stream',
    level: 'info'
  })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    consoleListeners.delete(res);
  });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'connected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: VERSION
  });
});

// Restart endpoint
app.post('/api/restart', (req, res) => {
  try {
    restartChatipelago();
    res.json({ success: true, message: 'Chatipelago client restart initiated' });
  } catch (error) {
    console.error('Error restarting client:', error);
    res.status(500).json({ error: 'Failed to restart client' });
  }
});

// Function to restart Chatipelago client
function restartChatipelago() {
  console.log('Restarting Chatipelago client...');
  
  // Write a restart signal file that the main process can monitor
  // Use unpacked config path (already set as __dirname)
  const restartSignalPath = path.join(__dirname, 'tmp', 'restart_signal');
  fs.writeFile(restartSignalPath, Date.now().toString(), 'utf8')
    .then(() => {
      console.log('Restart signal written, main process should restart shortly...');
    })
    .catch((error) => {
      console.error('Failed to write restart signal:', error);
    });
}

// Create tmp directory if it doesn't exist
async function ensureTmpDir() {
  const tmpDir = path.join(__dirname, 'tmp');
  try {
    await fs.access(tmpDir);
  } catch {
    await fs.mkdir(tmpDir, { recursive: true });
  }
}

// Start server
async function startServer() {
  await ensureTmpDir();
  
  app.listen(PORT, () => {
    console.log(`Admin API server running on port ${PORT}`);
    console.log(`CORS enabled for: https://chati.prismativerse.com`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down admin server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down admin server...');
  process.exit(0);
});

startServer().catch(console.error);
