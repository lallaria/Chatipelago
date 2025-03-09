import * as fs from 'fs';
import exit from 'process';

export {
    generateRandomText,
    loadItems,
    saveItems,
    getRandomIndex,
    SELF_FIND,
    OFF_COOLDOWN,
    LOCATION_FOUND,
    ITEM_MISSED,
    ITEM_FOUND,
    ITEM_RECIEVED,
    BOUNCED,
    ITEM_TRAP,
    BOUNCE,
    KILLER,
    HINTED
}

function getRandomIndex(textList) {
    var randomPick = Math.floor(Math.random() * textList.length);
    return textList[randomPick];
}

function loadJson(filename) {
    var json = JSON.parse(fs.readFileSync(filename, 'utf8'));
    var messageList = [];

    for (var i = 0; i < json.length; ++i) {
        messageList[i] = json[i];
    }

    return messageList;
}

function generateRandomText(textList, variables) {
    var text = getRandomIndex(textList);

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

let SELF_FIND = loadJson('messages/selfFind.json');
let OFF_COOLDOWN = loadJson('messages/offCooldown.json');
let LOCATION_FOUND = loadJson('messages/locationFound.json');
let ITEM_MISSED = loadJson('messages/itemMissed.json');
let ITEM_FOUND = loadJson('messages/itemFound.json');
let ITEM_RECIEVED = loadJson('messages/itemRecieved.json');
let BOUNCED = loadJson('messages/bounced.json'); //deathlink get
let ITEM_TRAP = loadJson('messages/itemTrap.json');
let BOUNCE = loadJson('messages/bounce.json'); //deathlink send to everyone
let KILLER = loadJson('messages/theKiller.json');
let HINTED = loadJson("messages/hintedItem.json");
let jsonItems;

function myCallback() {
    console.log(`Saved ${jsonItems}`);
}

function saveItems(collectedItems, filename) {
    jsonItems = JSON.stringify(collectedItems);
    fs.writeFile(filename, jsonItems, myCallback);
}

function loadItems(filename) {
    var itemList = [];
    try {
        var json = JSON.parse(fs.readFileSync(filename, 'utf8'));
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log("Empty")
            return itemList;
        } else {
            console.log(err);
            exit();
        }
    }

    for (var i = 0; i < json.length; ++i) {
        itemList[i] = json[i];
    }

    return itemList;
}




