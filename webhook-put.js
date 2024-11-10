/*
When the webserver receives something from AP, it should push to MixItUp (can also push to the obs-source carousel)
https://wiki.mixitupapp.com/en/commands/webhook-commands

*/

import * as config from './config.js';

function postInChat(message, trap, bounced) {
    console.log(`Posting "${message}" in chat`);
    post(message, config.webhookUrl, trap, bounced);
}

function post(message, url, trap, bounced) {
    if (!trap && !bounced) { var content = { text: message, trap: false, bounced: false }; }
    else if (trap && !bounced) { var content = { text: message, trap: true, bounced: false }; }
    else if (!trap && bounced) { var content = { text: message, trap: false, bounced: true }; }

    response = fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(content)
    });

}