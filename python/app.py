from flask import Flask, request, jsonify, send_file, Response
import subprocess
import csv
from bs4 import BeautifulSoup
import os
import time

app = Flask(__name__)

def scrape_data():
    try:
        subprocess.run(['./scrape.sh'], check=True)
        print("Scraping concluído com sucesso.")
    except subprocess.CalledProcessError as e:
        print(f"Erro ao executar o script Bash: {str(e)}")
        return Response(f"Erro ao executar o script Bash: {str(e)}", status=500)

@app.route('/download_csv', methods=['GET'])    
def download_csv():
    scrape_data()  # Chama a função scrape_data

    # Verifica se o arquivo HTML foi gerado
    if not os.path.exists('data.html'):
        print("Arquivo 'data.html' não encontrado após scraping.")
        return Response("Arquivo 'data.html' não encontrado.", status=404)

    try:
        with open('data.html', 'r', encoding='utf-8') as file:
            html_content = file.read()
    except Exception as e:
        print(f"Erro ao ler o arquivo HTML: {str(e)}")
        return Response(f"Erro ao ler o arquivo HTML: {str(e)}", status=500)

    soup = BeautifulSoup(html_content, 'html.parser')
    table = soup.find('table', {'aria-label': 'Quadro de medalhas Olimpíadas Paris 2024. Lista com 5 países.'})

    if table is None:
        print("Tabela não encontrada no HTML.")
        return Response("Tabela não encontrada.", status=404)

    medal_data = []
    rows = table.find_all('tr')

    for row in rows:
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

    if not medal_data:
        print("Nenhum dado de medalha encontrado.")
        return Response("Nenhum dado de medalha encontrado.", status=404)

    try:
        with open('medal_data.csv', 'w', newline='', encoding='utf-8') as file:
            writer = csv.DictWriter(file, fieldnames=['Posicao', 'Country', 'Gold', 'Silver', 'Bronze', 'Total'])
            writer.writeheader()
            writer.writerows(medal_data)
        print("Arquivo CSV criado com sucesso.")
    except Exception as e:
        print(f"Erro ao salvar o arquivo CSV: {str(e)}")
        return Response(f"Erro ao salvar o arquivo CSV: {str(e)}", status=500)

    if not os.path.exists('medal_data.csv'):
        print("Arquivo CSV não encontrado.")
        return Response("Arquivo CSV não encontrado.", status=404)

    return send_file('medal_data.csv', as_attachment=True)

if __name__ == '__main__':
    # Verifica se o servidor está rodando
    print("Iniciando o servidor Flask...")
    app.run(host='0.0.0.0', port=5000)
    print("Servidor Flask em execução.")
