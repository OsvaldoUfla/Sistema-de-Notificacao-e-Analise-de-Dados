const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Rota para a página de notificação
app.get('/notify', (req, res) => {  
    res.sendFile(path.join(__dirname, 'public/notify.html'));
});

// Simulação de banco de dados
let events = [];

// Endpoint para cadastro de eventos
app.post('/api/events', (req, res) => {
    const { countries, medalTypes, notificationType, notificationDetail } = req.body;
    countries.forEach(country => {
        medalTypes.forEach(medalType => {
            const newEvent = { country, medalType, notificationType, notificationDetail };
            events.push(newEvent);
        });
    });
    res.status(201).send('Evento cadastrado com sucesso!');
});

// Função para enviar notificação via Telegram
async function sendTelegramNotification(chatId, message) {
    const botToken = 'YOUR_TELEGRAM_BOT_TOKEN';
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await axios.post(url, {
        chat_id: chatId,
        text: message
    });
}

// Função para enviar notificação por email (exemplo básico)
async function sendEmailNotification(email, message) {
    // Integrar com serviço de envio de email (como nodemailer)
    console.log(`Enviando email para ${email}: ${message}`);
}

// Função para monitorar eventos e enviar notificações
function checkForMedalUpdates() {
    // Implementar lógica para verificar atualizações no quadro de medalhas
    // Para cada atualização, verificar eventos e enviar notificações correspondentes
    events.forEach(async event => {
        // Lógica para verificar se o evento ocorreu
        const message = `O país ${event.country} ganhou mais uma medalha de ${event.medalType}!`;
        if (event.notificationType === 'telegram') {
            await sendTelegramNotification(event.notificationDetail, message);
        } else if (event.notificationType === 'email') {
            await sendEmailNotification(event.notificationDetail, message);
        }
    });
}

// Simular monitoramento de medalhas a cada 5 minutos
setInterval(checkForMedalUpdates, 300000);

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
    scrape(); // Realizar o scrape dos dados
    const csvUrl = 'http://python-server:5000/download_csv'; // URL para o CSV

    try {
        // Fazer o download do arquivo CSV
        const response = await axios.get(csvUrl, { responseType: 'stream' });
        const filePath = path.join(__dirname, 'uploads', 'downloaded.csv');
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
        res.status(500).send('Erro ao baixar o arquivo CSV.');
    }
});

// Função para realizar o scrape
function scrape(){
    try {
        const res = axios.get('http://python-server:5000/scrape');
        return res;
    } catch (error) {
        return error;
    }
}

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
