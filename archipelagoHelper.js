import * as archipelago from 'archipelago.js'
import * as config from './config.js';
import * as apWorld from './apWorldSettings.js'
import * as messageUtil from './messageUtil.js'

export {
    connect,
    checkGoal,
    getItemNameByLocation,
    getCheckableLocation,
    isItemObtained,
    claimCheck,
    setOnItemRecieved,
    setOnDeathLink,
    setOnCountdown,
    setOnHints,
    getLocationName,
    giveDeathLink,
    goal,
    getHints
}

const client = new archipelago.Client();

// shenanigans to fix Error in Archipelago.js
import {WebSocket} from "ws";

global.WebSocket = WebSocket;
client.options.debugLogVersions = false;

let cacheLoaded;
function connect(message) {
    let text = message + ""
    let conStrs = text.split(" ");
    let hostname = conStrs[1] || config.connectionInfo.hostname;
    let port = Number(conStrs[2]) || config.connectionInfo.port;
    let playerName = conStrs[3] || config.connectionInfo.playerName;
    let tags = conStrs[4] || config.connectionInfo.tags;
    let url = 'wss://' + hostname + ':' + port;
    cacheLoaded = false;
    client.login(url, playerName, apWorld.GAME_NAME).then(record => {
        console.log("connected");
        fillItemLocationMap();
        client.updateTags(tags);
    }).catch(error => {
        console.error("Failed to connect:", error.message);
    });
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
    for (const item of items) {
        const itemId = item.id;
        const itemFlags = item.flags;
        if (notifiedItems.includes(itemId)) continue;
        notifiedItems.push(itemId);
        messageUtil.saveItems(notifiedItems, fileName);
        console.log("Item received", item);
        onItemReceived(itemId, item.name, item.sender, itemFlags);
    }
})

function loadCache() {
    if (!cacheLoaded)
    {
        cacheLoaded = true;
        fileName = './saved/' + client.room.seedName + 'savedItems.json';
        notifiedItems = messageUtil.loadItems(fileName); //need to make the filename related to the seedID
    }
}

client.deathLink.on("deathReceived", (source, time, cause) => {
    console.log("DeathLink:", cause, source);
    return onDeathLink(source, cause);
})

client.messages.on("countdown", (message) => {
    console.log(message);
    onCountdown(message);
})

client.items.on("hintReceived", (hint) =>{
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

function checkGoal(lastLocation) {
    // include lastLocation because client.locations.checked may not be updated yet
    const checked = [...client.room.checkedLocations, lastLocation];
    console.log(checked, apWorld.GOALS);
    return apWorld.GOALS.every((goal) => checked.includes(goal));
}

function fillItemLocationMap() {
    if (Object.entries(locationItem).length > 0)
        return
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

function getHints () {
    for (const hint of client.items.hints){
        signalHint(hint);
    }
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

function setOnHints(func) {
    onHint = func;
}

function getLocationName(locationId) {
    let item = locationItem[locationId] ?? {};
    if (!item) return;
    return `${item.locationName}`;
}

function giveDeathLink(reason) {
    client.deathLink.sendDeathLink(client.name, reason);
}

function goal() {
    client.goal();
}
