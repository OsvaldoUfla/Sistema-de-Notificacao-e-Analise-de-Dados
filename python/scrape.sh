#!/bin/bash

# URL do site a ser raspado
URL="https://ge.globo.com/olimpiadas/"

# Nome do arquivo onde os dados serão salvos
OUTPUT_FILE="data.html"

# Usando curl para fazer o download do conteúdo da página
curl -s "$URL" -o "$OUTPUT_FILE"

echo "Scraping concluído. Dados salvos em $OUTPUT_FILE."
