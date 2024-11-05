# Chatipelago

Webserver AP Client for Twitch Chat!

Requirements for use:
Twitch chat integration with a Webhook. 
Tested on Mixitup (did not complete testing on streamer.bot but it should work)

Import mixitup_files into mixitup - webhook into webhook, loot/search into command.
Import will blow away the names, ensure that the name and in chat name (if applicable)
are filled in, and that the command is unlocked.  Copy the webhook url and place it
in config.js

Chatipelago Chat URL can be changed to any host hosting the Chatipelago webserver.
Webserver requirements:
node.js
npm
eslint: ^8.57.1
archipelago.js: ^1.1.0