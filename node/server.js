const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const expressJson = require('express').json;
import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
const csv = require('csv-parser');
require('dotenv').config();


const app = express();
const port = 3000;
const filePath = path.join(__dirname, 'uploads', 'downloaded.csv');

app.use(express.static(path.join(__dirname, 'public')));
app.use(expressJson());

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
    console.log('Quadro de medalhas atualizado!');
});

app.get('/notify', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/notify.html'));
});

app.post('/api/events', async (req, res) => {
    const { notificationDetail } = req.body;
    const events = loadEvents();
    const newEvent = { notificationType: 'telegram', notificationDetail };
    events.push(newEvent);
    saveEvents(events);
    res.status(201).send('Evento cadastrado com sucesso!');
});

app.get('/data', async (req, res) => {
    const results = [];
    try {
        fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          res.json(results);
        })
        .on('error', (err) => {
          res.status(500).json({ error: err.message });
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

function send(to, message) {
    return bot.sendMessage(to, message);
}

const eventsFilePath = path.join(__dirname, 'events.json');

function loadEvents() {
    if (fs.existsSync(eventsFilePath)) {
        const data = fs.readFileSync(eventsFilePath, 'utf-8');
        return JSON.parse(data);
    }
    return [];
}

function saveEvents(events) {
    fs.writeFileSync(eventsFilePath, JSON.stringify(events, null, 2), 'utf-8');
}

async function checkForMedalUpdates() {
    try {
        const oldTally = getMedalData();
        await downloadAndSaveCsv();
        const newTally = getMedalData();

        for (const country of newTally) { 
            const newMedals = country;
            const oldMedals = oldTally[newMedals.country] || { gold: 0, silver: 0, bronze: 0 };

            if (newMedals.gold > oldMedals.gold || newMedals.silver > oldMedals.silver || newMedals.bronze > oldMedals.bronze) {
                const message = `${newMedals.country} ganhou uma nova medalha!`;
                const events = loadEvents();
                for (const event of events) {
                    await send(event.notificationDetail, message);
                }
                oldTally[newMedals.country] = newMedals;
            }
        }
    } catch (err) {
        console.error('Erro ao atualizar o quadro de medalhas:', err);
    }
}

function getMedalData() {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        const lines = data.split('\n').slice(1);
        return lines.map(line => {
            const [posicao, country, gold, silver, bronze, total] = line.split(',');
            return { 
                country, 
                gold: parseInt(gold) || 0,
                silver: parseInt(silver) || 0,
                bronze: parseInt(bronze) || 0,
                total: parseInt(total) || 0
            };
        }).filter(d => d.country);
    } catch (err) {
        throw new Error(`Erro ao processar o arquivo CSV: ${err.message}`);
    }
}

async function downloadAndSaveCsv() {
    try {
        const response = await axios.get('http://python-server-container:5000/download_csv', { responseType: 'stream' });
        const writer = fs.createWriteStream(filePath);

        return new Promise((resolve, reject) => {
            response.data.pipe(writer);
            writer.on('finish', () => {
                console.log('Arquivo CSV salvo com sucesso!');
                resolve();
            });
            writer.on('error', (err) => {
                console.error('Erro ao salvar o arquivo:', err);
                reject(err);
            });
        });
    } catch (err) {
        console.error(`Erro ao baixar o arquivo CSV: ${err.message}`);
        throw new Error(`Erro ao baixar o arquivo CSV: ${err.message}`);
    }
}

setInterval(checkForMedalUpdates, 30000);    // Verifica a cada 30 segundos

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
