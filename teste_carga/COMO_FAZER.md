# Testes de Carga - ChaosWar

Este diretório contém scripts Artillery para simular jogadores conectando e realizando ações no servidor multiplayer do ChaosWar.

## Pré-requisitos
- Node.js instalado
- Artillery instalado globalmente:
  ```
  npm install -g artillery
  ```
- Servidor do jogo rodando (ex: `node index.js` na pasta `server`)

## Como usar os testes

1. Abra o terminal na pasta `teste`:
   ```
   cd teste
   ```

2. Execute o teste desejado:
   - **Teste para 1200 jogadores:**
     ```
     artillery run test-1200.yml -o resultado-1200.json
     ```
   - **Teste para 5000 jogadores:**
     ```
     artillery run test-5000.yml -o resultado-5000.json
     ```

3. Analise o resultado:
   - O Artillery mostrará no terminal o resumo de performance (conexões, mensagens, erros, etc).
   - Para gerar um relatório visual (HTML):
     ```
     artillery report resultado-1200.json
     artillery report resultado-5000.json
     ```

## O que cada teste faz
- **test-1200.yml:** Simula até 1200 jogadores conectando, movimentando e enviando mensagens.
- **test-5000.yml:** Simula até 5000 jogadores simultâneos, com ações de movimento e chat.

## Dicas
- Sempre inicie o servidor antes do teste.
- Monitore o uso de CPU e memória durante o teste.
- Ajuste os parâmetros dos arquivos `.yml` para testar outros cenários.

---

Qualquer dúvida ou para criar novos cenários, edite os arquivos `.yml` ou peça ajuda!
