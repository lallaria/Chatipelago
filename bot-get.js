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

var goal = false;

var server = require('./server.js');
var webhook = require('./webhook-put.js');
var archipelagoHelper = require('./archipelagoHelper.js');
var config = require('./config.js');
var messageUtil = require('./messageUtil.js');

server.setOnEvent(onEvent);
archipelagoHelper.setOnItemRecieved(onItem);

function onEvent(message) {
    archipelagoHelper.maybeTriggerItemLocationMap();
    switch (message) {
        case '/!search':
            attemptSearch();
            break;
        case '/!loot':
            attemptLoot();
            break;
        default:
            break;
    }
}

function onItem(id, name, player) {
    if (!goal) {
        webhook.postInChat(messageUtil.generateRandomText(messageUtil.ITEM_RECIEVED, { item: name, player: player }));
    }
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
        if (Math.random() < config.gameSettings.lootChance) {
            const triggeredLocation = currentLocation;
            currentLocation = undefined;
            lastCheckTime = new Date();
            lootAttemps = 0;
            searchAttempts = 0;
            archipelagoHelper.claimCheck(triggeredLocation);
            itemName = archipelagoHelper.getItemNameByLocation(triggeredLocation)
            webhook.postInChat(messageUtil.generateRandomText(messageUtil.ITEM_FOUND, { item: itemName }));
            if (archipelagoHelper.checkGoal(triggeredLocation)) {
                archipelagoHelper.goal();
                webhook.postInChat('Did...did we find everything already?!');
                return;
            }
            setTimeout(notifyCooldown, config.gameSettings.checkCooldown * 1000);

        } else {
            lootAttemps = 0;
            searchAttempts = 0;
            webhook.postInChat(messageUtil.generateRandomText(messageUtil.ITEM_MISSED, { location: archipelagoHelper.getLocationName(currentLocation) }));
        }
    }
}

function attemptSearch() {
    if (isInCooldown()) return;
    searchAttempts++
    if (searchAttempts >= config.gameSettings.searchAttemptsRequired) {
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