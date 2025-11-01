# Chatipelago Admin API

## Overview
The Admin API provides HTTP endpoints for managing the Chatipelago client through a web frontend. It runs on port 8015 and includes CORS support for `chati.prismativerse.com`.

## Starting the System

### Option 1: Start Both Servers
```bash
npm start
```
This starts both the main Chatipelago client and the admin API server.

### Option 2: Start Servers Separately
```bash
# Terminal 1 - Admin API Server
npm run admin

# Terminal 2 - Main Chatipelago Client  
npm run client
```

## API Endpoints

### Configuration Management
- `GET /api/config` - Retrieve current configuration as JSON
- `PUT /api/config` - Update configuration (writes to config.json and restarts client)

### Message File Management
- `GET /api/messages` - List all message files in /messages directory
- `GET /api/messages/:filename` - Retrieve specific message file content
- `PUT /api/messages/:filename` - Update specific message file

### Console Log Streaming
- `GET /api/console` - Server-Sent Events stream for real-time console logs

### System Management
- `GET /api/status` - Connection status and system information
- `POST /api/restart` - Restart the Chatipelago client

## Configuration Format

The system now uses `config.json` instead of `config.js`:

```json
{
  "mixitup": false,
  "streamerbot": true,
  "connectionInfo": {
    "hostname": "localhost",
    "port": 38281,
    "playerName": "Chat",
    "tags": ["AP", "DeathLink"]
  },
  "mixitupConfig": {
    "port": 8013,
    "webhookUrl": "https://mixitup.webhook/"
  },
  "streamerbotConfig": {
    "port": 8014,
    "endpoint": "/chati",
    "password": "delilahsbasement",
    "autoConnect": true,
    "reconnect": true
  },
  "streamerbotActions": {
    "trapMessage": "929a40f0-eb5f-44a8-a94a-368e144fbde2",
    "bouncedMessage": "185e6b60-3bd0-4a93-8644-3832ef7ca890"
  },
  "gameSettings": {
    "searchAttemptsRequired": 5,
    "lootAttemptsRequired": 5,
    "lootChance": 0.7,
    "checkCooldown": 240
  }
}
```

## Security

- CORS is restricted to `https://chati.prismativerse.com` only
- No authentication required (local network access)
- File uploads limited to 1MB maximum
- Only YAML files accepted for zip generation
- Temporary files stored in `/tmp` with automatic cleanup

## Console Log Streaming

The console log streaming uses Server-Sent Events (SSE) and captures ALL console.log output from the Chatipelago client. Each log entry includes:

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "message": "Log message content",
  "level": "log"
}
```

## File Management

- **Upload Directory**: `/tmp` for YAML files
- **Generated Files**: `/tmp` for apworlds  
- **File Size Limit**: 1MB maximum for YAML uploads
- **Cleanup**: Automatic cleanup after download or timeout

## Error Handling

- Connection failures show error messages without retry logic
- API errors return user-friendly error messages
- File upload errors validate YAML schema client-side before upload
- Process failures show error when admin server unreachable

## Dependencies Added

- `express` - Web server framework
- `cors` - Cross-Origin Resource Sharing
- `multer` - File upload handling
- `yaml` - YAML parsing and validation

## Next Steps

Phase 0 is complete. The backend infrastructure is now ready for frontend development. The frontend can connect to `http://localhost:8015` to access all admin functionality.
