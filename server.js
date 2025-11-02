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

export { setOnEvent, sayGoodBye, streamerbotclient, reloadChatBotConfig }

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

if (config.streamerbot) {
  initializeStreamerbot();
}
if (config.mixitup) {
  initializeMixitup();
}

function initializeStreamerbot() {
  const streamerbotConfigWithErrorHandler = {
    ...config.streamerbotConfig,
    onError: (err) => {
      // Suppress full traceback, just log the error message
      console.error('[Streamer.bot] Connection error:', err.message);
    }
  };

  streamerbotclient = new StreamerbotClient(streamerbotConfigWithErrorHandler);
  webhook.setStreamerbotClient(streamerbotclient);

  // Set up event listeners
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
  console.info(`Streamer.bot websocket client initialized`);
  
  // If immediate connect is enabled, trigger connection
  if (config.streamerbotConfig?.immediate) {
    console.info('Streamer.bot immediate connect enabled, initiating connection...');
    streamerbotclient.connect?.().catch(err => {
      console.error('[Streamer.bot] Immediate connect failed:', err.message);
    });
  }
}

function initializeMixitup() {
  'use strict';
  var port = process.env.PORT || config.mixitupConfig?.port || 8013;
  mixitupServer = http.createServer(function (req, res) {
    if (typeof onEvent === 'function') {
        onEvent(req.url);
    }
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello, World\n');
  }).listen(port);
  console.info(`MixItUp HTTP server listening on port ${port}`);
}

// Export reload function
function reloadChatBotConfig() {
  if (streamerbotclient) {
    // Disconnect existing client if connected
    try {
      if (streamerbotclient.connected || streamerbotclient.isConnected?.()) {
        streamerbotclient.disconnect?.();
        console.info('Disconnected existing Streamer.bot client');
      }
    } catch (e) {
      // Ignore disconnect errors
    }
    streamerbotclient = null;
    webhook.setStreamerbotClient(null);
  }
  if (mixitupServer) {
    mixitupServer.close(() => {
      console.info('MixItUp HTTP server stopped');
    });
    mixitupServer = null;
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
