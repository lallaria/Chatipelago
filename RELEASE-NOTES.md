# Chatipelago v1.1.8 - Unified Application & Standalone Executables

**Release Date:** October 2025  
**Version:** 1.1.8
**License:** MIT

## Overview

Chatipelago is a WebSocket-based Archipelago client designed to integrate streaming chat (Twitch/YouTube) with Archipelago multiworld games. Players use chat commands to explore locations, collect items, and complete game goals collaboratively.

## Core Features

### Archipelago Integration
- Full Archipelago protocol support via `archipelago.js`
- Automatic connection to Archipelago servers with configurable hostname, port, and player name
- DeathLink support for shared death mechanics across the multiworld
- Real-time item tracking and notification system
- Location scouting and requirement checking
- Goal completion detection

### Chat Integration

**Streamer.bot Support**
- WebSocket-based integration with Streamer.bot
- Automatic reconnection with configurable retry logic
- Command triggering via Streamer.bot actions
- Custom message handling for traps, bounced messages, and normal communications

**MixItUp Support** 
- Webhook-based integration
- HTTP POST endpoint for chat commands

### Gameplay Commands

- `!chaticonnect` - Connect to Archipelago server
- `!search` - Attempt to find a new location (requires 5 attempts with 70% success chance)
- `!loot` - Attempt to loot the current location (requires 5 attempts, can fail and lose progress)
- `!hint` - Request or view hints for missing items
- `!turnchationdaddy` - Reactivate if the countdown didn't trigger properly

### Admin Interface

**Admin API Server** (Port 8015)
- RESTful API for configuration management
- Configuration endpoint: `GET/PUT /api/config`
- Message file management: List, get, and update message templates
- Server-Sent Events (SSE) console log streaming
- Status endpoint with uptime and version information
- Hot restart capability for the main client

**Configuration System**
- JSON-based configuration in `customConfig/config.json`
- Separate Streamer.bot and MixItUp modes
- Customizable game settings:
  - Search attempts required
  - Loot attempts required
  - Success probability
  - Check cooldown period (default: 240 seconds)

### Message Customization

Editable message templates for:
- Item discovery messages
- Location found notifications
- Trap death announcements
- Hint received messages
- Off-cooldown reminders
- DeathLink bounce messages

All messages support variable substitution and random selection from multiple variants.

### Item & Location Management

- Automatic mapping of items to locations via scouting
- Requirement checking before allowing checks
- Progress tracking with persistent item cache
- Goal tracking across 10 required locations
- Location availability filtering based on requirements

### Special Features

**DeathLink Mechanic**
- Random death chance on trap items (60% probability)
- Configurable DeathLink integration
- Custom death messages with inline synonym variety (removed external thesaurus dependency)

**Countdown Mode**
- Reactivatable countdown system
- Automatic notification of server countdowns
- Goal completion celebrations

**Trap System**
- 40% chance of trap on certain items
- User timeout/death mechanics
- Custom trap messages and actions

## Technical Details

### Architecture
- Node.js 18+ with ES modules
- Unified application architecture:
  - Single process (app.js) - combines Archipelago connection, chat integration, and admin API
  - Integrated admin server with hot restart capability
  - Config unpacker system for standalone executable environments
- Single Executable Application (SEA) support via Node.js experimental SEA feature
- Standalone executable build system with esbuild bundling

### Dependencies
- `archipelago.js` v2.0.4 - Archipelago protocol client
- `@streamerbot/client` v1.12.2 - Streamer.bot WebSocket client
- `express` v4.18.2 - Admin API server
- `ws` v8.18.0 - WebSocket support
- `multer` v2.0.2 - File upload handling
- `cors` v2.8.5 - Cross-origin resource sharing
- `yaml` v2.3.4 - YAML parsing
- `busboy` v1.6.0 - HTTP POST parsing
- `decompress` v4.2.1 - Archive handling
- `shelljs` v0.9.1 - Shell command execution

### Build Dependencies
- `esbuild` v0.25.0 - Code bundling for standalone executables
- `postject` v1.0.0-alpha.6 - SEA blob injection tool

### Cross-Platform Support
- Windows x64
- Linux x64  
- macOS x64

### Standalone Executable Support
- Single Executable Application (SEA) build system using Node.js experimental SEA feature
- Build command: `npm run build` creates platform-specific standalone executables
- Bundles all code and dependencies into a single executable file
- Config unpacker automatically extracts configuration at runtime
- No Node.js installation required for end users

## Files & Directory Structure

```
Chatipelago/
├── app.js                 # Unified application (client + admin API)
├── server.js              # Legacy server (maintained for reference)
├── bot-get.js             # Command processing logic
├── webhook-put.js         # Chat message posting
├── archipelagoHelper.js   # Archipelago client wrapper
├── messageUtil.js         # Message template system
├── config.js              # Configuration loader
├── config-unpacker.cjs    # Config extraction for standalone builds
├── config-unpacker-esm.js # ESM wrapper for config unpacker
├── apWorldSettings.js     # World configuration
├── scripts/
│   ├── build-bundle.js    # esbuild bundling script
│   └── inject-sea.js      # SEA blob injection script
├── sea-config.json        # Node.js SEA configuration
├── customConfig/
│   ├── config.json        # User configuration
│   ├── messages/          # Message templates
│   └── tmp/               # Temporary files
├── streamer.bot/          # Streamer.bot actions
└── mixitup_files/         # MixItUp commands (legacy)
```

## Getting Started

### Standard Installation
1. Install dependencies: `npm install`
2. Configure `customConfig/config.json` with your settings
3. Set up Streamer.bot or MixItUp integration
4. Start the application: `npm start`
5. Connect via `!chaticonnect` in chat

### Standalone Executable Build
1. Install dependencies: `npm install`
2. Build standalone executable: `npm run build`
3. Run the generated executable (`chatipelago.exe` on Windows, `chatipelago` on Linux/macOS)
4. Configuration is automatically extracted to appropriate platform directories

For detailed setup instructions, see ADMIN-API.md and README.md.

## Known Limitations

- MixItUp mode supported but not actively developed
- Admin API requires additional frontend for full functionality
- Item cache persistence depends on seed name and player name
- Goal completion triggers game end after 10-second delay
- Standalone executables require Node.js during build process
- SEA builds are platform-specific (Windows, Linux, macOS builds are separate)

## What's New in v1.1.8

### Major Changes
- **Unified Application**: Combined server and admin API into single `app.js` process for simplified deployment
- **Standalone Executable Support**: Added Node.js Single Executable Application (SEA) build system
  - Creates platform-specific standalone executables with `npm run build`
  - No Node.js installation required for end users
  - Automatic configuration extraction at runtime
- **Config Unpacker System**: New config extraction system for standalone executable environments
- **Build System Improvements**: 
  - esbuild-based code bundling
  - postject-based SEA blob injection
  - Cross-platform executable generation (Windows, Linux, macOS)

### Architecture Improvements
- Simplified process management (no separate process manager needed)
- Unified console logging system
- Improved hot restart capability


## Contributors

- DelilahIsDidi
- Dranzior  
- LMarioza

## Support

- GitHub: https://github.com/lallaria/Chatipelago
- Issues: https://github.com/lallaria/Chatipelago/issues
- License: MIT

---

**Note:** This is the first public release of Chatipelago. Feedback and contributions are welcome!

