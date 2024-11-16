var fs = require('fs');
const { exit } = require('process');

function loadJson(filename) {
    var json = JSON.parse(fs.readFileSync(filename, 'utf8'));
    var messageList = [];

    for (var i = 0; i < json.length; ++i) {
        messageList[i] = json[i];
    }

    return messageList;
}

function myCallback() {
    console.log("Saved");
}

module.exports = {
    saveItems: function (collectedItems, filename) {
        var jsonItems = JSON.stringify(collectedItems);
        fs.writeFile(filename, jsonItems, 'utf8', myCallback);
    },

    loadItems: function (filename) {
        var itemList = [];
        try {
            var json = JSON.parse(fs.readFileSync(filename, 'utf8'));
        } catch (err) {
            if (err.code === 'ENOENT') {
                return itemList;
            }
            else {
                console.log(err);
                exit();
            }
        }

        for (var i = 0; i < json.length; ++i) {
            itemList[i] = json[i];
        }

        return itemList;
    },

    generateRandomText: function (textList, variables) {
        var text = this.getRandomIndex(textList);

        if (variables != null) {
            var keys = Object.keys(variables);
            for (var i = 0; i < keys.length; ++i) {
                var key = keys[i];
                var value = variables[keys[i]];
                text = text.replace(`{${key}}`, value);
            }
        }
        
        return text;
    },
    getRandomIndex: function (textList) {
        var randomPick = Math.floor(Math.random() * textList.length);
        return textList[randomPick];
    },

    SELF_FIND: loadJson('messages/selfFind.json'),
    OFF_COOLDOWN: loadJson('messages/offCooldown.json'),
    LOCATION_FOUND: loadJson('messages/locationFound.json'),
    ITEM_MISSED: loadJson('messages/itemMissed.json'),
    ITEM_FOUND: loadJson('messages/itemFound.json'),
    ITEM_RECIEVED: loadJson('messages/itemRecieved.json'),
    BOUNCED: loadJson('messages/bounced.json'), //deathlink
    ITEM_TRAP: loadJson('messages/itemTrap.json'),
    BOUNCE: loadJson('messages/bounce.json'),
    KILLER: loadJson('messages/theKiller.json')
}