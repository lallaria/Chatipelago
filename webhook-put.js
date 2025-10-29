/*
This pushes to the Mixitup webhook.  Can also work for streamer.bot
Now uses WebSocket for Streamer.bot communication
*/

import * as path from 'path';
import * as config from './config.js';
import { fileURLToPath } from 'url';
import { StreamerbotClient } from '@streamerbot/client';

// Get the shared Streamer.bot client instance
let streamerbotclient;

export {
    postInChat,
    setStreamerbotClient
}

function setStreamerbotClient(client) {
    streamerbotclient = client;
}

async function postInChat(message, trap, bounced) {
    console.log(`Posting "${message}" in chat`);

    if (config.mixitup) {
        let response = await post(message, config.webhookUrl, trap, bounced);
        return response.text;
    };
    
    async function post(message, url, trap, bounced) {
        let content = {text: message, trap: trap, bounced: bounced};
        let response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(content)
        });
        return await response.json();    
    };

    if (config.streamerbot) {
        try {
            if (trap) {
                // Trap message triggers additional trap-related actions with response
                const response = await streamerbotclient.doAction(config.streamerbotActions.trapMessage, { 
                    message: message,
                    customEventResponse: true 
                });
                
                // Extract the timedOutUser argument from the response
                if (response.customEventResponseArgs && response.customEventResponseArgs.timedOutUser) {
                    console.log('Chat user died:', response.customEventResponseArgs.timedOutUser);
                    return response.customEventResponseArgs.timedOutUser;
                }

                return response;
            } else if (bounced) {
                // Bounced message enables emote mode for 30 seconds
                await streamerbotclient.doAction(config.streamerbotActions.bouncedMessage, { 
                    message: message,
                });
            } else {
                // Normal message
                await streamerbotclient.sendMessage({
                    message: message,
                    platform: 'Twitch'
                });
            };
        } catch (error) {
            console.error('Error sending message via WebSocket:', error);
        }
    };
}
