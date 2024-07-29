# Dockerfile para o servidor Node.js
FROM node:14

# Criar diretório de trabalho
WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm install

# Expor a porta em que o servidor estará ouvindo
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["npm", "start"]
