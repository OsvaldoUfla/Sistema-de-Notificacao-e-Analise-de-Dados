const express = require('express')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const expressJson = require('express').json
const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
const csv = require('csv-parser')
require('dotenv').config()




const app = express()
const port = 3000

const filePath = path.join(__dirname, 'uploads', 'downloaded.csv')// Caminho para o arquivo CSV que contém os dados das medalhas



app.use(express.static(path.join(__dirname, 'public')));
app.use(expressJson())

//====================================================================================================
// BOT TELEGRAM

const bot = new Telegraf(process.env.BOT_TOKEN)

const FILE_PATH_SUBSCRIBED = './subscribedChats.json'; // Caminho para o arquivo JSON que armazena os chats inscritos

// Função para verificar e criar o arquivo JSON se não existir
function ensureFileExists() {
    if (!fs.existsSync(FILE_PATH_SUBSCRIBED)) {
        fs.writeFileSync(FILE_PATH_SUBSCRIBED, JSON.stringify([], null, 2), 'utf8');
    }
}

// Função para carregar os IDs das conversas do arquivo JSON
function loadSubscribedChats() {
    try {
        ensureFileExists(); // Garante que o arquivo exista
        const data = fs.readFileSync(FILE_PATH_SUBSCRIBED, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Erro ao carregar o arquivo JSON:', err);
        return [];
    }
}

// Função para salvar os IDs das conversas no arquivo JSON
function saveSubscribedChats(subscribedChats) {
    try {
        fs.writeFileSync(FILE_PATH_SUBSCRIBED, JSON.stringify(subscribedChats, null, 2), 'utf8');
    } catch (err) {
        console.error('Erro ao salvar no arquivo JSON:', err);
    }
}

let subscribedChats = loadSubscribedChats();

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
    }
});

bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.launch();

//====================================================================================================
// ROTAS

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'))
    console.log('Quadro de medalhas atualizado!');
});

app.get('/notify', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/notify.html'))
});

app.post('/api/events', async (req, res) => {
    const { notificationDetail } = req.body
    const events = loadEvents()
    const newEvent = { notificationType: 'telegram', notificationDetail }
    events.push(newEvent)
    saveEvents(events)
    res.status(201).send('Evento cadastrado com sucesso!')
});

app.get('/data', async (req, res) => {
    const results = [];
    try {
        fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          res.json(results)
        })
        .on('error', (err) => {
          res.status(500).json({ error: err.message })
        })
    } catch (err) {
        res.status(500).send(err.message)
    }
});

//====================================================================================================

// Função para verificar se existte novas medalhas
async function checkForMedalUpdates() {
    try {
        const oldTally = getMedalData()
        await downloadAndSaveCsv();
        const newTally = getMedalData()

        for (const country of newTally) { 
            const newMedals = country
            const oldMedals = oldTally.find(item => item.country === newMedals.country) || { gold: 0, silver: 0, bronze: 0 }

            if (newMedals.gold > oldMedals.gold || newMedals.silver > oldMedals.silver || newMedals.bronze > oldMedals.bronze) {
                const message = `${newMedals.country} ganhou uma nova medalha!`;
                const events = loadSubscribedChats()
                for (const event of events) {
                    bot.telegram.sendMessage(event, message)
                }
                oldTally[newMedals.country] = newMedals
            }
        }
    } catch (err) {
        console.error('Erro ao atualizar o quadro de medalhas:', err)
    }
}

// Função para carregar a quantidade de medalhas de cada país a partir do arquivo CSV
function getMedalData() {
    try {
        const data = fs.readFileSync(filePath, 'utf-8')
        const lines = data.split('\n').slice(1)
        return lines.map(line => {
            const [posicao, country, gold, silver, bronze, total] = line.split(',')
            return { 
                country, 
                gold: parseInt(gold) || 0,
                silver: parseInt(silver) || 0,
                bronze: parseInt(bronze) || 0,
                total: parseInt(total) || 0
            };
        }).filter(d => d.country)
    } catch (err) {
        throw new Error(`Erro ao processar o arquivo CSV: ${err.message}`)
    }
}

// Função para requisitar o download do arquivo CSV
async function downloadAndSaveCsv() {
    try {
        //const response = await axios.get('http://python-server-container:5000/download_csv', { responseType: 'stream' })
        const response = await axios.get('http://0.0.0.0:5000/download_csv', { responseType: 'stream' })

        const writer = fs.createWriteStream(filePath)

        return new Promise((resolve, reject) => {
            response.data.pipe(writer)
            writer.on('finish', () => {
                console.log('Arquivo CSV salvo com sucesso!')
                resolve()
            });
            writer.on('error', (err) => {
                console.error('Erro ao salvar o arquivo:', err)
                reject(err)
            });
        });
    } catch (err) {
        console.error(`Erro ao baixar o arquivo CSV: ${err.message}`)
        throw new Error(`Erro ao baixar o arquivo CSV: ${err.message}`)
    }
}


setInterval(checkForMedalUpdates, 30000);    // Verifica a cada 30 segundos

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`)
})
