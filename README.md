# Estudo Dirigido: Sistema de Notificação e Análise de Dados

Este repositório contém o material e código-fonte do trabalho desenvolvido durante a disciplina de GCC129 - Sistemas Distribuídos na Universidade Federal de Lavras (UFLA).

## Conteúdo

- **Código-Fonte:** Implementação do projeto em [linguagem de programação utilizada].
- **Instruções de Execução:** Passos para configurar e executar o projeto.

## Objetivos do Projeto

Este projeto envolve o desenvolvimento de um sistema de notificação e análise de dados, incluindo scraping de dados, limpeza de dados, visualização de gráficos e envio de notificações.

## Funcionalidades

- **Scrape usando Bash**: Scripts para download de dados.
- **Data cleaning usando Python**: Limpeza de dados com scripts Python.
- **Envio de dataset para servidor Node**: Criação e envio de dataset para o servidor.
- **Exibição de gráficos no servidor Node**: Visualização de gráficos gerados a partir dos dados.
- **Envio de notificações para eventos cadastrados**: Sistema de notificações via email, SMS ou Telegram.


## Com docker-compose

#### Abra o terminal na pasta raiz do projeto.  
#### Construa e inicie os contêineres usando o Docker Compose com o comando:  
   
    docker-compose up --build  
    
    O parâmetro --build garante que as imagens sejam reconstruídas com base nas mudanças feitas nos Dockerfile e no conteúdo dos diretórios node e python.   

#### Verifique se os contêineres estão rodando com o comando:

    docker-compose ps

    Você deve ver uma lista de contêineres em execução e suas portas mapeadas.


#### Parar e remover os contêineres, você pode usar:

    docker-compose down

    Este comando também remove as redes criadas pelo Docker Compose.
   
    
     
## Sem docker-compose

Primeiro, você precisa construir as imagens Docker para cada serviço.

### Para o node-server:
#### Abra o terminal na pasta raiz do projeto. 

    docker build -t node-server-image -f ./node/Dockerfile ./node

### Para o python-server:

    docker build -t python-server-image -f ./python/Dockerfile ./python

### Executando os Contêineres

Após construir as imagens, você pode executar os contêineres. Como o python-server é uma dependência do node-server, você deve iniciar o contêiner do python-server primeiro.

### Para o python-server:

    docker run -d --name python-server-container -p 5000:5000 -v $(pwd)/python:/app python-server-image

    -d: Inicia o contêiner em modo "desanexado" (em segundo plano).
    --name: Dá um nome ao contêiner para facilitar a referência.
    -p 5000:5000: Mapeia a porta 5000 do contêiner para a porta 5000 do host.
    -v $(pwd)/python:/app: Monta o diretório local ./python no diretório /app do contêiner.

### Para o node-server:

    docker run -d --name node-server-container --link python-server-container:python-server -p 3000:3000 -v $(pwd)/node:/app -v /app/node_modules node-server-image

    --link python-server-container:python-server: Conecta o contêiner node-server ao python-server usando um link, permitindo que o node-server se comunique com o python-server via o nome de host python-server.
    -v /app/node_modules: Monta o diretório /app/node_modules dentro do contêiner para persistir as dependências.

### Observações

    Certifique-se de ajustar os volumes e portas conforme necessário.
    O comando docker run tem várias opções adicionais, como definir variáveis de ambiente (-e) ou trabalhar com redes específicas (--network).

## Como Usar Este Repositório

1. **Clone o repositório:**
    ```bash
    git clone https://github.com/OsvaldoUfla/Trabalho---Sistemas-Distribuidos-UFLA.git
    ```
2. **Navegue pelos diretórios** para encontrar o material do projeto.
3. **Siga as instruções** no arquivo `README.md` para configurar e executar o projeto.

## Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues para discutir ideias, relatar problemas ou fazer perguntas. Pull requests com melhorias, correções ou novos conteúdos também são encorajadas.

## Licença

Este projeto está licenciado sob a Licença MIT. Consulte o arquivo [LICENSE](LICENSE) para obter mais informações.
