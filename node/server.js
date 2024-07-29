// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Servir o formulário HTML
app.use(express.static('public'));

// Rota para receber os termos de busca e executar os scripts
app.post('/search', (req, res) => {
    const term1 = req.body.term1;
    const term2 = req.body.term2;

    // Enviar termos de busca para o contêiner do Python via HTTP
    const url = `http://python-container:5000/clean?term1=${term1}&term2=${term2}`;
    
    exec(`curl ${url}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erro: ${error.message}`);
            return res.status(500).send('Erro ao executar a busca.');
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).send('Erro ao executar a busca.');
        }
        console.log(`Stdout: ${stdout}`);
        res.send(`<pre>${stdout}</pre>`);
    });
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
