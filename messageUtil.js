import * as fs from 'fs';
import path from 'path';
import exit from 'process';
import { getCustomConfigPath } from './config-unpacker-esm.js';

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
    HINTED,
    EMOTES
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
let EMOTES = {};
let jsonItems;

function loadJsonObject(filename) {
    try {
        return JSON.parse(fs.readFileSync(filename, 'utf8'));
    } catch (e) {
        console.error(`error loading json Object from file ${filename}`);
        console.error(e);
        return {};
    }
}

function loadFiles() {
    // Use unpacked config path if running as nexe executable, otherwise use local path
    const customConfigPath = getCustomConfigPath();
    
    SELF_FIND = loadJson(path.join(customConfigPath, 'messages/selfFind.json'));
    OFF_COOLDOWN = loadJson(path.join(customConfigPath, 'messages/offCooldown.json'));
    LOCATION_FOUND = loadJson(path.join(customConfigPath, 'messages/locationFound.json'));
    ITEM_MISSED = loadJson(path.join(customConfigPath, 'messages/itemMissed.json'));
    ITEM_FOUND = loadJson(path.join(customConfigPath, 'messages/itemFound.json'));
    ITEM_RECIEVED = loadJson(path.join(customConfigPath, 'messages/itemRecieved.json'));
    BOUNCED = loadJson(path.join(customConfigPath, 'messages/bounced.json')); //deathlink get
    ITEM_TRAP = loadJson(path.join(customConfigPath, 'messages/itemTrap.json'));
    BOUNCE = loadJson(path.join(customConfigPath, 'messages/bounce.json')); //deathlink send to everyone
    KILLER = loadJson(path.join(customConfigPath, 'messages/theKiller.json'));
    HINTED = loadJson(path.join(customConfigPath, "messages/hintedItem.json"));
    EMOTES = loadJsonObject(path.join(customConfigPath, 'messages/etc.json'));
}

function myCallback() {
    console.debug(`Saved ${jsonItems}`);
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
            console.debug("Empty")
            return itemList;
        } else {
            console.error(err);
            exit();
        }
    }

    for (var i = 0; i < json.length; ++i) {
        itemList[i] = json[i];
    }

    return itemList;
}




