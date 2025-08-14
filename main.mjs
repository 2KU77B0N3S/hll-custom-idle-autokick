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
const KICK_MESSAGE = process.env.KICK_MESSAGE;
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
if (!VIP_WHITELIST) {
  console.error('VIP_WHITELIST environment variable not set');
  process.exit(1);
}
if (!NO_KICK_BELOW_STR) {
  console.error('NO_KICK_BELOW environment variable not set');
  process.exit(1);
}
if (!KICK_MESSAGE) {
  console.error('KICK_MESSAGE environment variable not set');
  process.exit(1);
}
const NO_KICK_BELOW = parseInt(NO_KICK_BELOW_STR);
const HEADERS = { Authorization: `Bearer ${API_KEY}` };
const POLL_INTERVAL = 60000; // 1 minute
const AFK_TIME = parseInt(AFK_TIME_MINUTES) * 60 * 1000;
const MAX_RETRIES = 3; // Number of retries for failed kick requests
const inactivePlayers = new Map(); // player_id => {stats, timestamp}
const exemptionCache = new Set(); // Cache for exempted players (VIP or whitelisted)
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
    reason: KICK_MESSAGE,
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
function statsEqual(stats1, stats2) {
  return stats1.kills === stats2.kills &&
         stats1.deaths === stats2.deaths &&
         stats1.combat === stats2.combat &&
         stats1.offense === stats2.offense &&
         stats1.defense === stats2.defense &&
         stats1.support === stats2.support;
}
function isExemptPlayer(player) {
  const { is_vip, profile } = player;
  let hasWhitelistFlag = false;
  if (WHITELIST_FLAG) {
    hasWhitelistFlag = Array.isArray(profile?.flags) &&
      profile.flags.some(f => String(f.flag || '').trim().replace(/\uFE0F/g, '') === WHITELIST_FLAG);
  }
  return (VIP_WHITELIST === 'YES' && Boolean(is_vip)) || hasWhitelistFlag;
}
async function monitorAFK() {
  console.log('Starting AFK monitor...');
  while (true) {
    console.log('Polling for players...');
    try {
      const players = await getDetailedPlayers();
      const currentPlayerIds = new Set(players.map(p => p.player_id));
      // Remove disconnected players from tracking
      for (const player_id of [...inactivePlayers.keys()]) {
        if (!currentPlayerIds.has(player_id)) {
          inactivePlayers.delete(player_id);
        }
      }
      for (const player_id of [...exemptionCache.keys()]) {
        if (!currentPlayerIds.has(player_id)) {
          exemptionCache.delete(player_id);
        }
      }
      // Check if player count is above NO_KICK_BELOW
      if (players.length <= NO_KICK_BELOW) {
        console.log(`Player count (${players.length}) is not above ${NO_KICK_BELOW}, skipping AFK checks.`);
        console.log(`Sleeping for ${POLL_INTERVAL / 1000} seconds...`);
        await sleep(POLL_INTERVAL);
        continue;
      }
      for (const player of players) {
        const { player_id, name, kills, deaths, combat, offense, defense, support } = player;
        // Exemption check (direct & cache)
        if (isExemptPlayer(player)) {
          exemptionCache.add(player_id);
          inactivePlayers.delete(player_id);
          continue;
        }
        if (exemptionCache.has(player_id)) {
          inactivePlayers.delete(player_id);
          continue;
        }
        const currentStats = { kills, deaths, combat, offense, defense, support };
        if (!inactivePlayers.has(player_id)) {
          inactivePlayers.set(player_id, { stats: currentStats, timestamp: Date.now() });
          continue;
        }
        const { stats: prevStats, timestamp: prevTime } = inactivePlayers.get(player_id);
        if (statsEqual(currentStats, prevStats)) {
          if (Date.now() - prevTime >= AFK_TIME) {
            const logMessage = `Kicking AFK player: ${name} (${player_id})`;
            console.log(logMessage);
            await logToDiscord(logMessage);
            await kickPlayer(player_id, name);
            inactivePlayers.delete(player_id);
          }
        } else {
          inactivePlayers.set(player_id, { stats: currentStats, timestamp: Date.now() });
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
