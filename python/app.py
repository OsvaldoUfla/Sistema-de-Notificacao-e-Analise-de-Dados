from flask import Flask, request, jsonify, send_file, make_response
import subprocess
import csv
from bs4 import BeautifulSoup
import os

app = Flask(__name__)

# http://python-server:5000/scrape
# Rota para realizar o scraping dos dados
@app.route('/scrape', methods=['GET'])
def scrape_data():
    # Executar o script Bash para fazer o download dos dados
    try:
        subprocess.run(['./scrape.sh'], check=True)
    except subprocess.CalledProcessError as e:
        return f"Erro ao executar o script Bash: {str(e)}", 500

    # Extraia e salve os dados
    try:
        medal_data = extract_medal_data()
        if not medal_data:
            return "Nenhum dado encontrado.", 404
        else:
            save_medal_data(medal_data)
            response = make_response("csv Salvo!", 200)  
            return  response
    except Exception as e:
        return f"Erro ao processar os dados: {str(e)}", 500



# http://python-server:5000/download_csv
# Rota para download do arquivo CSV    
@app.route('/download_csv', methods=['GET'])    
def download_csv():
    # Verificar se o arquivo CSV existe
    if not os.path.exists('medal_data.csv'):
        return "Arquivo CSV não encontrado.", 404

    # Enviar o arquivo CSV
    return send_file('medal_data.csv', as_attachment=True)

# função para salvar os dados em um arquivo CSV
def save_medal_data(medal_data):
    # Salvar os dados em um arquivo CSV
    try:
        with open('medal_data.csv', 'w', newline='', encoding='utf-8') as file:
            writer = csv.DictWriter(file, fieldnames=['Posicao', 'Country', 'Gold', 'Silver', 'Bronze', 'Total'])
            writer.writeheader()
            writer.writerows(medal_data)
    except Exception as e:
        raise RuntimeError(f"Erro ao salvar o arquivo CSV: {str(e)}")

# função para extrair os dados da tabela HTML
def extract_medal_data():
    # Inicialize medal_data para garantir que ela sempre tenha um valor
    medal_data = []

    # Abrir e ler o conteúdo do arquivo HTML
    try:
        with open('data.html', 'r', encoding='utf-8') as file:
            html_content = file.read()
    except FileNotFoundError:
        print("Arquivo 'data.html' não encontrado.")
        return medal_data

    # Parse o HTML com BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')

    # Encontre a tabela
    table = soup.find('table', {'aria-label': 'Quadro de medalhas Olimpíadas Paris 2024. Lista com 5 países.'})

    # Verifique se a tabela foi encontrada
    if table is None:
        print("Tabela não encontrada.")
        return medal_data

    # Extraia as linhas da tabela
    rows = table.find_all('tr')

    # Itere sobre as linhas e extraia dados
    for row in rows:
        # Verifique se a linha possui os dados esperados
        cells = row.find_all('td')
        if len(cells) >= 6:
            country_Pos = cells[0].get_text(strip=True)
            country_name = cells[1].get_text(strip=True)
            gold_medals = cells[2].get_text(strip=True)
            silver_medals = cells[3].get_text(strip=True)
            bronze_medals = cells[4].get_text(strip=True)
            total_medals = cells[5].get_text(strip=True)
            
            medal_data.append({
                'Posicao': country_Pos,
                'Country': country_name,
                'Gold': gold_medals,
                'Silver': silver_medals,
                'Bronze': bronze_medals,
                'Total': total_medals
            })
    
    return medal_data

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
