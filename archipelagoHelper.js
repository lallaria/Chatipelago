
var gameName = "Chatipelago";

var archipelago = require("archipelago.js");
var config = require("./config.js");

const connectionInfo = {
    hostname: config.connectionInfo.hostname,
    port: config.connectionInfo.port,
    game: gameName,
    name: config.connectionInfo.playerName,
    tags: config.connectionInfo.tags,
    items_handling: archipelago.ITEMS_HANDLING_FLAGS.REMOTE_ALL
}

const client = new archipelago.Client();

client.connect(connectionInfo)
    .then(() => {
        console.log("connected");
        client.updateStatus(archipelago.CLIENT_STATUS.CONNECTED);
    })
    .catch((error) => { console.error("Failed to connect:", error); });

var onItemRecieved;
var onDeathLink;
var onCountdown;
const notifiedItems = []
const locationItem = {};
client.addListener(archipelago.SERVER_PACKET_TYPE.LOCATION_INFO, ({ locations }) => {
    locations?.forEach(({ item, player, location }) => locationItem[location] = { player, item });
    console.log('items mapped to locations', locationItem)
});
client.addListener(archipelago.SERVER_PACKET_TYPE.RECEIVED_ITEMS, (packet) => {
    var items = packet["items"];
    for (i = 0; i < items.length; ++i) {
        const itemId = items[i]["item"];
        const itemflags = items[i]["flags"];
        if (notifiedItems.includes(itemId)) continue;
        notifiedItems.push(itemId);
        console.log("Item received", i, items[i]);
        onItemRecieved(itemId, client.items.name(gameName, itemId), client.players.name(items[i]["player"]), itemflags);
    }
});
client.addListener(archipelago.SERVER_PACKET_TYPE.BOUNCED, (packet) => {
    if (typeof packet["tags"] === "undefined") { return; }
    if (packet["tags"].some(str => str.includes('DeathLink'))) {
        const data = packet["data"];
        console.log("DeathLink:", data["cause"], data["source"]);
        return onDeathLink(data["source"],data["cause"]);
    }
    return;
});
client.addListener(archipelago.SERVER_PACKET_TYPE.PRINT_JSON, (packet, message) => {
    if (packet.type === archipelago.PRINT_JSON_TYPE.COUNTDOWN) {
        var countdown = message;
        console.log(countdown);
        onCountdown(countdown);
    }
});

// Only need to have locations and ids that will be used for requirements and goals
class LOCATIONS {
    static TREE1 = 600;
    static TREE2 = 601;
    static TREE3 = 602;
    static TREE4 = 603;
    static TREE5 = 604;
    static TREE6 = 605;
    static TREE7 = 606;
    static TREE8 = 607;
    static TREE9 = 608;
    static TREE10 = 609;
    // static ITEM_ON_DESK = 69696968;
}

class ITEMS {
    // static FEELING_OF_SATISFACTION = 69696969;
    static MAGPIE1 = 11490;
    static MAGPIE2 = 11491;
    static MAGPIE3 = 11492;
    // static A_COOL_FILLER_ITEM = 69696967;
}

module.exports = {
    REQUIREMENTS: {
        [LOCATIONS.TREE1]: [ITEMS.MAGPIE1, ITEMS.MAGPIE2, ITEMS.MAGPIE3],
        [LOCATIONS.TREE2]: [ITEMS.MAGPIE1, ITEMS.MAGPIE2, ITEMS.MAGPIE3],
        [LOCATIONS.TREE3]: [ITEMS.MAGPIE1, ITEMS.MAGPIE2, ITEMS.MAGPIE3],
        [LOCATIONS.TREE4]: [ITEMS.MAGPIE1, ITEMS.MAGPIE2, ITEMS.MAGPIE3],
        [LOCATIONS.TREE5]: [ITEMS.MAGPIE1, ITEMS.MAGPIE2, ITEMS.MAGPIE3],
        [LOCATIONS.TREE6]: [ITEMS.MAGPIE1, ITEMS.MAGPIE2, ITEMS.MAGPIE3],
        [LOCATIONS.TREE7]: [ITEMS.MAGPIE1, ITEMS.MAGPIE2, ITEMS.MAGPIE3],
        [LOCATIONS.TREE8]: [ITEMS.MAGPIE1, ITEMS.MAGPIE2, ITEMS.MAGPIE3],
        [LOCATIONS.TREE9]: [ITEMS.MAGPIE1, ITEMS.MAGPIE2, ITEMS.MAGPIE3],
        [LOCATIONS.TREE10]: [ITEMS.MAGPIE1, ITEMS.MAGPIE2, ITEMS.MAGPIE3],
    },

    GOALS: [LOCATIONS.TREE1, LOCATIONS.TREE2, LOCATIONS.TREE3, LOCATIONS.TREE4, LOCATIONS.TREE5,
            LOCATIONS.TREE6, LOCATIONS.TREE7, LOCATIONS.TREE8, LOCATIONS.TREE9, LOCATIONS.TREE10],

    checkGoal: function (lastLocation) {
        // include lastLocation because client.locations.checked may not be updated yer
        const checked = [...client.locations.checked, lastLocation];
        console.log(checked, this.GOALS);
        return this.GOALS.every((goal) => checked.includes(goal));
    },

    maybeTriggerItemLocationMap: function () {
        if (Object.entries(locationItem).length > 0) return
        // scout all locations to map items locations
        client.locations.scout(0, ...client.locations.checked, ...client.locations.missing);
    },

    getItemNameByLocation: function (location) {
        const { player, item } = locationItem[location] ?? {};
        if (!player || !item) return;
        return `${client.items.name(player, item)} for ${client.players.name(player)}`;
    },

    getCheckableLocation: function () {
        const validLocations = client.locations.missing.filter((location) => {
            const requirements = this.REQUIREMENTS[location] ?? [];
            return requirements.every((requirement) => this.isItemObtained(requirement));
        });

        if (validLocations.length === 0) return;

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
    setOnDeathLink: function (func) {
        onDeathLink = func;
    },

    setOnCountdown: function (func) {
        onCountdown = func;
    },
    getLocationName: function (location) {
        return client.locations.name(gameName, location)
    },

    giveDeathLink: function (reason) {
        return client.send(
            {
                cmd: archipelago.CLIENT_PACKET_TYPE.BOUNCE,
                tags: ["DeathLink"],
                data: {
                    time: Date.now,
                    source: client.player.name,
                    cause: reason
                }
            })
    },

    goal: function () {
        client.updateStatus(archipelago.CLIENT_STATUS.GOAL);
    }
}
