from flask import Flask, request, jsonify, send_file, Response
import subprocess
import csv
from bs4 import BeautifulSoup
import os
import logging

app = Flask(__name__)


# Configuração do logger
logging.basicConfig(filename='app.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Função responsável por executar o script de scraping
def run_scraping_script():
    try:
        subprocess.run('./scrape.sh', check=True)
    except subprocess.CalledProcessError as e:
        error_message = f"Erro ao executar o script Bash: {str(e)}"
        logging.error(error_message)


def extract_medal_data_from_file(file_path='data.html'):
    # Verifica se o arquivo existe
    if not os.path.exists(file_path):
        logging.error(f"Arquivo '{file_path}' não encontrado.")
    try:
        # Abre e lê o conteúdo do arquivo HTML
        with open(file_path, 'r', encoding='utf-8') as file:
            html_content = file.read()
    except Exception as e:
        error_message = f"Erro ao ler o arquivo HTML: {str(e)}"
        logging.error(error_message)
        return None, error_message

    # Usa BeautifulSoup para analisar o HTML
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Procura a tabela específica no HTML
    table = soup.find('table', {'aria-label': 'Quadro de medalhas Olimpíadas Paris 2024. Lista com 5 países.'})

    if table is None:
        logging.error("Tabela não encontrada no HTML.")
        return None, "Tabela não encontrada."

    medal_data = []
    rows = table.find_all('tr')

    for row in rows:
        cells = row.find_all('td')
        if len(cells) >= 6:
            medal_data.append({
                'Posicao': cells[0].get_text(strip=True),
                'Country': cells[1].get_text(strip=True),
                'Gold': cells[2].get_text(strip=True),
                'Silver': cells[3].get_text(strip=True),
                'Bronze': cells[4].get_text(strip=True),
                'Total': cells[5].get_text(strip=True)
            })

    if not medal_data:
        logging.error("Nenhum dado de medalha encontrado.")
        return None, "Nenhum dado de medalha encontrado."
    
    return medal_data

def save_to_csv(medal_data, csv_file_path='medal_data.csv'):
    try:
        # Abre o arquivo CSV para escrita
        with open(csv_file_path, 'w', newline='', encoding='utf-8') as file:
            # Define os campos (cabeçalhos) do CSV
            writer = csv.DictWriter(file, fieldnames=['Posicao', 'Country', 'Gold', 'Silver', 'Bronze', 'Total'])
            # Escreve o cabeçalho no CSV
            writer.writeheader()
            # Escreve os dados no CSV
            writer.writerows(medal_data)
        # Loga a mensagem de sucesso
        logging.info("Arquivo CSV criado com sucesso.")
    
    except Exception as e:
        # Captura e loga qualquer erro que ocorra
        error_message = f"Erro ao salvar o arquivo CSV: {str(e)}"
        logging.error(error_message)
        return error_message

    # Verifica se o arquivo foi criado corretamente
    if not os.path.exists(csv_file_path):
        error_message = "Arquivo CSV não encontrado após tentativa de criação."
        logging.error(error_message)
        return error_message


@app.route('/download_csv', methods=['GET'])
def download_csv():
    run_scraping_script()
    extraido = extract_medal_data_from_file()

    if extraido is None:
        logging.error("Extração de dados falhou.")
    else:
        # Verifica se 'extraido' é uma lista de dicionários antes de passar para 'save_to_csv'
        if isinstance(extraido, list) and all(isinstance(item, dict) for item in extraido):
            save_to_csv(extraido)
            logging.info("Extração e salvamento de dados bem-sucedidos.")
        else:
            logging.error("Os dados extraídos não estão no formato esperado. Esperado: lista de dicionários.")

    if not os.path.exists('medal_data.csv'):
        return Response("Arquivo CSV não encontrado.", status=404)
    else:
        return send_file('medal_data.csv', as_attachment=True)

if __name__ == '__main__':
    logging.info("Iniciando o servidor Flask...")
    app.run(host='0.0.0.0', port=5000)
    logging.info("Servidor Flask em execução.")
