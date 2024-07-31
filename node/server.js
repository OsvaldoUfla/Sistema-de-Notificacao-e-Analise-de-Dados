const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
//const send = require('./services/nodemailer');
 

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Caminho do arquivo JSON para armazenar eventos
const eventsFilePath = path.join(__dirname, 'events.json');

// Função para carregar eventos do arquivo JSON
function loadEvents() {
    if (fs.existsSync(eventsFilePath)) {
        const data = fs.readFileSync(eventsFilePath, 'utf-8');
        return JSON.parse(data);
    }
    return [];
}

// Função para salvar eventos no arquivo JSON
function saveEvents(events) {
    fs.writeFileSync(eventsFilePath, JSON.stringify(events, null, 2), 'utf-8');
}

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Rota para a página de notificação
app.get('/notify', (req, res) => {  
    res.sendFile(path.join(__dirname, 'public/notify.html'));
});

// Endpoint para cadastro de eventos
app.post('/api/events', (req, res) => {
    const { notificationType, notificationDetail } = req.body;
    const events = loadEvents(); // Carregar eventos do arquivo
    const newEvent = { notificationType, notificationDetail };
    events.push(newEvent);
    saveEvents(events); // Salvar eventos atualizados no arquivo
    res.status(201).send('Evento cadastrado com sucesso!');
});


async function getMedalData() { 
    const tally = processCsv(path.join('uploads', 'downloaded.csv'));
    return tally;
}

async function checkForMedalUpdates() {
    try {
        const oldTally = await getMedalData(); // Obter dados antigos do quadro de medalhas
        // Realizar o scrape dos dados
        await scrape();
        await downloadCsv(); // Baixar o arquivo CSV atualizado
        const newTally = await getMedalData(); // Obter dados atualizados do quadro de medalhas

        for (let country in newTally) {
            const newMedals = newTally[country];
            const oldMedals = oldTally[country] || { gold: 0, silver: 0, bronze: 0 };

            // Verifica se o país ganhou novas medalhas
            if (newMedals.gold > oldMedals.gold || newMedals.silver > oldMedals.silver || newMedals.bronze > oldMedals.bronze) {
                const message = `${newMedals.country} ganhou uma nova medalha!`; // Mensagem de notificação
                console.log(`${newMedals.country} ganhou uma nova medalha!`);

                const events = await loadEvents(); // Carregar eventos do arquivo
                for (const event of events) {
                    send(event.notificationDetail, 'Nova Medalha!', message); // Enviar notificação para cada evento
                }
            }
        }
        
    } catch (err) {
        console.error('Erro ao atualizar o quadro de medalhas:', err);
    }
}

// Função para processar o arquivo CSV e enviar os dados para o cliente
async function processCsv(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        const lines = data.split('\n').slice(1);
        const result = lines.map(line => {
            const [posicao, country, gold, silver, bronze, total] = line.split(',');
            return { 
                country, 
                gold: parseInt(gold) || 0,
                silver: parseInt(silver) || 0,
                bronze: parseInt(bronze) || 0,
                total: parseInt(total) || 0
            };
        }).filter(d => d.country);
        return result;
    } catch (err) {
        throw new Error(`Erro ao processar o arquivo CSV: ${err.message}`);
    }
}

// Rota para baixar o arquivo CSV do servidor Python e enviar os dados
app.get('/data', async (req, res) => {
    try {
        await scrape(); // Realizar o scrape dos dados
        // Verificar se houve atualização no quadro de medalhas
        await checkForMedalUpdates();

        // Fazer o download do CSV atualizado
        const csvUrl = 'http://python-server:5000/download_csv'; // URL do servidor Python para o CSV
        const response = await axios.get(csvUrl, { responseType: 'stream' });
        const filePath = path.join('uploads', 'downloaded.csv');
        const writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);

        writer.on('finish', async () => {
            try {
                const csvData = await processCsv(filePath);
                res.json(csvData); // Enviar dados para o cliente
            } catch (err) {
                res.status(500).send(err.message);
            }
        });

        writer.on('error', (err) => {
            res.status(500).send(`Erro ao salvar o arquivo CSV: ${err.message}`);
        });
    } catch (error) {
        res.status(500).send(`Erro ao baixar o arquivo CSV: ${error.message}`);
    }
});

// Função para realizar o download do arquivo CSV
async function downloadCsv() {
    try {
        const response = await axios.get('http://python-server:5000/download_csv', { responseType: 'stream' });
        const filePath = path.join(__dirname, 'uploads', 'downloaded.csv');
        const writer = fs.createWriteStream(filePath);

        return new Promise((resolve, reject) => {
            response.data.pipe(writer);
            writer.on('finish', () => {
                console.log('CSV baixado e salvo em:', filePath);
                resolve(); // Resolva a Promise quando a escrita estiver concluída
            });
            writer.on('error', (err) => {
                console.error('Erro ao salvar o arquivo CSV:', err);
                reject(err);   // Rejeite a Promise em caso de erro
            });
        });
    } catch (err) {
        throw new Error(`Erro ao realizar o download do arquivo CSV: ${err.message}`);
    }
}

// Função para realizar o scrape
function scrape(){
    try {
        const res = axios.get('http://python-server:5000/scrape');
        return res;
    } catch (error) {
        return error;
    }
}

// Simular monitoramento de medalhas a cada 5 minutos
//setInterval(checkForMedalUpdates, 300000);
setInterval(checkForMedalUpdates, 25000);


// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
