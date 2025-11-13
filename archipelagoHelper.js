import * as archipelago from 'archipelago.js'
import * as config from './config.js';
import * as apWorld from './apWorldSettings.js'
import * as messageUtil from './messageUtil.js'
import { getConfigDir } from './config-unpacker-esm.js';
import path from 'path';
import * as fs from 'fs';

export {
    connect,
    checkGoal,
    getItemNameByLocation,
    getCheckableLocation,
    anyLocationsLeft,
    isItemObtained,
    claimCheck,
    setOnItemRecieved,
    setOnDeathLink,
    setOnCountdown,
    setOnHints,
    getLocationName,
    giveDeathLink,
    goal,
    getHints,
    getAPStatus,
    getAPUptime
}

const client = new archipelago.Client();

// shenanigans to fix Error in Archipelago.js
import {WebSocket} from "ws";
import { defaultConnectionOptions, defaultClientOptions } from 'archipelago.js';

global.WebSocket = WebSocket;
// Increase max listeners for WebSocket to prevent memory leak warnings
// Libraries (archipelago.js, StreamerbotClient) may add multiple message listeners
WebSocket.setMaxListeners(20);
client.options.debugLogVersions = false;

let cacheLoaded;
let archipelagoConnectionStart = null;

async function connect(message) {
    // Wait for disconnect to complete if currently connected
    if (client.socket.connected) {
        console.info('Disconnecting from Archipelago server to reload connection info...');
        archipelagoConnectionStart = null;
        // Clean up any listeners on the socket before disconnecting
        try {
            if (client.socket.socket) {
                // Access the underlying WebSocket if available
                const ws = client.socket.socket;
                if (ws && typeof ws.removeAllListeners === 'function') {
                    ws.removeAllListeners('message');
                    ws.removeAllListeners();
                }
            }
        } catch (e) {
            // Ignore cleanup errors
        }
        client.socket.disconnect();
        // Wait longer for disconnect to complete and cleanup
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    let text = message + ""
    let conStrs = text.split(" ");
    let hostname = conStrs[1] || config.connectionInfo.hostname;
    let port = Number(conStrs[2]) || config.connectionInfo.port;
    let playerName = conStrs[3] || config.connectionInfo.playerName;
    let password = config.connectionInfo.password;
    let tags = config.connectionInfo.tags ?? [];
    let url = hostname + ':' + port;
    cacheLoaded = false;
    const timeoutMs = config.connectionInfo.timeoutMs ?? defaultClientOptions.timeout;
    client.options.timeout = timeoutMs;
    let options = {
        ...defaultConnectionOptions,
        tags,
        password: password ?? defaultConnectionOptions.password
    };
    console.info(`Connecting to ${url} as player ${playerName} with tags ${tags}`)
    client.login(url, playerName, apWorld.GAME_NAME, options)
        .then(record => {
            archipelagoConnectionStart = Date.now();
            fillItemLocationMap();
            console.info("Connected to the Archipelago Server!")})
        .catch(console.error);
}

let onItemReceived;
let onDeathLink;
let onCountdown;
let onHint;
let fileName;
let notifiedItems = [];
const locationItem = {};

client.items.on("itemsReceived", (items) => {
    loadCache();    //make sure the cache is loaded before sending any item to chat
    if (notifiedItems.includes(696969)){ onCountdown("TRUE"); }
    for (let i of items) {
        const itemKey = { id: Number(i.id), locationId: Number(i.locationId) };
        if (notifiedItems.some(notifiedItem => notifiedItem.id === itemKey.id && notifiedItem.locationId === itemKey.locationId)) { continue; }
        notifiedItems.push(itemKey);
        messageUtil.saveItems(notifiedItems, fileName);
        console.debug(`ID ${i.id}, Name ${i.name}, Sender ${i.sender}, Flags ${i.flags}, LocationId ${i.locationId}`);
        onItemReceived(i.id, i.name, i.sender, i.flags);
    }
})

function loadCache() {
    if (!cacheLoaded)
    {
        cacheLoaded = true;
        const configDir = getConfigDir();
        const savedDir = path.join(configDir, 'saved');
        if (!fs.existsSync(savedDir)) {
            fs.mkdirSync(savedDir, { recursive: true });
        }
        fileName = path.join(savedDir, client.room.seedName + 'savedItems.json');
        notifiedItems = messageUtil.loadItems(fileName);
    }
}

function getAPStatus() {
    return client.socket.url;
}

function getAPUptime() {
    if (!archipelagoConnectionStart || !client.socket.connected) {
        return null;
    }
    return Math.floor((Date.now() - archipelagoConnectionStart) / 1000);
}

client.deathLink.on("deathReceived", (source, time, cause) => {
    console.log("DeathLink:", cause, source);
    return onDeathLink(source, cause);
})

client.messages.on("countdown", (message) => {
    console.log(message);
    onCountdown(message);
    loadCache();    //make sure the cache is loaded
    if (notifiedItems.includes(696969)){
        return;
    } else {
    	notifiedItems.push(696969)
        messageUtil.saveItems(notifiedItems, fileName);
        console.debug("Saving countdown status");
    }
})


client.items.on("hintReceived", (hint) => {
    console.log(hint);
    signalHint(hint);
})

function signalHint(hint){
    if (!hint.found) {
        let receiver = hint.item.receiver.name;
        let item = hint.item.name;
        let location = hint.item.locationName;
        let sender = hint.item.sender.name;

        onHint(receiver, item, location, sender);
    }
}

function checkGoal(lastLocation = "") {
    // include lastLocation because client.locations.checked may not be updated yet
    const checked = [...client.room.checkedLocations, lastLocation];
    console.debug(checked, apWorld.GOALS);
    return apWorld.GOALS.every((goal) => checked.includes(goal));
}

function fillItemLocationMap() {
    // scout all locations to map items locations
    client.scout(client.room.allLocations, 0).then(items => {
        items?.forEach(item => {
            locationItem[item.locationId] = item;
        });
    });
}

function getItemNameByLocation(locationId) {
    let item = locationItem[locationId] ?? {};
    if (!item) return;
    return `${item.name} for ${item.receiver.name}`;
}

function getHints(message) {
    let shiny = `${messageUtil.EMOTES.Shiny}`;
    if (message.match(shiny) != null) {
        if (!isItemObtained(apWorld.ITEMS.KEY1)) { client.messages.say(`!hint ${apWorld.ITEMS.KEY1}`) }
        if (!isItemObtained(apWorld.ITEMS.KEY2)) { client.messages.say(`!hint ${apWorld.ITEMS.KEY2}`) }
        if (!isItemObtained(apWorld.ITEMS.KEY3)) { client.messages.say(`!hint ${apWorld.ITEMS.KEY3}`) }
        return;
    }
    for (const hint of client.items.hints){
        signalHint(hint);
    }
}

function getCheckableLocation() {
    const validLocations = client.room.missingLocations.filter((location) => {
        console.debug("location", location);
        const requirements = apWorld.REQUIREMENTS[location] ?? [];
        console.debug("requirements", requirements);
        return requirements.every((requirement) => isItemObtained(requirement));
    });

    if (validLocations.length === 0) return;

    return validLocations[Math.floor(Math.random() * validLocations.length)];
}

function anyLocationsLeft() {
    const locations = client.room.missingLocations
    return locations.length > 0
}

function isItemObtained(itemId) {
    return client.items.received.some(item => item.id === itemId);
}

function claimCheck(locationId) {
    client.check(locationId);
}

function setOnItemRecieved(fct) {
    onItemReceived = fct;
}

function setOnDeathLink(func) {
    onDeathLink = func;
}

function setOnCountdown(func) {
    onCountdown = func;
}

function setOnHints(func) {
    onHint = func;
}

function getLocationName(locationId) {
    let item = locationItem[locationId] ?? {};
    if (!item) return;
    return `${item.locationName}`;
}

function giveDeathLink(reason) {
    console.log("Sending deathlink to server");
    client.deathLink.sendDeathLink(client.name, reason);
}

function goal() {
    client.goal();
}