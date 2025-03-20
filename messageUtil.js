import * as fs from 'fs';
import exit from 'process';

export {
    loadFiles,
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
    try {
        var json = JSON.parse(fs.readFileSync(filename, 'utf8'));

        var messageList = [];

        for (var i = 0; i < json.length; ++i) {
            messageList[i] = json[i];
        }

        return messageList;
    } catch (e) {
        console.error(`error loading json Array from file ${filename}`);
        console.error(e);
        return [];
    }
}

function generateRandomText(textList, variables) {
    var text = getRandomIndex(textList);

    if (variables != null && text != null) {
        var keys = Object.keys(variables);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            var value = variables[keys[i]];
            text = text.replace(`{${key}}`, value);
        }
    }

    return text;
}

let SELF_FIND = [];
let OFF_COOLDOWN = [];
let LOCATION_FOUND = [];
let ITEM_MISSED = [];
let ITEM_FOUND = [];
let ITEM_RECIEVED = [];
let BOUNCED = [];
let ITEM_TRAP = [];
let BOUNCE = [];
let KILLER = [];
let HINTED = [];
let jsonItems;

function loadFiles() {
    SELF_FIND = loadJson('customConfig/messages/selfFind.json');
    OFF_COOLDOWN = loadJson('customConfig/messages/offCooldown.json');
    LOCATION_FOUND = loadJson('customConfig/messages/locationFound.json');
    ITEM_MISSED = loadJson('customConfig/messages/itemMissed.json');
    ITEM_FOUND = loadJson('customConfig/messages/itemFound.json');
    ITEM_RECIEVED = loadJson('customConfig/messages/itemRecieved.json');
    BOUNCED = loadJson('customConfig/messages/bounced.json'); //deathlink get
    ITEM_TRAP = loadJson('customConfig/messages/itemTrap.json');
    BOUNCE = loadJson('customConfig/messages/bounce.json'); //deathlink send to everyone
    KILLER = loadJson('customConfig/messages/theKiller.json');
    HINTED = loadJson("customConfig/messages/hintedItem.json");
}

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




