# Dockerfile para o servidor Node.js
FROM node:lts

# Instalar dependências necessárias para o canvas
RUN apt-get update && apt-get install -y \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    build-essential

# Criar diretório de trabalho
WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./

# Instala as dependências do projeto
RUN npm install

# Expor a porta em que o servidor estará ouvindo
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["npm", "start"]
