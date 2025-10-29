import { StreamerbotClient } from '@streamerbot/client';
import * as http from 'http';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as webhook from './webhook-put.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration from JSON file
let config;
try {
  const configPath = path.join(__dirname, 'config.json');
  const configData = await fs.readFile(configPath, 'utf8');
  config = JSON.parse(configData);
} catch (error) {
  console.error('Error loading config.json:', error);
  process.exit(1);
}

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

const streamerbotclient = new StreamerbotClient(config.streamerbotConfig);

// Share the client instance with webhook module
webhook.setStreamerbotClient(streamerbotclient);

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

    var port = process.env.PORT || 1339;

    http.createServer(function (req, res) {
        onEvent(req.url);

        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Hello, World\n');
    }).listen(port);

}

if (config.streamerbot) {

    // WebSocket event listeners for command processing
    streamerbotclient.on('Command.Triggered', (data) => {
        if (data.commandGroup === 'Chatipelago') {
            console.log(`Command triggered: ${data.command} with args: ${data.arguments}`);
            onEvent(`/${data.command}${data.arguments ? '+' + data.arguments.join('+') : ''}`);
        }
    });

    // Listen for custom events as alternative
    streamerbotclient.on('CustomEvent', (data) => {
        if (data.eventName === 'ChatipelagoCommand') {
            console.log(`Custom command event: ${data.command} with args: ${data.arguments}`);
            onEvent(`/${data.command}${data.arguments ? '+' + data.arguments.join('+') : ''}`);
        }
    });

    // Handle action responses
    streamerbotclient.on('ActionResponse', (data) => {
        console.log('Action response received:', data);
        // Process responses from trap actions or other actions as needed
    });

}

import './bot-get.js'
