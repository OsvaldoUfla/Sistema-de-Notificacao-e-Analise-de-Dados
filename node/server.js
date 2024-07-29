// server.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rota para receber o formulário e enviar os parâmetros para o contêiner Python
app.post('/search', async (req, res) => {
    const { term1, term2 } = req.body;

    try {
        const response = await axios.get(`http://python-server:5000/clean`, {
            params: {
                term1,
                term2
            }
        });

        // Salvar o dataset em um arquivo e exibir
        const cleanedData = response.data;
        fs.writeFileSync(path.join(__dirname, 'public', 'cleaned_data.txt'), cleanedData);

        // Enviar os resultados para a página HTML
        res.send(`
            <h1>Buscar Medalhas</h1>
            <form action="/search" method="POST">
                <label for="term1">Termo 1:</label>
                <input type="text" id="term1" name="term1" required>
                <br>
                <label for="term2">Termo 2:</label>
                <input type="text" id="term2" name="term2" required>
                <br>
                <input type="submit" value="Buscar">
            </form>
            <hr>
            <h2>Resultados:</h2>
            <pre>${cleanedData}</pre>
        `);
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        res.status(500).send('Erro ao buscar dados.');
    }
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
