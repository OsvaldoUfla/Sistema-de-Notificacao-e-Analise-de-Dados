from flask import Flask, request, jsonify
import os
from bs4 import BeautifulSoup
import requests

app = Flask(__name__)

@app.route('/clean', methods=['GET'])
def clean_data():
    term1 = request.args.get('term1')
    term2 = request.args.get('term2')

    # URL do site de notícias
    url = "https://ge.globo.com/olimpiadas/"

    # Fazer a requisição HTTP para obter o conteúdo da página
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')

    # Extrair manchetes que mencionam os termos de busca
    headlines = soup.find_all('h2')  # Ajuste o seletor conforme necessário
    new_medals = []

    for headline in headlines:
        text = headline.get_text()
        if term1 in text and term2 in text:
            new_medals.append(text)

    # Exibir as manchetes encontradas
    if new_medals:
        return jsonify({"new_medals": new_medals})
    else:
        return jsonify({"message": "Nenhuma nova noticia encontrada."})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
