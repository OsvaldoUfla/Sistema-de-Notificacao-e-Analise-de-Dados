const express = require('express');
const nodemailer = require('nodemailer'); 

const app2 = express();
const port = 3000;

app2.post('/send',(req, res) => {
    const { to, subject, text } = req.body; // Obter dados do corpo da requisição
    send(to, subject, text);
    return res.json({ message: 'Email enviado com sucesso!' })

})  

// Configurar o transportador do nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    }
});

// Função para enviar notificação por e-mail
async function send(to, subject, text) {
    try {
        transporter.sendMail({
            from: process.env.MAIL_FROM,
            to,
            subject,
            text
        })
        console.log('E-mail enviado:');
    } catch (error) {
        console.error('Erro ao enviar e-mail:');
    }
}

// Iniciar o servidor
app2.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
