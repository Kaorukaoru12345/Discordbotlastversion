require('dotenv').config();

const axios = require('axios');
const fs = require('fs').promises; // Use promises for async file handling
const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');
const WebSocket = require('ws');

const API_KEY = process.env.COINAPI;
const COINAPI_URL = 'https://rest.coinapi.io/v1/exchangerate/BTC/USD';
const COINAPI_HISTORY_URL = 'https://rest.coinapi.io/v1/exchangerate/BTC/USD/history?period_id=1DAY&time_start=';
const QUICKCHART_URL = 'https://quickchart.io/chart';
const PRICE_FILE = './previousPrice.txt';
const CAT_API_URL = 'https://api.thecatapi.com/v1/images/search';
const CAT_API_KEY = process.env.CAT_API_KEY;
const NEWS_API_URL = 'https://newsapi.org/v2/everything?q=Bitcoin&sortBy=publishedAt&pageSize=3&language=en'; // Filter for English news

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});
 
// Function to fetch the latest Bitcoin news
async function getBitcoinNews() {
    try {
        const response = await axios.get(NEWS_API_URL, {
            headers: { 'X-Api-Key': process.env.NEWSAPI_KEY }
        });
        return response.data.articles;
    } catch (error) {
        console.error('Error fetching Bitcoin news:', error);
        return null;
    }
}

// Command handler for fetching Bitcoin news
async function handleBitcoinNewsCommand(interaction) {
    const newsArticles = await getBitcoinNews();
    if (!newsArticles || newsArticles.length === 0) {
        return interaction.reply('Sorry, I could not fetch any Bitcoin news at the moment.');
    }

    // Create a single embed for all news articles
    const newsEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Latest Bitcoin News')
        .setTimestamp();

    newsArticles.forEach(article => {
        newsEmbed.addFields({
            name: article.title,
            value: article.description || 'No description available.',
            inline: false,
        });
        newsEmbed.setImage(article.urlToImage); // Add the article image
        newsEmbed.setURL(article.url); // Set the URL for the embed
    });

    // Send the news embed as a reply
    await interaction.reply({ embeds: [newsEmbed] });
}

// Function to send Bitcoin news to a specific channel
async function sendBitcoinNewsToChannel() {
    const channel = client.channels.cache.find(ch => ch.name === 'test');
    if (!channel) {
        console.error('Channel "test" not found!');
        return;
    }

    const newsArticles = await getBitcoinNews();
    if (!newsArticles || newsArticles.length === 0) {
        console.log('No Bitcoin news available to send.');
        return;
    }

    // Create a single embed for all news articles
    const newsEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Latest Bitcoin News')
        .setTimestamp();

    newsArticles.forEach(article => {
        newsEmbed.addFields({
            name: article.title,
            value: article.description || 'No description available.',
            inline: false,
        });
        newsEmbed.setImage(article.urlToImage); // Add the article image
        newsEmbed.setURL(article.url); // Set the URL for the embed
    });

    // Send the news embed to the channel
    await channel.send({ embeds: [newsEmbed] });
}

// Set an interval to send news every 2 hours (7200000 milliseconds)
setInterval(() => {
    sendBitcoinNewsToChannel().catch(console.error);
}, 7200000); // 2 hours in milliseconds
// Load previous Bitcoin price asynchronously
async function loadPreviousPrice() {
    try {
        const data = await fs.readFile(PRICE_FILE, 'utf8');
        return parseFloat(data);
    } catch (err) {
        console.error('Error reading previous price:', err);
        return null;
    }
}

// Save the current Bitcoin price asynchronously
async function savePreviousPrice(price) {
    try {
        await fs.writeFile(PRICE_FILE, price.toString());
    } catch (err) {
        console.error('Error saving the current price:', err);
    }
}

// Fetch the current Bitcoin price with retry logic
async function getBitcoinPrice() {
    try {
        const response = await axios.get(COINAPI_URL, {
            headers: { 'X-CoinAPI-Key': API_KEY },
        });
        return response.data.rate;
    } catch (error) {
        console.error('Error fetching Bitcoin price:', error);
        return null;
    }
}

