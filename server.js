import { StreamerbotClient } from '@streamerbot/client';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as config from './config.js';
import * as webhook from './webhook-put.js';
import { init as initializeChatBot } from './bot-get.js';
import { getCustomConfigPath } from './config-unpacker-esm.js';

// Load config immediately so we can check it
config.loadFiles();

// Initialize Streamerbot client only if enabled
let streamerbotclient = null;
let mixitupserver = null;

// Track connection start times for uptime calculation
let streamerbotConnectionStart = null;
let mixitupConnectionStart = null;

// Monitor for restart signals - use unpacked config path
const customConfigPath = getCustomConfigPath();
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

// Status check functions
function getStreamerbotStatus() {
  if (!streamerbotclient) return null;
  const connected = streamerbotConnectionStart !== null;
  return {
    connected: connected,
    uptime: connected && streamerbotConnectionStart 
      ? Math.floor((Date.now() - streamerbotConnectionStart.timestamp) / 1000)
      : null,
    version: streamerbotConnectionStart?.version || null
  };
}

function getMixitupStatus() {
  if (!mixitupserver) return null;
  const listening = mixitupserver.listening;
  return {
    connected: listening,
    uptime: listening && mixitupConnectionStart
      ? Math.floor((Date.now() - mixitupConnectionStart) / 1000)
      : null,
    port: mixitupserver.address()?.port || null
  };
}

export { 
  setOnEvent, 
  sayGoodBye, 
  streamerbotclient, 
  mixitupserver,
  reloadChatBotConfig,
  getStreamerbotStatus,
  getMixitupStatus,
  attachStreamerbotListeners
}

var onEvent;

function setOnEvent(fct) {
    onEvent = fct;
}

function sayGoodBye() {
    process.exit();
}

// Ensure chatbot (however its posting in your chat) init runs so onEvent is registered
try {
    initializeChatBot();
} catch (e) {
    console.error('[ChatBot Init] Failed to initialize:', e?.message || e);
}

if (config.streamerbot && streamerbotclient === null) {
  initializeStreamerbot();
}
if (config.mixitup && mixitupserver === null) {
  initializeMixitup();
}

// Helper function to attach Command.Triggered listener
// This ensures listeners are always attached, even after reconnection
function attachStreamerbotListeners() {
  if (!streamerbotclient) return;
  
  // Remove existing listener to avoid duplicates
  streamerbotclient.removeAllListeners?.('Command.Triggered');
  
  // Set up event listener
  streamerbotclient.on('Command.Triggered', (data) => {
    const payload = data?.data || data;
    const command = payload?.command; // e.g. '!search'
    const name = payload?.name;       // e.g. 'ChatiChat'
    const message = (payload?.message || '').trim(); // text after the command

    const args = message.length > 0 ? message.split(/\s+/) : [];

    if (name === 'ChatiChat' || name === 'ChatiMod') {
      if (typeof onEvent === 'function') {
          onEvent(`/${command}${args.length ? '+' + args.join('+') : ''}`);
      }
    }
  });
}

function initializeStreamerbot() {
  // Safety check: if client already exists, clean it up first
  if (streamerbotclient) {
    try {
      streamerbotclient.removeAllListeners?.('Command.Triggered');
      streamerbotclient.removeAllListeners?.();
      // Clean up underlying WebSocket if accessible
      try {
        const ws = streamerbotclient.socket;
        if (ws && typeof ws.removeAllListeners === 'function') {
          ws.removeAllListeners('message');
          ws.removeAllListeners();
        }
      } catch (e) {
        // Ignore WebSocket cleanup errors
      }
      streamerbotclient.disconnect?.();
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  const streamerbotConfigWithErrorHandler = {
    ...config.streamerbotConfig,
    onError: (err) => {
      // Log error without full stack trace for cleaner output
      const errorMsg = err?.message || String(err);
      if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
        console.error('[Streamer.bot] Connection error: Server not available. Ensure Streamer.bot is running and WebSocket server is enabled.');
      } else if (errorMsg.includes('WebSocket closed') || errorMsg.includes('connection was closed')) {
        console.error('[Streamer.bot] Connection error: WebSocket closed unexpectedly');
      } else {
        console.error('[Streamer.bot] Connection error:', errorMsg);
      }
    },
    onConnect: (data) => {
      streamerbotConnectionStart = {timestamp: Date.now(), version: data.version};
      console.info('[Streamer.bot] Successfully connected');
      // Ensure listeners are attached on successful connection
      attachStreamerbotListeners();
    },
    onDisconnect: () => {
      streamerbotConnectionStart = null;
      console.info('[Streamer.bot] Disconnected');
    }
  };

  streamerbotclient = new StreamerbotClient(streamerbotConfigWithErrorHandler);
  webhook.setStreamerbotClient(streamerbotclient);

  // Set up event listeners immediately (will be re-attached on connect if needed)
  attachStreamerbotListeners();
  console.info(`Streamer.bot websocket client initialized`);
  
}

function initializeMixitup() {
  'use strict';
  var port = process.env.PORT || config.mixitupConfig?.port || 8013;
  mixitupserver = http.createServer(function (req, res) {
    if (typeof onEvent === 'function') {
        onEvent(req.url);
    }
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello, World\n');
  });
  
  mixitupserver.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nError: Admin server can't start - do you have another Chatipelago process running?`);
      console.error(`Port ${port} is already in use.\n`);
      process.exit(1);
    } else {
      console.error('[MixItUp] Server error:', err.message);
      process.exit(1);
    }
  });
  
  mixitupserver.listen(port, () => {
    mixitupConnectionStart = Date.now();
    console.info(`MixItUp HTTP server listening on port ${port}`);
  });
}

// Export reload function
function reloadChatBotConfig() {
  if (streamerbotclient) {
    // Remove all event listeners before disconnecting
    try {
      if (streamerbotclient.connected || streamerbotclient.isConnected?.()) {
        // Remove the Command.Triggered listener
        streamerbotclient.removeAllListeners?.('Command.Triggered');
        // Also clear all listeners as a safety measure
        streamerbotclient.removeAllListeners?.();
        // Clean up underlying WebSocket if accessible
        try {
          const ws = streamerbotclient.socket;
          if (ws && typeof ws.removeAllListeners === 'function') {
            ws.removeAllListeners('message');
            ws.removeAllListeners();
          }
        } catch (e) {
          // Ignore WebSocket cleanup errors
        }
        streamerbotclient.disconnect?.();
        console.info('Disconnected existing Streamer.bot client');
      }
    } catch (e) {
      // Ignore disconnect errors
    }
    streamerbotclient = null;
    webhook.setStreamerbotClient(null);
  }
  if (mixitupserver) {
    mixitupserver.close(() => {
      console.info('MixItUp HTTP server stopped');
    });
    mixitupserver = null;
  }
  
  config.loadFiles();

  try {
      initializeChatBot();
  } catch (e) {
      console.error('[ChatBot Init] Failed to initialize:', e?.message || e);
  }
  
  // Reload Streamer.bot if enabled state or hostname/port/password changed
  if (config.streamerbot) {
    console.info('Reloading Streamer.bot configuration...');
    initializeStreamerbot();
  }
  
  // Reload MixItUp if enabled state or port changed
  if (config.mixitup) {
    console.info('Reloading MixItUp configuration...');
    initializeMixitup();
  }
}
