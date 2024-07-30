#!/bin/bash

# URL do site a ser raspado
URL="https://ge.globo.com/olimpiadas/quadro-de-medalhas-olimpiadas-paris-2024/"

# Nome do arquivo onde os dados serão salvos
OUTPUT_FILE="data1.html"

# Usando curl para fazer o download do conteúdo da página
if curl -s "$URL" -o "$OUTPUT_FILE"; then
    echo "Scraping concluído. Dados salvos em $OUTPUT_FILE."
else
    echo "Erro ao realizar o scraping. Verifique a URL e tente novamente."
    exit 1
fi
