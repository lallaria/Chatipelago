import * as archipelago from 'archipelago.js'
import * as config from './config.js';
import * as apWorld from './apWorldSettings.js'

export {
    connect,
    checkGoal,
    maybeTriggerItemLocationMap,
    getItemNameByLocation,
    getCheckableLocation,
    isItemObtained,
    claimCheck,
    setOnItemRecieved,
    setOnDeathLink,
    setOnCountdown,
    getLocationName,
    giveDeathLink,
    goal
}

const client = new archipelago.Client();

// shenanigans to fix Error in Archipelago.js
import {WebSocket} from "ws";

global.WebSocket = WebSocket;
client.options.debugLogVersions = false;

function connect() {
    let url = 'wss://' + config.connectionInfo.hostname + ':' + config.connectionInfo.port;
    client.login(url, config.connectionInfo.playerName, apWorld.GAME_NAME).then(record => {
        console.log("connected");
        client.updateTags(config.connectionInfo.tags);
    }).catch(error => {
        console.error("Failed to connect:", error.message);
    });
}

let onItemReceived;
let onDeathLink;
let onCountdown;
const notifiedItems = []
const locationItem = {};

client.items.on("itemsReceived", (items) => {
    for (const item of items) {
        const itemId = item.id;
        const itemFlags = item.flags;
        if (notifiedItems.includes(itemId)) continue;
        notifiedItems.push(itemId);
        console.log("Item received", item);
        onItemReceived(itemId, item.name, item.sender, itemFlags);
    }
})

client.deathLink.on("deathReceived", (source, time, cause) => {
    console.log("DeathLink:", cause, source);
    return onDeathLink(source, cause);
})

client.messages.on("countdown", (message) => {
    console.log(message);
    onCountdown(message);
})

function checkGoal(lastLocation) {
    // include lastLocation because client.locations.checked may not be updated yet
    const checked = [...client.room.checkedLocations, lastLocation];
    console.log(checked, apWorld.GOALS);
    return apWorld.GOALS.every((goal) => checked.includes(goal));
}

function maybeTriggerItemLocationMap() {
    if (Object.entries(locationItem).length > 0)
        return
    // scout all locations to map items locations
    client.scout(client.room.allLocations, 0).then(items => {
        items?.forEach(item => {
            locationItem[item.locationId] = item;
        });
        console.log('items mapped to locations', locationItem)
    });
}

function getItemNameByLocation(locationId) {
    let item = locationItem[locationId] ?? {};
    if (!item) return;
    return `${item.name} for ${item.receiver.name}`;
}

function getCheckableLocation() {
    const validLocations = client.room.missingLocations.filter((location) => {
        const requirements = apWorld.REQUIREMENTS[location] ?? [];
        return requirements.every((requirement) => this.isItemObtained(requirement));
    });

    if (validLocations.length === 0) return;

    return validLocations[Math.floor(Math.random() * validLocations.length)];
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

function getLocationName(locationId) {
    let item = locationItem[locationId] ?? {};
    if (!item) return;
    return `${item.location.name}`;
}

function giveDeathLink(reason) {
    client.deathLink.sendDeathLink(client.name, reason);
}

function goal() {
    client.goal();
}
