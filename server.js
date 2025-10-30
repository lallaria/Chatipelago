import { StreamerbotClient } from '@streamerbot/client';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as config from './config.js';
import * as webhook from './webhook-put.js';
import { init as initializeBot } from './bot-get.js';
import { fileURLToPath } from 'url';

// Load config immediately so we can check it
config.loadFiles();

const streamerbotclient = new StreamerbotClient(
  config.streamerbotConfig
);

// Share the client instance with webhook module
webhook.setStreamerbotClient(streamerbotclient);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Monitor for restart signals
const restartSignalPath = path.join(__dirname, 'tmp', 'restart_signal');
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

export { setOnEvent, sayGoodBye }

var onEvent;

function setOnEvent(fct) {
    onEvent = fct;
}

function sayGoodBye() {
    process.exit();
}

if (config.mixitup) {
    'use strict';

    var port = process.env.PORT || 8013;

    http.createServer(function (req, res) {
        onEvent(req.url);

        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Hello, World\n');
    }).listen(port);

}

if (config.streamerbot) {
    // Ensure bot init runs so onEvent is registered
    try {
        initializeBot();
    } catch (e) {
        console.error('[Bot Init] Failed to initialize:', e?.message || e);
    }

    // WebSocket event listeners for command processing (Streamer.bot Command.Triggered)
    streamerbotclient.on('Command.Triggered', (data) => {
        const payload = data?.data || data;
        const command = payload?.command; // e.g. '!search'
        const name = payload?.name;       // e.g. 'ChatiChat'
        const message = (payload?.message || '').trim(); // text after the command

        const args = message.length > 0 ? message.split(/\s+/) : [];

        if (name === 'ChatiChat' || name === 'ChatiMod') {
            console.log(`[Streamer.bot] Command.Triggered name="${name}" command="${command}" args=${JSON.stringify(args)}`);
        }

        if (typeof onEvent === 'function') {
            onEvent(`/${command}${args.length ? '+' + args.join('+') : ''}`);
        } else {
            console.log('[Streamer.bot] onEvent handler not ready');
        }
    });
}
 
