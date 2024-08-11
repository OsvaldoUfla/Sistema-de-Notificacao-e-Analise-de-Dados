#!/bin/bash

# Usando curl para fazer o download do conteúdo da página
response=$(curl -sL -w "%{http_code}" -A "Mozilla/5.0" "https://ge.globo.com/olimpiadas/quadro-de-medalhas-olimpiadas-paris-2024/" -o data.html)

# Extrai o código de status HTTP da resposta
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" -eq 200 ]; then
    echo "Scraping concluído. Dados salvos em data.html. Código HTTP: $http_code"
else
    echo "Erro ao realizar o scraping. Código HTTP: $http_code. Verifique a URL e tente novamente."
    exit 1
fi
