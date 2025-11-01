import { StreamerbotClient } from '@streamerbot/client';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as config from './config.js';
import * as webhook from './webhook-put.js';
import { init as initializeChatBot } from './bot-get.js';
import { fileURLToPath } from 'url';
import { getCustomConfigPath } from './config-unpacker-esm.js';

// Load config immediately so we can check it
config.loadFiles();

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

export { setOnEvent, sayGoodBye, streamerbotclient }

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

if (config.mixitup) {
  'use strict';
  var port = process.env.PORT || config.mixitupConfig?.port || 8013;
  http.createServer(function (req, res) {
      if (typeof onEvent === 'function') {
          onEvent(req.url);
      }
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('Hello, World\n');
  }).listen(port);
  console.info(`MixItUp HTTP server listening on port ${port}`);
}

if (config.streamerbot) {
  // WebSocket event listeners for command processing (Streamer.bot Command.Triggered)
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
  console.info(`Streamer.bot websocket client listening for commands...`);
}
 
