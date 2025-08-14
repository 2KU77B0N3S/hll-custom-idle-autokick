<div align="center">

  <img src="https://github.com/FwSchultz/assets/blob/main/bots/2KU77B0N3S/Logo.png" alt="logo" width="200" height="auto" />
  <h1>HLL-CUSTOM-IDLE-AUTOKICK      </h1>
  
<!-- Badges -->
<p>
  <a href="https://github.com/2KU77B0N3S/hll-geofences/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/2KU77B0N3S/hll-custom-idle-autokick" alt="contributors" />
  </a>
  <a href="">
    <img src="https://img.shields.io/github/last-commit/2KU77B0N3S/hll-custom-idle-autokick" alt="last update" />
  </a>
  <a href="https://github.com/2KU77B0N3S/hll-geofences/network/members">
    <img src="https://img.shields.io/github/forks/2KU77B0N3S/hll-custom-idle-autokick" alt="forks" />
  </a>
  <a href="https://github.com/2KU77B0N3S/hll-geofences/stargazers">
    <img src="https://img.shields.io/github/stars/2KU77B0N3S/hll-custom-idle-autokick" alt="stars" />
  </a>
  <a href="https://github.com/2KU77B0N3S/hll-geofences/issues/">
    <img src="https://img.shields.io/github/issues/2KU77B0N3S/hll-custom-idle-autokick" alt="open issues" />
  </a>
  <a href="https://github.com/2KU77B0N3S/hll-custom-idle-autokick/blob/master/LICENSE">
    <img src="https://img.shields.io/github/license/2KU77B0N3S/hll-geofences.svg" alt="license" />
  </a>
</p>
   
<h4>
  <a href="https://github.com/2KU77B0N3S/hll-custom-idle-autokick">Documentation</a>
  <span> · </span>
  <a href="https://github.com/2KU77B0N3S/hll-custom-idle-autokick/issues/">Report Bug</a>
  <span> · </span>
  <a href="https://github.com/2KU77B0N3S/hll-custom-idle-autokick/issues/">Request Feature</a>
</h4>
</div>

<br />

A Node.js script for Hell Let Loose (HLL) servers that automatically kicks idle players using the CRCON API. It monitors players for AFK status based on configurable time thresholds, player count limits, and exemptions for VIPs or players with specific flags. Optionally logs kicks to Discord via webhook.

## Features

- Polls player data every minute via CRCON API.
- Kicks players idle (zero stats in kills, deaths, combat, etc.) for a configurable time (default: 15 minutes).
- Skips kicks if server player count is below a set threshold (default: 90).
- Exempts VIP players (configurable) and those with a custom profile flag (e.g., "👍").
- Retries failed kick attempts up to 3 times.
- Optional Discord webhook logging for kick events.
- Environment variable-based configuration for easy setup.

## Requirements

- Node.js (v18 or later recommended).
- Access to a Hell Let Loose server with CRCON API    .
- Dependencies: `axios` and `dotenv` (installed via npm).

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/2KU77B0N3S/hll-custom-idle-autokick.git
   cd hll-custom-idle-autokick
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Copy the example environment file and configure it:
   ```
   cp example.env .env
   ```
   Edit `.env` with your values (see Configuration section below).

## Configuration

All settings are managed via the `.env` file. Here's an example with descriptions:

```
# CRCON server URL (e.g., http://your-server:port)
# Required for connecting to the CRCON API
RCON_SERVER=http://example.com:1234

# API key for CRCON server authentication    
RCON_API_KEY=your-api-key-here

# Discord webhook URL for logging AFK kicks
# Optional; leave empty to disable Discord logging
DISCORD_WEBHOOK=https://discord.com/api/webhooks/...

# Time (in minutes) a player can be idle before being kicked
# Must be a positive integer (e.g., 15)
AFK_TIME=15

# Flag that exempts players from being kicked
# Set to the flag used in your server (e.g., 👍)
WHITELIST_FLAG=👍    

# Determines if VIP players are exempt from AFK kicks
# Set to "YES" to exempt VIPs, "NO" to include them
VIP_WHITELIST=NO

# Player count threshold below which no AFK kicks occur
# Must be a positive integer (e.g., 90)
NO_KICK_BELOW=90

# KICK Message for AFK Players
KICK_MESSAGE="AFK PLEASE REJOIN"
```

- **RCON_SERVER**: Base URL of your CRCON server (without `/api`).
- **RCON_API_KEY**: Authentication key for the API.
- **DISCORD_WEBHOOK**: (Optional) Webhook URL for Discord notifications.
- **AFK_TIME**: Idle time in minutes before kicking.
- **WHITELIST_FLAG**: Profile flag that exempts players (checked in `profile.flags`).
- **VIP_WHITELIST**: "YES" to exempt VIPs, "NO" otherwise.
- **NO_KICK_BELOW**: No kicks if player count ≤ this value.
- **KICK_MESSAGE**: Kick Message

## Usage

Run the script:
```
node main.mjs
```

- The script will start polling every 60 seconds.
- It logs activity to the console and (optionally) Discord.
- Press Ctrl+C to stop.

For production, consider using a process manager like PM2:
```
npm install -g pm2
pm2 start main.mjs --name hll-afk-kick
```


## Contributing

Pull requests are welcome! For major changes, open an issue first to discuss.

## License

MIT License    
