/*
This pushes to the Mixitup webhook.  Can also work for streamer.bot
*/

import * as config from './config.js';

export {
    postInChat
}

function postInChat(message, trap, bounced) {
    console.log(`Posting "${message}" in chat`);
    post(message, config.webhookUrl, trap, bounced);
}

function post(message, url, trap, bounced) {
    if (!trap && !bounced) {
        var content = {text: message, trap: false, bounced: false};
    } else if (trap && !bounced) {
        var content = {text: message, trap: true, bounced: false};
    } else if (!trap && bounced) {
        var content = {text: message, trap: false, bounced: true};
    }

    let response = fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(content)
    }).catch(function(err) { console.log(err.message); });

}