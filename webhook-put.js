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

async function sendMessage(message) {
    await streamerbotclient.sendMessage('twitch', message, { bot: true });
}

async function postInChat(message, trap, bounced) {
    console.log(`Posting "${message}" in chat`);

    if (config.mixitup) {
        let response = await post(message, config.mixitupConfig.webhookUrl, trap, bounced);
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
        
        // Check if response has content before parsing JSON
        const text = await response.text();
        if (!text || text.trim().length === 0) {
            return { text: null };
        }
        
        try {
            return await JSON.parse(text);
        } catch (error) {
            // If parsing fails, return the raw text
            return { text: text };
        }
    };

    if (config.streamerbot) {
        try {
            // Check WebSocket connection status before attempting to send
            if (!streamerbotclient || !streamerbotclient.socket || streamerbotclient.socket.readyState !== streamerbotclient.socket.OPEN) {
                console.error('[Streamer.bot] WebSocket not connected. State:', streamerbotclient?.socket?.readyState ?? 'client not initialized');
                return;
            }

            if (trap) {
                // Trap message triggers additional trap-related actions with response
                await sendMessage(message);
                const response = await streamerbotclient.doAction(config.streamerbotActions.trapMessage, { 
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
                await sendMessage(message);
                await streamerbotclient.doAction(config.streamerbotActions.bouncedMessage, { 
                    message: message,
                });
            } else {
                // Normal message
                await sendMessage(message);
            };
        } catch (error) {
            console.error('[Streamer.bot Error] Failed to send message:', {
                message: error.message,
                stack: error.stack,
                socketState: streamerbotclient?.socket?.readyState,
                errorDetails: error.response || error.data || error
            });
        }
    };
}
