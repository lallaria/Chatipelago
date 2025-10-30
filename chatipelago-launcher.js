#!/usr/bin/env node

/**
 * Launcher for Chatipelago executable build
 * This version works with pkg by using process.execPath instead of spawning 'node'
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Chatipelago with Admin API...');

let mainClient = null;
let adminServer = null;

// Use process.execPath (the embedded node in pkg) instead of 'node'
const nodeExecutable = process.execPath;

// Function to start the main Chatipelago client
function startMainClient() {
  console.log('Starting main Chatipelago client...');
  
  const serverPath = path.join(__dirname, 'server.js');
  
  mainClient = spawn(nodeExecutable, [serverPath], {
    cwd: __dirname,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  mainClient.stdout.on('data', (data) => {
    console.log(`[Main Client] ${data.toString().trim()}`);
  });

  mainClient.stderr.on('data', (data) => {
    console.error(`[Main Client Error] ${data.toString().trim()}`);
  });

  mainClient.on('exit', (code) => {
    console.log(`Main client exited with code ${code}`);
    if (code !== 0 && code !== null) {
      console.log('Restarting main client in 2 seconds...');
      setTimeout(() => {
        startMainClient();
      }, 2000);
    }
  });

  return mainClient;
}

// Start the main client first
startMainClient();

// Start the admin server
const adminServerPath = path.join(__dirname, 'admin-server.js');
adminServer = spawn(nodeExecutable, [adminServerPath], {
  cwd: __dirname,
  stdio: ['inherit', 'pipe', 'pipe']
});

adminServer.stdout.on('data', (data) => {
  console.log(`[Admin Server] ${data.toString().trim()}`);
});

adminServer.stderr.on('data', (data) => {
  console.error(`[Admin Server Error] ${data.toString().trim()}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down Chatipelago...');
  if (adminServer) adminServer.kill('SIGINT');
  if (mainClient) mainClient.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down Chatipelago...');
  if (adminServer) adminServer.kill('SIGTERM');
  if (mainClient) mainClient.kill('SIGTERM');
  process.exit(0);
});

// Handle child process exits
adminServer.on('exit', (code) => {
  console.log(`Admin server exited with code ${code}`);
  if (code !== 0) {
    console.log('Admin server failed, shutting down...');
    process.exit(1);
  }
});

console.log('Chatipelago started successfully!');
console.log('Admin API: http://localhost:8015');
console.log('Press Ctrl+C to stop');

