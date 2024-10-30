/*
When the webserver receives something from AP, it should push to MixItUp (can also push to the obs-source carousel)
https://wiki.mixitupapp.com/en/commands/webhook-commands

*/

var config = require("./config.js");

module.exports = {
    postInChat: function (message) {
        console.log(`Posting "${message}" in chat`);
        post(message, config.webhookUrl);
    }
}

function post(message, url) {

    var content = { text: message };

    response = fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(content)
    });

}