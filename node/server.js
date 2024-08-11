const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const expressJson = require('express').json;
const { Telegraf } = require('telegraf');
const csv = require('csv-parser');
const winston = require('winston');
const moment = require('moment-timezone');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configuração do logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: () => moment().tz('America/Sao_Paulo').format('YYYY-MM-DD HH:mm:ss')
        }),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [
        new winston.transports.File({ filename: path.join(__dirname, 'logs', 'combined.log') })
    ],
});

// Verifica e cria a pasta de logs, se necessário
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
    fs.mkdirSync(path.join(__dirname, 'logs'));
}

// Definição de caminhos e criação de pastas se necessário
const FILE_PATH_SUBSCRIBED = path.join(__dirname, 'subscribedChats.json'); // Caminho para o arquivo JSON que armazena os chats inscritos
const filePathCsv = path.join(__dirname, 'uploads', 'downloaded.csv');

// Verifica e cria a pasta de uploads, se necessário
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'));
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(expressJson());

// Função para verificar e criar o arquivo JSON se não existir
function ensureSubscribedExists() {
    if (!fs.existsSync(FILE_PATH_SUBSCRIBED)) {
        fs.writeFileSync(FILE_PATH_SUBSCRIBED, JSON.stringify([], null, 2), 'utf8');
    }
}

// Função para carregar os IDs das conversas do arquivo JSON
function loadSubscribedChats() {
    try {
        ensureSubscribedExists(); // Garante que o arquivo exista
        const data = fs.readFileSync(FILE_PATH_SUBSCRIBED, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        logger.error(`Erro ao carregar o arquivo JSON: ${err.message}`);
        return [];
    }
}

// Função para salvar os IDs das conversas no arquivo JSON
function saveSubscribedChats(subscribedChats) {
    try {
        fs.writeFileSync(FILE_PATH_SUBSCRIBED, JSON.stringify(subscribedChats, null, 2), 'utf8');
    } catch (err) {
        logger.error(`Erro ao salvar no arquivo JSON: ${err.message}`);
    }
}

let subscribedChats = loadSubscribedChats();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Funções do bot
bot.start((ctx) => ctx.reply('Bem-vindo! Como posso ajudar você hoje?'));
bot.help((ctx) => ctx.reply('Envie-me um sticker'));

const servicesList = `
Aqui estão os serviços que posso oferecer:
1. Fazer inscrição de notificações.
2. Cancelar inscrição de notificações.

Basta digitar o número ou o nome do serviço que você está interessado!
`;

// Responde com a lista de serviços para qualquer mensagem recebida
bot.on('text', (ctx) => {
    const message = ctx.message.text.trim();
    const chatId = ctx.chat.id;

    if (message === '1') {
        if (!subscribedChats.includes(chatId)) {
            subscribedChats.push(chatId);
            saveSubscribedChats(subscribedChats); // Salva no arquivo JSON
            ctx.reply('Você foi inscrito com sucesso para receber notificações!');
        } else {
            ctx.reply('Você já está inscrito para receber notificações.');
        }
    } else if (message === '2') {
        subscribedChats = subscribedChats.filter(id => id !== chatId);
        saveSubscribedChats(subscribedChats); // Salva no arquivo JSON
        ctx.reply('Você foi removido da lista de notificações.');
    } else {
        ctx.reply(servicesList);
        logger.info(`Chat ${chatId} enviou uma mensagem não reconhecida: ${message}`);
    }
});

bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.launch();

//====================================================================================================
// ROTAS

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
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
    ensureCvsExists(filePathCsv);
    const results = [];
    try {
        fs.createReadStream(filePathCsv)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                res.json(results);
            })
            .on('error', (err) => {
                res.status(500).json({ error: err.message });
                logger.error(`Erro ao processar o CSV: ${err.message}`);
            });
    } catch (err) {
        res.status(500).send(err.message);
        logger.error(`Erro ao carregar os dados: ${err.message}`);
    }
});

//====================================================================================================

// Função para verificar se existem novas medalhas
async function checkForMedalUpdates() {
    try {
        const oldTally = getMedalData();
        await downloadAndSaveCsv();
        const newTally = getMedalData();

        const oldTallyMap = new Map(oldTally.map(item => [item.country, item]));

        for (const newMedals of newTally) {
            const oldMedals = oldTallyMap.get(newMedals.country) || { gold: 0, silver: 0, bronze: 0 };

            if (newMedals.gold > oldMedals.gold || newMedals.silver > oldMedals.silver || newMedals.bronze > oldMedals.bronze) {
                const message = `${newMedals.country} ganhou uma nova medalha!`;
                for (const chatId of subscribedChats) {
                    bot.telegram.sendMessage(chatId, message);
                }
                logger.info(message);
            }
        }
    } catch (err) {
        logger.error(`Erro ao atualizar o quadro de medalhas: ${err.message}`);
    }
}

// Função que garante que o arquivo CSV exista
function ensureCvsExists(filePathCsv) {
    // Verifica se o arquivo CSV existe, se não existir, cria um novo
    if (!fs.existsSync(filePathCsv)) {
        // Define o cabeçalho do arquivo CSV
        const header = 'posicao,country,gold,silver,bronze,total\n';
            
        // Cria um arquivo CSV com o cabeçalho
        fs.writeFileSync(filePathCsv, header, 'utf8');
        logger.info(`Arquivo CSV criado com cabeçalhos padrão: ${filePathCsv}`);
    }
}

// Função para carregar a quantidade de medalhas de cada país a partir do arquivo CSV
function getMedalData() {
    ensureCvsExists(filePathCsv);
    // Lê o arquivo CSV e retorna os dados
    try {
        const data = fs.readFileSync(filePathCsv, 'utf-8');
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
        logger.error(`Erro ao processar o arquivo CSV: ${err.message}`);
        throw new Error(`Erro ao processar o arquivo CSV: ${err.message}`);
    }
}

// Função para requisitar o download do arquivo CSV
async function downloadAndSaveCsv() {
    try {
        const response = await axios.get(process.env.CSV_URL || 'http://python-server-container:5000/download_csv', { responseType: 'stream' });

        const writer = fs.createWriteStream(filePathCsv);

        return new Promise((resolve, reject) => {
            response.data.pipe(writer);
            writer.on('finish', () => {
                resolve();
            });
            writer.on('error', (err) => {
                logger.error(`Erro ao salvar o arquivo: ${err.message}`);
                reject(err);
            });
        });
    } catch (err) {
        if (err.response) {
            logger.error(`Erro ao baixar o arquivo CSV: ${err.message}. Status Code: ${err.response.status}. URL: ${err.config.url}`);
        } else if (err.request) {
            logger.error(`Erro na requisição ao baixar o arquivo CSV: ${err.message}. Nenhuma resposta recebida.`);
        } else {
            logger.error(`Erro inesperado ao baixar o arquivo CSV: ${err.message}`);
        }
        throw new Error(`Erro ao baixar o arquivo CSV: ${err.message}`);
    }
}

setInterval(checkForMedalUpdates, 30000); // Verifica a cada 30 segundos

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
    logger.info(`Servidor rodando na porta ${port}`);
});
