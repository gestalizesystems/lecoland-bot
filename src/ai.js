// Responde perguntas livres usando a IA gratuita do Google Gemini,
// ancorada nos dados atuais do negócio (lidos ao vivo do config.json).
// Mantém histórico curto por contato.

const { GoogleGenAI } = require("@google/genai");
const config = require("./config");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELO = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Monta a "system instruction" com o contexto do negócio. Reconstruída a cada
// chamada para refletir edições feitas no painel sem reiniciar o bot.
function montarContexto() {
  const dados = config.get();
  const n = dados.negocio;

  const linhasServicos = config
    .intents()
    .map((o) => `- ${o.titulo}: ${o.resposta.replace(/\n+/g, " ").replace(/\*/g, "")}`)
    .join("\n");

  return [
    `Você é o atendente virtual da ${n.nome}, um(a) ${n.tipo}.`,
    "Seu papel é responder dúvidas de clientes pelo WhatsApp de forma simpática, curta e objetiva (no máximo ~4 linhas).",
    "Use português brasileiro informal e no máximo um emoji por mensagem.",
    "",
    "INFORMAÇÕES DO NEGÓCIO:",
    `Endereço: ${n.endereco}`,
    `Telefone: ${n.telefone}`,
    `Horário: ${n.horarioSemana}; ${n.horarioSabado}; ${n.horarioDomingo}`,
    `Pagamento: ${n.pagamento}`,
    "",
    "SERVIÇOS E INFORMAÇÕES:",
    linhasServicos,
    "",
    "REGRAS:",
    "- Responda APENAS com base nas informações acima. Não invente preços, serviços, horários ou taxas.",
    "- Se a pergunta for sobre algo que você não tem (ex.: preço específico, disponibilidade, caso clínico), diga que vai verificar com um atendente e peça os dados necessários.",
    "- Nunca dê diagnóstico ou orientação médica veterinária; em emergências, oriente a ligar para o telefone do negócio.",
    "- Se o cliente quiser agendar, peça os dados que faltam (nome do pet, porte/espécie, dia e horário).",
  ].join("\n");
}

// Histórico em memória no formato do Gemini: contactId -> [{role, parts:[{text}]}]
const historicos = new Map();
const MAX_TURNOS = 6;

function getHistorico(contactId) {
  if (!historicos.has(contactId)) historicos.set(contactId, []);
  return historicos.get(contactId);
}

async function responder(contactId, mensagem) {
  const historico = getHistorico(contactId);
  historico.push({ role: "user", parts: [{ text: mensagem }] });

  const cfg = {
    systemInstruction: montarContexto(),
    maxOutputTokens: 500,
    temperature: 0.4,
  };
  if (MODELO.includes("2.5")) cfg.thinkingConfig = { thinkingBudget: 0 };

  const resposta = await ai.models.generateContent({
    model: MODELO,
    contents: historico,
    config: cfg,
  });

  const texto = (resposta.text || "").trim();
  const final =
    texto || "Desculpe, não entendi. Pode reformular? Ou digite *atendente* para falar com uma pessoa.";

  historico.push({ role: "model", parts: [{ text: final }] });
  if (historico.length > MAX_TURNOS) historico.splice(0, historico.length - MAX_TURNOS);

  return final;
}

function limparHistorico(contactId) {
  historicos.delete(contactId);
}

module.exports = { responder, limparHistorico };
