
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
    .then(() => {
        console.log("connected");
        client.updateStatus(archipelago.CLIENT_STATUS.PLAYING);
    })
    .catch((error) => { console.error("Failed to connect:", error); });

var onItemRecieved;

const locationItem = {};
client.addListener(archipelago.SERVER_PACKET_TYPE.LOCATION_INFO, ({locations}) => {
    locations?.forEach(({item, player, location}) => locationItem[location] = {player, item});
    console.log('items mapped to locations', locationItem)
});
client.addListener(archipelago.SERVER_PACKET_TYPE.RECEIVED_ITEMS, (packet, message) => {
    var items = packet["items"];
    for (i = 0; i < items.length; ++i) {
        console.log("Item received", i, items[i]);
        onItemRecieved(items[i]["item"], client.items.name(gameName, items[i]["item"]), client.players.name(items[i]["player"]));
    }
});

// Only need to have locations and ids that will be used for requirements and goals
class LOCATIONS {
    static BIG_RED_BUTTON = 69696969;
    // static ITEM_ON_DESK = 69696968;
}

class ITEMS {
    // static FEELING_OF_SATISFACTION = 69696969;
    static BUTTON_ACTIONVATION = 69696968;
    // static A_COOL_FILLER_ITEM = 69696967;
}

module.exports = {
    REQUIREMENTS: {
        [LOCATIONS.BIG_RED_BUTTON]: [ITEMS.BUTTON_ACTIONVATION],
    },

    GOALS: [LOCATIONS.BIG_RED_BUTTON],

    checkGoal: function (lastLocation) {
        // include lastLocation because client.locations.checked may not be updated yer
        const checked = [...client.locations.checked,lastLocation];
        console.log(checked, this.GOALS);
        return this.GOALS.every((goal) => checked.includes(goal));
    },

    maybeTriggerItemLocationMap: function () {
        if(Object.entries(locationItem).length> 0) return
        // scout all locations to map items locations
        client.locations.scout(0, ...client.locations.checked, ...client.locations.missing);
    },

    getItemNameByLocation: function (location) {
        const {player, item} = locationItem[location] ?? {};
        if(!player || !item) return;
        return `${client.items.name(player,item)} for ${client.players.name(player)}`;
    },

    getCheckableLocation: function () {
        const validLocations = client.locations.missing.filter((location) => {
            const requirements = this.REQUIREMENTS[location] ?? [];
            return requirements.every((requirement) => this.isItemObtained(requirement));
        });

        if(validLocations.length === 0) return;

        return validLocations[Math.floor(Math.random() * validLocations.length)];
    },

    isItemObtained: function (itemId) {
        return client.items.received.some(item => item.item === itemId);
    },

    claimCheck: function (locationId) {
        client.locations.check(locationId);
    },

    setOnItemRecieved: function (fct) {
        onItemRecieved = fct;
    },

    getLocationName: function (location) {
        return client.locations.name(gameName, location)
    },

    goal: function () {
        client.updateStatus(archipelago.CLIENT_STATUS.GOAL);
    }
}