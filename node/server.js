const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const expressJson = require('express').json;
const nodemailer = require('nodemailer');
require('dotenv').config();

let oldTally = {};
const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(expressJson());

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
    await checkForMedalUpdates();
    console.log('Quadro de medalhas atualizado!');
});

app.get('/notify', (req, res) => {  
    res.sendFile(path.join(__dirname, 'public/notify.html'));
});

app.post('/api/events', async (req, res) => {
    const { notificationDetail } = req.body;
    const events = loadEvents();
    const newEvent = { notificationType: 'email', notificationDetail };
    events.push(newEvent);
    saveEvents(events);
    res.status(201).send('Evento cadastrado com sucesso!');
});

app.get('/data', async (req, res) => {
    try {
        await downloadAndSaveCsv();
        const csvData = await processCsv(path.join('uploads', 'downloaded.csv'));
        res.json(csvData);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT, 10),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    }
});

function send(to, subject, text) {
    return transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        text,
    });
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
        await downloadAndSaveCsv();
        const newTally = getMedalData();

        for (const country of newTally) { 
            const newMedals = country;
            const oldMedals = oldTally[newMedals.country] || { gold: 0, silver: 0, bronze: 0 };

            if (newMedals.gold > oldMedals.gold || newMedals.silver > oldMedals.silver || newMedals.bronze > oldMedals.bronze) {
                const message = `${newMedals.country} ganhou uma nova medalha!`;
                const events = loadEvents();
                for (const event of events) {
                    await send(event.notificationDetail, 'Nova Medalha!', message);
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
        const data = fs.readFileSync(path.join('uploads', 'downloaded.csv'), 'utf-8');
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
        const response = await axios.get('http://python-server:5000/download_csv', { responseType: 'stream' });
        const filePath = path.join(__dirname, 'uploads', 'downloaded.csv');
        const writer = fs.createWriteStream(filePath);

        return new Promise((resolve, reject) => {
            response.data.pipe(writer);
            writer.on('finish', () => resolve());
            writer.on('error', (err) => reject(err));
        });
    } catch (err) {
        throw new Error(`Erro ao baixar o arquivo CSV: ${err.message}`);
    }
}

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
