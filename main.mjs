import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ debug: true });

const BASE_URL = `${process.env.RCON_SERVER}/api`;
const API_KEY = process.env.RCON_API_KEY;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
const AFK_TIME_MINUTES = process.env.AFK_TIME;
const WHITELIST_FLAG = process.env.WHITELIST_FLAG;
const VIP_WHITELIST = process.env.VIP_WHITELIST;
const NO_KICK_BELOW_STR = process.env.NO_KICK_BELOW;

if (!BASE_URL) {
  console.error('RCON_SERVER environment variable not set');
  process.exit(1);
}
if (!API_KEY) {
  console.error('RCON_API_KEY environment variable not set');
  process.exit(1);
}
if (!AFK_TIME_MINUTES) {
  console.error('AFK_TIME environment variable not set');
  process.exit(1);
}
if (!WHITELIST_FLAG) {
  console.error('WHITELIST_FLAG environment variable not set');
  process.exit(1);
}
if (!VIP_WHITELIST) {
  console.error('VIP_WHITELIST environment variable not set');
  process.exit(1);
}
if (!NO_KICK_BELOW_STR) {
  console.error('NO_KICK_BELOW environment variable not set');
  process.exit(1);
}

const NO_KICK_BELOW = parseInt(NO_KICK_BELOW_STR);

const HEADERS = { Authorization: `Bearer ${API_KEY}` };

const POLL_INTERVAL = 60000; // 1 minute
const AFK_TIME = parseInt(AFK_TIME_MINUTES) * 60 * 1000;
const MAX_RETRIES = 3; // Number of retries for failed kick requests

const afkPlayers = new Map(); // player_id => afk_start_time

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getDetailedPlayers() {
  const url = `${BASE_URL}/get_detailed_players`;
  try {
    const response = await axios.get(url, { headers: HEADERS });
    if (!response.data || !response.data.result || !response.data.result.players) {
      console.log('Unexpected API response structure:', response.data);
      return [];
    }
    const playersObj = response.data.result.players;
    const playersList = Object.values(playersObj);
    console.log(`Fetched ${playersList.length} players`);
    return playersList;
  } catch (error) {
    console.error('Error fetching detailed players:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
}

async function kickPlayer(player_id, player_name) {
  if (!player_id || typeof player_id !== 'string') {
    console.error(`Invalid player_id: ${player_id}`);
    return;
  }
  if (!player_name || typeof player_name !== 'string') {
    console.error(`Invalid player_name: ${player_name}`);
    return;
  }

  const url = `${BASE_URL}/kick`;
  const data = {
    player_id: player_id,
    player_name: player_name,
    reason: 'afk please rejoin OINK OINK',
    by: 'AFK Bot'
  };

  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      await axios.post(url, data, { headers: HEADERS });
      console.log(`Successfully kicked player: ${player_name} (${player_id})`);
      return;
    } catch (error) {
      attempts++;
      console.error(`Error kicking player ${player_name} (${player_id}) (Attempt ${attempts}/${MAX_RETRIES}):`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      if (attempts < MAX_RETRIES) {
        console.log(`Retrying in 5 seconds...`);
        await sleep(5000);
      } else {
        console.error(`Failed to kick player ${player_name} (${player_id}) after ${MAX_RETRIES} attempts`);
      }
    }
  }
}

async function logToDiscord(message) {
  if (!DISCORD_WEBHOOK) {
    console.log('Discord webhook not set, skipping send.');
    return;
  }
  try {
    await axios.post(DISCORD_WEBHOOK, { content: message });
  } catch (error) {
    console.error('Error sending to Discord:', error.message);
  }
}

async function monitorAFK() {
  console.log('Starting AFK monitor...');
  while (true) {
    console.log('Polling for players...');
    try {
      const players = await getDetailedPlayers();
      const currentPlayerIds = new Set(players.map(p => p.player_id));

      // Check if player count is above NO_KICK_BELOW
      if (players.length <= NO_KICK_BELOW) {
        console.log(`Player count (${players.length}) is not above ${NO_KICK_BELOW}, skipping AFK checks.`);
        // Remove disconnected players from tracking
        for (const player_id of [...afkPlayers.keys()]) {
          if (!currentPlayerIds.has(player_id)) {
            afkPlayers.delete(player_id);
          }
        }
        console.log(`Sleeping for ${POLL_INTERVAL / 1000} seconds...`);
        await sleep(POLL_INTERVAL);
        continue;
      }

      // Remove disconnected players from tracking
      for (const player_id of [...afkPlayers.keys()]) {
        if (!currentPlayerIds.has(player_id)) {
          afkPlayers.delete(player_id);
        }
      }

      for (const player of players) {
        const { player_id, name, is_vip, kills, deaths, combat, offense, defense, support, profile } = player;

        const hasWhitelistFlag = profile && profile.flags && profile.flags.some(f => f.flag === WHITELIST_FLAG);

        if ((VIP_WHITELIST === 'YES' && is_vip) || hasWhitelistFlag) continue;

        const allZero = kills === 0 && deaths === 0 && combat === 0 && offense === 0 && defense === 0 && support === 0;

        if (!allZero) {
          afkPlayers.delete(player_id);
          continue;
        }

        if (!afkPlayers.has(player_id)) {
          afkPlayers.set(player_id, Date.now());
          continue;
        }

        const start = afkPlayers.get(player_id);
        if (Date.now() - start >= AFK_TIME) {
          const logMessage = `Kicking AFK player: ${name} (${player_id})`;
          console.log(logMessage);
          await logToDiscord(logMessage);
          await kickPlayer(player_id, name);
          afkPlayers.delete(player_id);
        }
      }
    } catch (error) {
      console.error('Error in AFK monitor loop:', error.message);
    }

    console.log(`Sleeping for ${POLL_INTERVAL / 1000} seconds...`);
    await sleep(POLL_INTERVAL);
  }
}

monitorAFK().catch(console.error);
