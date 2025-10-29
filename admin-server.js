import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const upload = multer({
  dest: path.join(__dirname, 'tmp'),
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
    res.json(jsonData);
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
    const jsonData = JSON.stringify(req.body, null, 2);
    await fs.writeFile(filePath, jsonData, 'utf8');
    
    res.json({ success: true, message: 'Message file updated' });
  } catch (error) {
    console.error('Error writing message file:', error);
    res.status(500).json({ error: 'Failed to update message file' });
  }
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
    version: '1.0.0'
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

// Zip generation endpoint
app.post('/api/generate-zip', upload.single('yamlFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No YAML file provided' });
    }

    // Validate YAML schema
    const yamlContent = await fs.readFile(req.file.path, 'utf8');
    const yamlData = yaml.parse(yamlContent);
    
    // Basic schema validation
    if (!yamlData.items || !Array.isArray(yamlData.items) || yamlData.items.length !== 60) {
      throw new Error('Invalid YAML schema: items must contain exactly 60 items');
    }
    if (!yamlData.progitems || !Array.isArray(yamlData.progitems) || yamlData.progitems.length !== 10) {
      throw new Error('Invalid YAML schema: progitems must contain exactly 10 items');
    }
    if (!yamlData.trapitems || !Array.isArray(yamlData.trapitems) || yamlData.trapitems.length !== 10) {
      throw new Error('Invalid YAML schema: trapitems must contain exactly 10 items');
    }
    if (!yamlData.locations || !Array.isArray(yamlData.locations) || yamlData.locations.length !== 50) {
      throw new Error('Invalid YAML schema: locations must contain exactly 50 items');
    }
    if (!yamlData.proglocations || !Array.isArray(yamlData.proglocations) || yamlData.proglocations.length !== 10) {
      throw new Error('Invalid YAML schema: proglocations must contain exactly 10 items');
    }

    // Generate zip file (placeholder implementation)
    const zipFilename = `generated_${Date.now()}.zip`;
    const zipPath = path.join(__dirname, 'tmp', zipFilename);
    
    // For now, create an empty zip file as placeholder
    await fs.writeFile(zipPath, '');
    
    // Clean up uploaded YAML file
    await fs.unlink(req.file.path);
    
    res.json({ 
      success: true, 
      filename: zipFilename,
      message: 'Zip file generated successfully' 
    });
  } catch (error) {
    console.error('Error generating zip:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
    
    res.status(400).json({ error: error.message });
  }
});

// Download endpoint
app.get('/api/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'tmp', filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    res.download(filePath, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ error: 'Failed to download file' });
      } else {
        // Clean up file after download
        setTimeout(async () => {
          try {
            await fs.unlink(filePath);
          } catch (cleanupError) {
            console.error('Error cleaning up downloaded file:', cleanupError);
          }
        }, 5000);
      }
    });
  } catch (error) {
    console.error('Error serving download:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

// Function to restart Chatipelago client
function restartChatipelago() {
  console.log('Restarting Chatipelago client...');
  
  // Write a restart signal file that the main process can monitor
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
