import * as fs from 'fs';

export {
    generateRandomText,
    OFF_COOLDOWN,
    LOCATION_FOUND,
    ITEM_MISSED,
    ITEM_FOUND,
    ITEM_RECIEVED,
    BOUNCED,
    ITEM_TRAP
}

function loadJson(filename) {
    var json = JSON.parse(fs.readFileSync(filename, 'utf8'));
    var messageList = [];

    for (var i = 0; i < json.length; ++i) {
        messageList[i] = json[i];
    }

    return messageList;
}

function generateRandomText (textList, variables) {
    var randomPick = Math.floor(Math.random() * textList.length);

    var text = textList[randomPick];

    if (variables != null) {
        var keys = Object.keys(variables);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            var value = variables[keys[i]];
            text = text.replace(`{${key}}`, value);
        }
    }

    return text;
}

let OFF_COOLDOWN = loadJson('messages/offCooldown.json');
let LOCATION_FOUND = loadJson('messages/locationFound.json');
let ITEM_MISSED = loadJson('messages/itemMissed.json');
let ITEM_FOUND = loadJson('messages/itemFound.json');
let ITEM_RECIEVED = loadJson('messages/itemRecieved.json');
let BOUNCED = loadJson('messages/bounced.json'); //deathlink
let ITEM_TRAP = loadJson('messages/itemTrap.json');
