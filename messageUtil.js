import * as fs from 'fs';

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

OFF_COOLDOWN: loadJson('messages/offCooldown.json');
LOCATION_FOUND: loadJson('messages/locationFound.json');
ITEM_MISSED:loadJson('messages/itemMissed.json');
ITEM_FOUND:loadJson('messages/itemFound.json');
ITEM_RECIEVED:loadJson('messages/itemRecieved.json');
BOUNCED:loadJson('messages/bounced.json'); //deathlink
ITEM_TRAP:loadJson('messages/itemTrap.json');
