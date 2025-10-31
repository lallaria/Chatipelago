#!/usr/bin/env node

/**
 * Launcher for Chatipelago executable build
 * This version works with pkg by using process.execPath instead of spawning 'node'
 * Uses CommonJS to avoid pkg ES module issues
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// In pkg, __dirname works but points to the snapshot directory
// For spawned files, we need to use the actual executable directory
const execDir = path.dirname(process.execPath);
const workingDir = process.cwd();

console.log('Starting Chatipelago with Admin API...');

let mainClient = null;
let adminServer = null;

// Use process.execPath (the embedded node in pkg) instead of 'node'
const nodeExecutable = process.execPath;

// Function to start the main Chatipelago client
function startMainClient() {
  console.log('Starting main Chatipelago client...');
  
  // Look for server.js in the executable directory or current working directory
  let serverPath = path.join(execDir, 'server.js');
  if (!fs.existsSync(serverPath)) {
    serverPath = path.join(workingDir, 'server.js');
  }
  if (!fs.existsSync(serverPath)) {
    // Fallback: try relative to this file's location (when unpacked)
    serverPath = path.join(__dirname, 'server.js');
  }
  
  const serverDir = path.dirname(serverPath);
  
  mainClient = spawn(nodeExecutable, [serverPath], {
    cwd: serverDir,
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
// Look for admin-server.js in the executable directory or current working directory
let adminServerPath = path.join(execDir, 'admin-server.js');
if (!fs.existsSync(adminServerPath)) {
  adminServerPath = path.join(workingDir, 'admin-server.js');
}
if (!fs.existsSync(adminServerPath)) {
  // Fallback: try relative to this file's location (when unpacked)
  adminServerPath = path.join(__dirname, 'admin-server.js');
}

const adminServerDir = path.dirname(adminServerPath);
adminServer = spawn(nodeExecutable, [adminServerPath], {
  cwd: adminServerDir,
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