// Fetch Bitcoin prices for the last 7 days
async function getBitcoinPricesForWeek() {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const url = `${COINAPI_HISTORY_URL}${sevenDaysAgoStr}T00:00:00&time_end=${todayStr}T00:00:00`;

    try {
        const response = await axios.get(url, {
            headers: { 'X-CoinAPI-Key': API_KEY },
        });
        return response.data.map((entry) => entry.rate_close);
    } catch (error) {
        console.error('Error fetching Bitcoin price history:', error);
        return null;
    }
}

// Generate day labels dynamically based on the current day
function getDayLabels() {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(today);
        day.setDate(today.getDate() - (6 - i));
        return daysOfWeek[day.getDay()];
    });
}

// Generate a graph using QuickChart
function generateBitcoinGraph(prices) {
    const labels = getDayLabels();
    const chartConfig = {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Bitcoin Price (USD)',
                    data: prices,
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                },
            ],
        },
        options: { scales: { y: { beginAtZero: false } } },
    };

    return `${QUICKCHART_URL}?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
}

// Calculate percentage changes for each day
function calculatePercentageChanges(prices) {
    return prices.slice(1).map((price, i) => (((price - prices[i]) / prices[i]) * 100).toFixed(2));
}

// Handle slash command interactions with modular functions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'bitcoin') {
        await handleBitcoinCommand(interaction);
    }

    if (interaction.commandName === 'bitcoinweek') {
        await handleBitcoinWeekCommand(interaction);
    }

    if (!interaction.isCommand()) return; // Check if it's a command interaction

    // Handle commands
    if (interaction.commandName === 'bitcoinnews') {
        await handleBitcoinNewsCommand(interaction);
    }
});

// Command handler for fetching current Bitcoin price
async function handleBitcoinCommand(interaction) {
    const currentBtcPrice = await getBitcoinPrice();
    if (!currentBtcPrice) {
        return interaction.reply('Sorry, I could not fetch the Bitcoin price at the moment.');
    }

    const previousBtcPrice = await loadPreviousPrice();
    let priceChangeText = previousBtcPrice !== null
        ? `\nThe price has ${currentBtcPrice >= previousBtcPrice ? 'increased' : 'decreased'} by ${(Math.abs(currentBtcPrice - previousBtcPrice) / previousBtcPrice * 100).toFixed(2)}% since the last check.`
        : '\nThis is the first time you\'re checking the price.';

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Bitcoin Price')
        .setDescription(`The current price of Bitcoin is: **$${currentBtcPrice.toFixed(2)}**${priceChangeText}`)
        .setFooter({ text: 'Powered by CoinAPI' })
        .setTimestamp();

    await savePreviousPrice(currentBtcPrice);

    interaction.reply({ embeds: [embed] });
}

// Command handler for fetching Bitcoin prices over the week
async function handleBitcoinWeekCommand(interaction) {
    const prices = await getBitcoinPricesForWeek();
    if (!prices || prices.length !== 7) {
        return interaction.reply('Sorry, I could not fetch the Bitcoin prices for the last 7 days.');
    }

    const percentageChanges = calculatePercentageChanges(prices);
    const chartUrl = generateBitcoinGraph(prices);

    const labels = getDayLabels();
    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('Bitcoin Price Over the Last 7 Days')
        .setDescription(
            labels.map((day, i) => `${day}: $${prices[i].toFixed(2)}${i > 0 ? ` (${percentageChanges[i - 1]}%)` : ''}`).join('\n')
        )
        .setImage(chartUrl)
        .setFooter({ text: 'Powered by CoinAPI & QuickChart' })
        .setTimestamp();

    interaction.reply({ embeds: [embed] });
};

// Check if token is valid before logging in
const token = process.env.TOKEN;
if (token && typeof token === 'string' && token.length >= 10) {
    client.login(token).catch(error => {
        console.error('Failed to log in to Discord:', error);
    });
} else {
    console.error('Invalid Discord bot token provided. Please check your .env file.');
}
console.log('Token:', process.env.TOKEN); 
console.log('All Environment Variables:', process.env);
console.log('Token:', token); // Check the value here
