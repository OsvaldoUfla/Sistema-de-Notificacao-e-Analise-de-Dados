# Dockerfile para o servidor Python
FROM ubuntu:20.04

# Atualizar pacotes e instalar dependências
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl

# Instalar BeautifulSoup e outras dependências
RUN pip3 install requests beautifulsoup4 flask make_response

# Criar diretório de trabalho
WORKDIR /app

# Expor a porta em que o servidor estará ouvindo
EXPOSE 5000

# Comando para iniciar o servidor
CMD ["python3", "app.py"]
