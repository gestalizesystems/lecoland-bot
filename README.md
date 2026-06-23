# Lecoland — Bot de triagem do WhatsApp 🐾

Bot de atendimento para pet shop / clínica veterinária. Ele:

- Conecta ao WhatsApp por **QR code** (via [whatsapp-web.js](https://wwebjs.dev/)).
- Faz **triagem por palavra-chave**: reconhece intenções como *banho*, *veterinário*, *vacina*, *horário*, *endereço*, *pagamento* e responde na hora com respostas prontas.
- Responde **perguntas livres** com a IA **gratuita** do **Google Gemini** (`gemini-2.5-flash`), ancorada nos dados do negócio — sem inventar preço, horário ou serviço.
- Faz **handoff para humano**: quando o cliente digita *atendente*, o bot se cala para aquele contato por 1 hora.
- Tem um **painel de administração no navegador**: edite saudação, serviços, palavras-chave, preços e taxas de entrega por formulários — sem mexer em código. As mudanças valem na hora.

## Requisitos

- **Node.js 18 ou superior** (as libs atuais do WhatsApp/Gemini pedem Node 18+).
  Seu ambiente está no Node 16 — instale o 18 com [nvm](https://github.com/nvm-sh/nvm): `nvm install 18 && nvm use 18`.
- Uma **chave da API do Google Gemini** — **gratuita** e sem cartão: https://aistudio.google.com/apikey
- Um número de WhatsApp para o bot (de preferência dedicado).

## Como rodar

```bash
# 1. Instale as dependências
npm install

# 2. Configure a chave da API (gratuita)
cp .env.example .env
#   edite .env e cole sua GEMINI_API_KEY (https://aistudio.google.com/apikey)

# 3. (opcional) Teste a triagem sem WhatsApp nem API
node test-triagem.js

# 4. Suba o bot (também abre o painel em http://localhost:3000)
npm start
```

Na primeira vez, um **QR code** aparece no terminal. No celular: WhatsApp → *Aparelhos conectados* → *Conectar um aparelho* → escaneie. A sessão fica salva em `.wwebjs_auth/`, então nas próximas vezes não precisa escanear de novo.

## Personalizar (painel no navegador — recomendado)

Você **não precisa mexer em código**. Toda a configuração fica em `data/config.json`, editável por um painel web:

- Com o bot rodando (`npm start`), abra **http://localhost:3000**.
- Ou abra **só o painel** (sem conectar o WhatsApp): `npm run painel`.

No painel você edita:
- **Dados do negócio** (nome, endereço, telefone, horários, pagamento).
- **Mensagens** (saudação e resposta de atendente).
- **Serviços** — adicionar/remover, com palavras-chave e preços.
- **Respostas rápidas (FAQ)**.
- **Entrega / Taxas** — taxa por bairro.
- **Palavras-chave gerais** (atendente, saudação).

Clique em **Salvar tudo** e o bot passa a usar as mudanças na hora (sem reiniciar). Dica: em qualquer texto você pode usar `{nome}`, `{telefone}`, `{endereco}`, `{pagamento}`, `{horarioSemana}` etc., que são preenchidos com os dados do negócio.

> O painel roda só na sua máquina (localhost). Não fica exposto na internet.

## Estrutura

```
data/
  config.json  → TODA a configuração (editada pelo painel)
src/
  config.js    → carrega/salva o config.json e monta as respostas
  triage.js    → triagem por palavra-chave e menu numerado
  ai.js        → respostas livres via Google Gemini
  admin.js     → servidor do painel de administração
  painel-only.js → abre só o painel (npm run painel)
  index.js     → conexão com o WhatsApp + painel
public/
  admin.html   → página do painel
test-triagem.js → teste offline da triagem
```

## Observações

- **Custo:** o Gemini tem uma cota **gratuita** generosa por dia, e só perguntas livres (que não casam com palavra-chave) chamam a IA — as respostas de menu são instantâneas e não consomem cota. Limites do plano gratuito: https://ai.google.dev/gemini-api/docs/rate-limits
- **whatsapp-web.js não é oficial.** É ótimo para protótipo e uso interno; para escala/produção considere a [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) oficial da Meta.
- **Sessão/estado em memória:** o handoff para humano e o histórico de conversa vivem na RAM e somem ao reiniciar. Para produção, troque por Redis ou um banco.
