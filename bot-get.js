/* This should return plaintext to be output by the bot, parsed from json

Example:
You found something! It looks very important!

You found something! I...don't think it will help.

You found <specific local item>

and for the LULs
You died. (deathlink)


Additional thoughts:
Cooldown timer should be in this server, not on the bot side.
!open or !openchest on botside for the participation in opening randomly

A mod-only command (can eventually do twitch channel points or bits, etc) !openloc <LOCATION> to force a specific location check as a response to another player's hint.
As this is a GET bot, it should likely be able to parse something like bot-get.js?loc=LOCATION

Participation should dictate the chance of finding something.  Should be a setting.
Note: I am going to force logic to require that Chat has at least 3 specific locking items (3 keys?) before they can find anything very important.

1 person = 1% chance
or
1 person = 5% chance

x people = y% chance

There will be multiple "regions" and "locations", but the Progression region will have some number of progression items in specific locations, guaranteed to be important.
We can guarantee a 100% chance.


*/

import * as server from './server.js';
import * as webhook from './webhook-put.js';
import * as archipelagoHelper from './archipelagoHelper.js';
import * as config from './config.js';
import * as messageUtil from './messageUtil.js';

var goal = false;
var currently_dead = false;

server.setOnEvent(onEvent);
archipelagoHelper.setOnItemRecieved(onItem);
archipelagoHelper.setOnCountdown(onCountdown);
archipelagoHelper.setOnDeathLink(onDeathLink);

archipelagoHelper.connect();

function onEvent(message) {
    message = message.replace('/', "");
    message = message.replaceAll('+', " ");
    let capture_death = message.match(/@[\w]*\s.*mauled.*/);
    if (capture_death != null) {
        deathLink(capture_death[0]);
    }
    let command_match = message.match(/^![a-z]*/);
    if (command_match != null) {
        switch (command_match[0]) {
            case '!search':
                attemptSearch();
                break;
            case '!loot':
                attemptLoot();
                break;
            default:
                break;
        }
    }
}

function onItem(id, item, player, flags) {
    if (!goal) {
        if (flags === 4) {
            if (Math.random() < .4) {
                currently_dead = true;
            }
            webhook.postInChat(messageUtil.generateRandomText(messageUtil.ITEM_TRAP, {
                item: item,
                player: player
            }), currently_dead, false);
        } else if (flags === 1) {
            webhook.postInChat(`${player} found us ${item}, it's really important.`, false, false);
        } else {
            if (item.match(/![a-z]*/) != null) {
                webhook.postInChat(`${item} - from ${player}`, false, false);
            } else {
                webhook.postInChat(messageUtil.generateRandomText(messageUtil.ITEM_RECIEVED, {
                    item: item,
                    player: player
                }), false, false);
            }
        }
    }
}

function onDeathLink(player, cause) {
    if (cause.length > 0) {
        webhook.postInChat(cause, false, false);
    }
    webhook.postInChat(messageUtil.generateRandomText(messageUtil.BOUNCED, {player: player}), false, true);
}

function onCountdown(value) {
    webhook.postInChat(value.replace("[Server]: ", ""), false, false);
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

function deathLink(reason) {
    webhook.postInChat(`Watch out everyone, ${reason}! This could be bad...`, false, false);
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
            let itemName = archipelagoHelper.getItemNameByLocation(triggeredLocation)
            webhook.postInChat(messageUtil.generateRandomText(messageUtil.ITEM_FOUND, {item: itemName}));
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
