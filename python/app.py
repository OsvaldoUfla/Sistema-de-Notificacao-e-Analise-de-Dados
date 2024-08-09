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
def run_scraping_script(script_path='./scrape.sh'):
    try:
        subprocess.run([script_path], check=True)
        logging.info("Scraping concluído com sucesso.")
    except subprocess.CalledProcessError as e:
        error_message = f"Erro ao executar o script Bash: {str(e)}"
        logging.error(error_message)
        return error_message

# Função para ler o conteúdo HTML do arquivo gerado pelo scraping
def read_html_file(file_path='data.html'):
    if not os.path.exists(file_path):
        logging.error(f"Arquivo '{file_path}' não encontrado.")
        return None, "Arquivo HTML não encontrado."
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read(), None
    except Exception as e:
        error_message = f"Erro ao ler o arquivo HTML: {str(e)}"
        logging.error(error_message)
        return None, error_message

# Função para extrair dados da tabela no HTML usando BeautifulSoup
def extract_medal_data(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
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
    
    return medal_data, None

# Função para salvar os dados extraídos em um arquivo CSV
def save_to_csv(medal_data, csv_file_path='medal_data.csv'):
    try:
        with open(csv_file_path, 'w', newline='', encoding='utf-8') as file:
            writer = csv.DictWriter(file, fieldnames=['Posicao', 'Country', 'Gold', 'Silver', 'Bronze', 'Total'])
            writer.writeheader()
            writer.writerows(medal_data)
        logging.info("Arquivo CSV criado com sucesso.")
    except Exception as e:
        error_message = f"Erro ao salvar o arquivo CSV: {str(e)}"
        logging.error(error_message)
        return error_message
    
    if not os.path.exists(csv_file_path):
        logging.error("Arquivo CSV não encontrado após tentativa de criação.")
        return "Arquivo CSV não encontrado."

    return None

@app.route('/download_csv', methods=['GET'])
def download_csv():
    # Executa o script de scraping
    script_error = run_scraping_script()
    if script_error:
        return Response(script_error, status=500)

    # Lê o conteúdo do arquivo HTML
    html_content, html_error = read_html_file()
    if html_error:
        return Response(html_error, status=404)

    # Extrai os dados de medalhas
    medal_data, extract_error = extract_medal_data(html_content)
    if extract_error:
        return Response(extract_error, status=404)

    # Salva os dados em um arquivo CSV
    csv_error = save_to_csv(medal_data)
    if csv_error:
        return Response(csv_error, status=500)

    # Retorna o arquivo CSV para download
    return send_file('medal_data.csv', as_attachment=True)

if __name__ == '__main__':
    logging.info("Iniciando o servidor Flask...")
    app.run(host='0.0.0.0', port=5000)
    logging.info("Servidor Flask em execução.")
