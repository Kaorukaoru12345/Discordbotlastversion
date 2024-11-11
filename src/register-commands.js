require('dotenv').config({ path: '../.env' }); // Adjusted path to point to the .env file
const { REST, Routes } = require('discord.js');

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; 

console.log('Client ID:', clientId); // Debugging line
console.log('Bot Token:', process.env.TOKEN ? 'Loaded' : 'Not Loaded'); // Debugging line

const commands = [
    {
        name: 'ping',
        description: 'Pong!'
    },
    {
        name: 'bitcoin',
        description: "Shows Bitcoin price and its change since last check."
    },
    {
        name: 'bitcoinweek',
        description: "Shows the Bitcoin price over the last 7 days along with percentage changes and a graph."
    },
    {
        name: 'cat',
        description: "Cat for matrix."
    },
    {
        name: 'bitcoinnews',
        description: 'Fetches news from BTC news sites'
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Started refreshing global application (/) commands.');

        // This registers the commands globally across all servers
        await rest.put(
            Routes.applicationCommands(clientId), // For global commands
            { body: commands },
        );

        console.log('Successfully reloaded global application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error); // More detailed error logging
    }
})();
