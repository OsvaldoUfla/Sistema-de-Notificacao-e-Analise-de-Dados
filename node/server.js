const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/upload', (req, res) => {
    const dataset = req.body.dataset;

    if (!dataset) {
        return res.status(400).send('Nenhum dataset fornecido.');
    }

    // Salvar o dataset em um arquivo
    fs.writeFile('received_data.txt', dataset, (err) => {
        if (err) {
            return res.status(500).send('Erro ao salvar o dataset.');
        }

        res.send('Dataset recebido e salvo com sucesso.');
    });
});

// Nova rota GET para visualizar o conteúdo do arquivo
app.get('/data', (req, res) => {
    fs.readFile('received_data.txt', 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Erro ao ler o dataset.');
        }

        res.send(data);
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
