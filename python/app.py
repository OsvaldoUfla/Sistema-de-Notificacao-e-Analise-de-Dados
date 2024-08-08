from flask import Flask, request, jsonify, send_file
import subprocess
import csv
from bs4 import BeautifulSoup
import os

app = Flask(__name__)

# Rota para download do arquivo CSV    
@app.route('/download_csv', methods=['GET'])    
def scrape_data():
    # Executar o script Bash para fazer o download dos dados
    try:
        subprocess.run(['./scrape.sh'], check=True)
    except subprocess.CalledProcessError as e:
        return f"Erro ao executar o script Bash: {str(e)}", 500
        print(f"Erro ao executar o script Bash: {str(e)}")  

    # Verificar se o arquivo HTML existe
    if not os.path.exists('data.html'):
        return "Arquivo 'data.html' não encontrado.", 404
        print("Arquivo 'data.html' não encontrado.")

    # Abrir e ler o conteúdo do arquivo HTML
    try:
        with open('data.html', 'r', encoding='utf-8') as file:
            html_content = file.read()
    except Exception as e:
        return f"Erro ao ler o arquivo HTML: {str(e)}", 500
        print(f"Erro ao ler o arquivo HTML: {str(e)}")

    # Parse o HTML com BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')

    # Encontre a tabela
    table = soup.find('table', {'aria-label': 'Quadro de medalhas Olimpíadas Paris 2024. Lista com 5 países.'})

    # Verifique se a tabela foi encontrada
    if table is None:
        return "Tabela não encontrada.", 404
        print("Tabela não encontrada.")

    medal_data = [] # Inicialize medal_data

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

    # Verifique se medal_data foi preenchido
    if not medal_data:
        return "Nenhum dado de medalha encontrado.", 404
        print("Nenhum dado de medalha encontrado.")

    # Salvar os dados em um arquivo CSV
    try:
        with open('medal_data.csv', 'w', newline='', encoding='utf-8') as file:
            writer = csv.DictWriter(file, fieldnames=['Posicao', 'Country', 'Gold', 'Silver', 'Bronze', 'Total'])
            writer.writeheader()
            writer.writerows(medal_data)
    except Exception as e:
        return f"Erro ao salvar o arquivo CSV: {str(e)}", 500
        print(f"Erro ao salvar o arquivo CSV: {str(e)}")

    # Verificar se o arquivo CSV foi criado corretamente
    if not os.path.exists('medal_data.csv'):
        return "Arquivo CSV não encontrado.", 404
        print("Arquivo CSV não encontrado.")

    # Enviar o arquivo CSV
    return send_file('medal_data.csv', as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
