/* 
Parses after events are received

*/

import * as server from './server.js';
import * as webhook from './webhook-put.js';
import * as archipelagoHelper from './archipelagoHelper.js';
import * as config from './config.js';
import * as messageUtil from './messageUtil.js';
import * as thesaurus from 'thesaurus';

var goal = false;
var currently_dead = false;
var strMessage = "";

server.setOnEvent(onEvent);
archipelagoHelper.setOnItemRecieved(onItem);
archipelagoHelper.setOnCountdown(onCountdown);
archipelagoHelper.setOnDeathLink(onDeathLink);
archipelagoHelper.setOnHints(onHint);

function onEvent(message) {
    console.log(strMessage);
    strMessage = message.replace('/', "");
    strMessage = strMessage.replaceAll('+', " ");
    let command_match = strMessage.match(/^![a-z]*/);

    if (command_match != null) {
        switch (command_match[0]) {
            case '!chaticonnect':
                onChatiConnect(strMessage);
                break;
            case '!search':
                attemptSearch();
                break;
            case '!loot':
                attemptLoot();
                break;
            case '!hint':
                archipelagoHelper.getHints();
                break;
            case '!deathlink':
                deathLink(strMessage.substring(11));
                break;
            default:
                break;
        }
    }
}

function onItem(id, item, player, flags) {
    if (!goal) {
        if (flags === 4) {
            if (Math.random() < .8) { currently_dead = true; }
            webhook.postInChat(messageUtil.generateRandomText(messageUtil.ITEM_TRAP, { item: item, player: player }), currently_dead, false);
        }
        else if (flags === 1) {
            webhook.postInChat(`bbirbShiny ${player} found us ${item}, it's really important. bbirbShiny`, false, false);
        }
        else if (player === "Chat") {
            webhook.postInChat(messageUtil.generateRandomText(messageUtil.SELF_FIND, { item: item }), false, false);
        }
        else {
            if (item.match(/![a-z]*/) != null) { webhook.postInChat(`${item} - from ${player}`, false, false); }
            else { webhook.postInChat(messageUtil.generateRandomText(messageUtil.ITEM_RECIEVED, { item: item, player: player }), false, false); }
            if (item.match(/FROG/) != null) { webhook.postInChat("And that's a frog fact.") }
        }
    }
}

function onDeathLink(player, cause) {
    if (typeof cause !== "undefined") { webhook.postInChat(cause, false, false); }
    webhook.postInChat(messageUtil.generateRandomText(messageUtil.BOUNCED, { player: player }), false, true);
}

function onCountdown(value) {
    webhook.postInChat(`${value.replace("[Server]: ", "")}`, false, false);
}
function onHint(hinttext) {
    webhook.postInChat(hinttext, false, false);
}

let currentLocation;
let searchAttempts = 0;
let lootAttemps = 0;
let lastCheckTime = new Date(0);

function isInCooldown() {
    return (new Date() - lastCheckTime) < config.gameSettings.checkCooldown * 1000;
}

function notifyCooldown() {
    webhook.postInChat(messageUtil.generateRandomText(messageUtil.OFF_COOLDOWN))
}

function deathLink(player) {
    let randAtk = thesaurus.find("end");
    console.log(randAtk);
    let reason = `${player} met their ${messageUtil.getRandomIndex(randAtk)} by ${messageUtil.getRandomIndex(messageUtil.KILLER)}!`
    webhook.postInChat(`Good luck everyone, @${reason}`, false, false);
    currently_dead = true;
    if (currently_dead) {
        currently_dead = false;
        return archipelagoHelper.giveDeathLink(reason);
    }
}

let lostIt = false;
function attemptLoot() {
    if (isInCooldown()) return;
    if (!currentLocation) {
        if (Math.random() < 0.2 && Math.random() < 0.2) {
            webhook.postInChat("Blame @LMarioza, @Dranzior, and @DelilahIsDidi for this cooldown");
        } else {
            webhook.postInChat("Ok, I'll open this cache of air. Nothing here, maybe you should use \'!search.\'");
        }
        return;
    }
    lootAttemps++;
    if (lootAttemps >= config.gameSettings.lootAttemptsRequired) {
        if (Math.random() < config.gameSettings.lootChance || lostit) {
            lostIt = false;
            const triggeredLocation = currentLocation;
            currentLocation = undefined;
            lastCheckTime = new Date();
            lootAttemps = 0;
            searchAttempts = 0;
            archipelagoHelper.claimCheck(triggeredLocation);
            let itemName = archipelagoHelper.getItemNameByLocation(triggeredLocation);
            if (itemName.match(/Chat/) == null) {
                webhook.postInChat(messageUtil.generateRandomText(messageUtil.ITEM_FOUND, { item: itemName }));
            }
            if (archipelagoHelper.checkGoal(triggeredLocation)) {
                archipelagoHelper.goal();
                webhook.postInChat('Did...did we find everything already?!');
                return;
            }
            setTimeout(notifyCooldown, config.gameSettings.checkCooldown * 1000);

        } else {
            lootAttemps = 0;
            searchAttempts = 0;
            lostIt = true;
            webhook.postInChat(messageUtil.generateRandomText(messageUtil.ITEM_MISSED, {location: archipelagoHelper.getLocationName(currentLocation)}));
        }
    }
}

function attemptSearch() {
    if (isInCooldown()) return;
    searchAttempts++
    if (searchAttempts >= config.gameSettings.searchAttemptsRequired && Math.random() < config.gameSettings.lootChance) {
        currentLocation = archipelagoHelper.getCheckableLocation();
        if (!currentLocation) {
            webhook.postInChat("No available locations");
        } else {
            lootAttemps = 0;
            searchAttempts = 0;
            webhook.postInChat(messageUtil.generateRandomText(messageUtil.LOCATION_FOUND, {location: archipelagoHelper.getLocationName(currentLocation)}));
        }
    }
}
function onChatiConnect(message) {
    let text = message + ""
    console.log(`Connecting to ${text.slice(14)}`);
    archipelagoHelper.connect(text);
}