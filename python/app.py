from flask import Flask, request, jsonify
import subprocess
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

@app.route('/clean', methods=['GET'])
def clean_data():
    term1 = request.args.get('term1')
    term2 = request.args.get('term2')

    if not term1 or not term2:
        return "Os parâmetros 'term1' e 'term2' são obrigatórios.", 400

    # Executar o script Bash para fazer o download dos dados
    try:
        subprocess.run(['./scrape.sh'], check=True)
    except subprocess.CalledProcessError as e:
        return f"Erro ao executar o script Bash: {str(e)}", 500

    # Realizar data cleaning no arquivo baixado
    try:
        with open('data.html', 'r', encoding='utf-8') as file:
            content = file.read()

        soup = BeautifulSoup(content, 'html.parser')
        headlines = soup.find_all('h2')

        filtered_headlines = []
        for headline in headlines:
            text = headline.get_text()
            if text and term1 in text and term2 in text:
                filtered_headlines.append(text)

        # Salvar os resultados em um arquivo
        with open('cleaned_data.txt', 'w', encoding='utf-8') as file:
            for line in filtered_headlines:
                file.write(f"{line}\n")

        # Enviar o dataset para o servidor Node.js
        with open('cleaned_data.txt', 'r', encoding='utf-8') as file:
            dataset = file.read()

        node_server_url = 'http://node-server:3000/upload'  # Ajuste o URL conforme necessário
        response = requests.post(node_server_url, data={'dataset': dataset})

        if response.status_code == 200:
            return 'Data cleaning concluído e dados enviados para o servidor Node.js.', 200
        else:
            return f"Erro ao enviar dados para o servidor Node.js: {response.text}", 500

    except Exception as e:
        return f"Erro durante o processamento: {str(e)}", 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
