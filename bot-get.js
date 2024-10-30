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
var chatipelago = require('./archipelagoHelper.js');

server.setOnEvent(onEvent);
chatipelago.setOnItemRecieved(onItem);

function onEvent(message) {
    switch (message) {
        case '/table':
            attemptClaimTable();
            break;
        case '/button':
            attemptPressButton();
            break;
        default:
            wrongCommand();
            break;
    }
}

function onItem(id, name, player) {
    if (!goal) {
        webhook.postInChat(`${player} found our ${name}`);
    }
}

function attemptClaimTable() {
    webhook.postInChat("Getting the item on the desk");
    chatipelago.claimCheck(chatipelago.LOCATIONS.ITEM_ON_DESK);
}

function attemptPressButton() {
    if (chatipelago.isItemObtained(chatipelago.ITEMS.BUTTON_ACTIONVATION)) {
        webhook.postInChat("Pressing the button");
        chatipelago.claimCheck(chatipelago.LOCATIONS.BIG_RED_BUTTON);
        chatipelago.goal();
        goal = true;
    }
    else {
        webhook.postInChat("You need the button activation");
    }
}

function wrongCommand() {
    webhook.postInChat("This is not a valid location");
}