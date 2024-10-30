
var gameName = "Clique";

var archipelago = require("archipelago.js");
var config = require("./config.js");

const connectionInfo = {
    hostname: config.connectionInfo.hostname,
    port: config.connectionInfo.port,
    game: gameName,
    name: config.connectionInfo.playerName,
    items_handling: archipelago.ITEMS_HANDLING_FLAGS.REMOTE_ALL
}

const client = new archipelago.Client();

client.connect(connectionInfo)
    .then(() => { console.log("connected"); client.updateStatus(archipelago.CLIENT_STATUS.PLAYING); })
    .catch((error) => { console.error("Failed to connect:", error); });

var onItemRecieved;
client.addListener(archipelago.SERVER_PACKET_TYPE.RECEIVED_ITEMS, (packet, message) => {
    var items = packet["items"];
    for (i = 0; i < items.length; ++i) {
        console.log("Item received", i, items[i]);
        onItemRecieved(items[i]["item"], client.items.name(gameName, items[i]["item"]), client.players.name(items[i]["player"]));
    }
});

module.exports = {
    LOCATIONS: class {
        static BIG_RED_BUTTON = 69696969;
        static ITEM_ON_DESK = 69696968;
    },

    ITEMS: class {
        static FEELING_OF_SATISFACTION = 69696969;
        static BUTTON_ACTIONVATION = 69696968;
        static A_COOL_FILLER_ITEM = 69696967;
    },

    isItemObtained: function (itemId) {
        console.log(client.items.received);
        return client.items.received.some(item => item.item === itemId);
    },

    claimCheck: function (locationId) {
        client.locations.check(locationId);
    },

    setOnItemRecieved: function (fct) {
        onItemRecieved = fct;
    },

    goal: function () {
        client.updateStatus(archipelago.CLIENT_STATUS.GOAL);
    }
}