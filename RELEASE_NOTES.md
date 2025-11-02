# Chatipelago Initial Release Notes

## Features

### Archipelago Integration
- Full Archipelago protocol support via `archipelago.js`
- Automatic connection to Archipelago servers with configurable hostname, port, and player name
- DeathLink support for shared death mechanics across the multiworld
- Real-time item tracking and notification system
- Location scouting and requirement checking
- Goal completion detection

### Chat Integration
- **Streamer.bot Support**
  - WebSocket-based integration with Streamer.bot
  - Automatic reconnection with configurable retry logic
  - Command triggering via Streamer.bot actions
  - Custom message handling for traps, bounced messages, and normal communications

- **MixItUp Support**
  - Webhook-based integration
  - HTTP POST endpoint for chat commands

### Browser based Interface
- Located at https://chati.prismativerse.com/
- Source code here: https://github.com/lallaria/Chatipelago-Frontend

### Item & Location Management
- Automatic mapping of items to locations via scouting
- Requirement checking before allowing checks
- Progress tracking with persistent item cache
- Goal tracking across 10 required locations
- Location availability filtering based on requirements

### Message Customization
- Editable message templates for:
  - Item discovery messages
  - Location found notifications
  - Trap death announcements
  - Hint received messages
  - Off-cooldown reminders
  - DeathLink bounce messages
- All messages support variable substitution and random selection from multiple variants

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

### Configuration System
- JSON-based configuration in `customConfig/config.json`
- Separate Streamer.bot and MixItUp modes
- Customizable game settings:
  - Search attempts required (default: 5)
  - Loot attempts required (default: 5)
  - Loot chance probability (default: 0.7, used for both search and loot success)
  - Check cooldown period (default: 240 seconds)

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
- `rcedit` v3.1.0 - Windows executable metadata editing

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

## Architecture Improvements
- Simplified process management
- Unified console logging system
- Improved hot restart capability

## Known Limitations
- MixItUp mode supported but complicated to set up.
- Goal completion triggers client exit after 10-second delay
- Standalone executables require Node.js during build process
- SEA builds are platform-specific (Windows, Linux, macOS builds are separate)

