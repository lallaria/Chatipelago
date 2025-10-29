/*
Parses after events are received
*/

import * as server from './server.js';
import * as webhook from './webhook-put.js';
import * as archipelagoHelper from './archipelagoHelper.js';
import * as config from './config.js';
import * as messageUtil from './messageUtil.js';
import thesaurus from 'thesaurus';

export {init}

var goal = false;
var currently_dead = false;
var strMessage = "";
var countdown = true;

function init() {
    server.setOnEvent(onEvent);
    archipelagoHelper.setOnItemRecieved(onItem);
    archipelagoHelper.setOnCountdown(onCountdown);
    archipelagoHelper.setOnDeathLink(onDeathLink);
    archipelagoHelper.setOnHints(onHint);

    config.loadFiles();
    messageUtil.loadFiles();
}

function onEvent(message) {
    strMessage = message.replace('/', "");
    strMessage = strMessage.replaceAll('+', " ");
    console.log(strMessage);
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
                archipelagoHelper.getHints(strMessage);
                break;
            case '!deathlink':
                deathLink(strMessage.substring(11));
                break;
            case '!turnchationdaddy':
                countdown = true;
                break;
            default:
                break;
        }
    }
}

function onItem(id, item, player, flags) {
	if (countdown) {
        if (flags === 4) {
	        if (Math.random() < 0.6) { currently_dead = true; }
	        webhook.postInChat(messageUtil.generateRandomText(messageUtil.ITEM_TRAP, { item: item, player: player }), currently_dead, false);
        }
	    else if (flags === 1) {
        	webhook.postInChat(`bbirbShiny ${player} found us ${item}, it's really important. bbirbShiny`, false, false);
	    }
	    else if (player === "Chat") {
	        webhook.postInChat(messageUtil.generateRandomText(messageUtil.SELF_FIND, { item: item }), false, false);
	    }
	    else {
	        if (item.match(/![a-z]*/) != null) {
	            webhook.postInChat(item, false, false);
	            webhook.postInChat(`That ${item} was found by ${player}`, false, false);
	        }
	        else { webhook.postInChat(messageUtil.generateRandomText(messageUtil.ITEM_RECIEVED, { item: item, player: player }), false, false); }
	        if (item.match(/FROG/) != null) { webhook.postInChat("And that's a frog fact.") }
	    }
	}
}

function onDeathLink(player, cause) {
    if (typeof cause !== "undefined" && cause !== "") { webhook.postInChat(cause, false, false); }
    webhook.postInChat(messageUtil.generateRandomText(messageUtil.BOUNCED, { player: player }), false, true);
}

function onCountdown(value) {
    if (value.match(/TRUE/) != null) {
	countdown = true;
        return;
    }
    if (value.match(/GO/) != null) {
        countdown = true;
        webhook.postInChat(`LETSAGO ${value.replace("[Server]: ", "")} LETSAGO`, false, false);
    } else if (value.match(/Starting/)) {
        console.log(value);
    } else {
        webhook.postInChat(`${value.replace("[Server]: ", "")}`, false, false);
    }
}

function onHint(receiver, item, location, sender) {
    if (sender == "Chat") {
        let data = { location: location, item: item, receiver: receiver };
        webhook.postInChat(messageUtil.generateRandomText(messageUtil.HINTED, data), false, false);
    } else {
        webhook.postInChat(`I looked, and ${sender} is hoarding ${item} in ${location}.`, false, false);
        webhook.postInChat(`${location}? What the hell does that even mean? Is this even real?`, false, false);
    }
}

let currentLocation;
let searchAttempts = 0;
let lootAttempts = 0;
let lastCheckTime = new Date(0);

function isInCooldown() {
    return (new Date() - lastCheckTime) < config.gameSettings.checkCooldown * 1000;
}

function notifyCooldown() {
    if (countdown) { webhook.postInChat(messageUtil.generateRandomText(messageUtil.OFF_COOLDOWN)) }
}

function deathLink(player) {
    let randAtk = thesaurus.find("demise");
    console.log(randAtk);
    let reason = `${player} met their ${messageUtil.getRandomIndex(randAtk)} by ${messageUtil.generateRandomText(messageUtil.KILLER)}!`
    webhook.postInChat(`Good luck everyone, @${reason}`, false, false);
    // currently_dead = true; // for testing
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
            webhook.postInChat("Oooooh look! It's @LMarioza, @Dranzior, and @DelilahIsDidi! You can't loot them though, so you should \'!search\' first.");
        } else {
            webhook.postInChat("Ok, I'll open this cache of air. Nothing here, maybe you should use \'!search.\'");
        }
        return;
    }
    lootAttempts++;
    if (lootAttempts >= config.gameSettings.lootAttemptsRequired) {
        if (Math.random() < config.gameSettings.lootChance || lostIt) {
            lostIt = false;
            const triggeredLocation = currentLocation;
            currentLocation = undefined;
            lastCheckTime = new Date();
            lootAttempts = 0;
            searchAttempts = 0;
            archipelagoHelper.claimCheck(triggeredLocation);
            let itemName = archipelagoHelper.getItemNameByLocation(triggeredLocation);
            if (itemName.match(/Chat/) == null) {
                webhook.postInChat(messageUtil.generateRandomText(messageUtil.ITEM_FOUND, { item: itemName }));
            }
            if (archipelagoHelper.checkGoal(triggeredLocation) && !goal) {
                archipelagoHelper.goal();
                webhook.postInChat('You did it Chat! You completed your goal!');
                goal = true;
            }
            if (archipelagoHelper.anyLocationsLeft){
		        setTimeout(notifyCooldown, config.gameSettings.checkCooldown * 1000);
	        } else { 
                webhook.postInChat(messageUtil.generateRandomText(messageUtil.LOCATION_FOUND, { location: "bbirbComfy Home bbirbHug" }));
                webhook.postInChat("Chat, we've been everywhere, found everything, and there's nothing more to loot. Great job friends, thanks for playing Chatipelago with us bbirbLove");
                console.log("No more locations, exiting");
                setTimeout(server.sayGoodBye, 10000); 
	        }
        } else {
            lootAttempts = 0;
            searchAttempts = 0;
            lostIt = true;
            webhook.postInChat(messageUtil.generateRandomText(messageUtil.ITEM_MISSED, { location: archipelagoHelper.getLocationName(currentLocation) }));
        }
    }
}

function attemptSearch(message) {
    if (isInCooldown()) return;
    searchAttempts++
    if (searchAttempts >= config.gameSettings.searchAttemptsRequired && Math.random() < config.gameSettings.lootChance) {
        currentLocation = archipelagoHelper.getCheckableLocation();
        if (!currentLocation) {
	        webhook.postInChat("Whooooa Chat, you've cleared out all of your available checks! I know BK is the favorite around here, but how about a $6 sub to pass the time?");
	} else {
        lootAttempts = 0;
        searchAttempts = 0;
        webhook.postInChat(messageUtil.generateRandomText(messageUtil.LOCATION_FOUND, { location: archipelagoHelper.getLocationName(currentLocation) }));
        }
    }
}

function onChatiConnect(message) {
    let text = message + ""
    archipelagoHelper.connect(text);
}
