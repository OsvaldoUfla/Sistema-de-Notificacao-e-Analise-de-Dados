const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Carregar variáveis de ambiente do arquivo .env
 
 oldTally = []
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
// Middleware para analisar o corpo da requisição como JSON
app.use(express.json());

//==============================================Rotas==============================================
// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
    downloadDados();
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
    downloadDados();
});

//==============================================================================================

// Configurar o transportador do nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT, 10), // A porta deve ser um número
    secure: process.env.MAIL_SECURE === 'false', // true para SSL, false para TLS
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    }
});

app.post('/send', async (req, res) => {
    const { to, subject, text } = req.body;
    console.log(req.body);
    console.log(to, subject, text);
    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM,
            to,
            subject,
            text,
        });
        return res.json({ message: 'Email enviado com sucesso!' });
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        return res.status(500).json({ message: 'Erro ao enviar e-mail!' });
    }
});

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

async function checkForMedalUpdates() {
    try {
        await downloadCsv(); // Baixar o arquivo CSV atualizado
        const newTally = await getMedalData(); // Obter dados atualizados do quadro de medalhas

        for (let country in newTally) {
            const newMedals = newTally[country];
            const oldMedals = oldTally[country] || { gold: 0, silver: 0, bronze: 0 };

            // Verifica se o país ganhou novas medalhas
            if (newMedals.gold > oldMedals.gold || newMedals.silver > oldMedals.silver || newMedals.bronze > oldMedals.bronze) {
                const message = ${newMedals.country} ganhou uma nova medalha!; // Mensagem de notificação
                console.log(${newMedals.country} ganhou uma nova medalha!);

                const events = await loadEvents(); // Carregar eventos do arquivo
                for (const event of events) {
                    send(event.notificationDetail, 'Nova Medalha!', message); // Enviar notificação para cada evento
                    console.log('Notificação enviada para:', event.notificationDetail);
                }
                oldTally = newMedals; // Atualizar o quadro de medalhas antigo
            }
        }
        
    } catch (err) {
        console.error('Erro ao atualizar o quadro de medalhas:', err);
    }
}

// Função que lê o arquivo CSV e retorna os dados do quadro de medalhas
async function getMedalData() {
    try {
        const data = fs.readFileSync(path.join('uploads', 'downloaded.csv'), 'utf-8');
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
        throw new Error(Erro ao processar o arquivo CSV: ${err.message});
    }
}

// Função para requisitar o download do arquivo CSV e processar os dados
function downloadDados(){
    try {
        // Fazer o download do CSV atualizado
        try {
            const response = axios.get('http://python-server:5000/download_csv', { responseType: 'stream' });
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
            throw new Error(Erro ao realizar o download do arquivo CSV: ${err.message});
        }

        // Verificar se houve atualização no quadro de medalhas
        checkForMedalUpdates();
    }
    catch (err) {
        console.error('Erro ao processar o arquivo CSV:', err);
    }
}

// Simular monitoramento de medalhas a cada 5 minutos
//setInterval(checkForMedalUpdates, 300000);
setInterval(downloadDados, 25000);


// Iniciar o servidor
app.listen(port, () => {
    console.log(Servidor rodando na porta ${port});
});