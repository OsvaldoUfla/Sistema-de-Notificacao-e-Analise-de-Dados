from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

@app.route('/clean', methods=['GET'])
def clean_data():
    term1 = request.args.get('term1')
    term2 = request.args.get('term2')

    if not term1 or not term2:
        return "Os parâmetros 'term1' e 'term2' são obrigatórios.", 400

    url = "https://ge.globo.com/olimpiadas/"

    try:
        response = requests.get(url)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')
        headlines = soup.find_all('h2')

        filtered_headlines = []
        for headline in headlines:
            text = headline.get_text()
            if text and term1 in text and term2 in text:
                filtered_headlines.append(text)

        # Enviar os resultados como texto
        return '\n'.join(filtered_headlines) or "Nenhuma nova medalha encontrada."

    except requests.RequestException as e:
        return f"Erro na requisição HTTP: {str(e)}", 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
