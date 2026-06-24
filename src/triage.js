// Triagem por palavras-chave: normaliza o texto do cliente e tenta casar
// com as intenções (serviços, FAQ, entrega), atendente humano ou saudação/menu.
// Lê a configuração ao vivo via config.get()/intents(), então edições no painel
// valem imediatamente, sem reiniciar o bot.

const config = require("./config");

// Remove acentos, deixa minúsculo e tira pontuação — pra casar "veterinário" com "veterinario".
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Casa um gatilho como palavra inteira (evita "vet" casar dentro de "veterano").
function contemGatilho(textoNormalizado, gatilho) {
  const g = normalizar(gatilho);
  if (!g) return false;
  const re = new RegExp(`(^|\\s)${g.replace(/\s+/g, "\\s+")}($|\\s)`);
  return re.test(textoNormalizado);
}

function casaAlgumGatilho(textoNormalizado, gatilhos) {
  return (gatilhos || []).some((g) => contemGatilho(textoNormalizado, g));
}

function menuPrincipal() {
  const { mensagens } = config.get();
  const linhas = config
    .intents()
    .map((opcao, i) => `${i + 1} - ${opcao.titulo}`)
    .join("\n");
  return (
    config.preencher(mensagens.saudacaoIntro) +
    "\n\n" +
    config.preencher(mensagens.saudacaoChamada) +
    "\n" +
    linhas +
    "\n\n" +
    config.preencher(mensagens.saudacaoRodape)
  );
}

// Monta o texto de um sub-menu: introdução + opções numeradas + rodapé.
function menuTexto(menu) {
  const linhas = (menu.opcoes || []).map((o, i) => `${i + 1} - ${o.titulo}`).join("\n");
  const intro = config.preencher(menu.intro || `*${menu.nome || "Menu"}*`);
  return intro + "\n\n" + linhas + "\n\nDigite o *número* da opção desejada.";
}

// Retorna { tipo, resposta, [novoContexto] } ou { tipo: "ia" } quando não há match.
// `contexto` = lista de opções do menu atual do cliente (para resolver o número escolhido).
// `novoContexto` (quando presente) = lista de opções a lembrar para esse cliente.
function triar(textoBruto, contexto) {
  const dados = config.get();
  const texto = normalizar(textoBruto);
  const principais = config.intents();

  if (!texto) {
    return { tipo: "menu", resposta: menuPrincipal(), novoContexto: principais };
  }

  if (casaAlgumGatilho(texto, dados.gatilhosAtendente)) {
    return { tipo: "atendente", resposta: config.preencher(dados.mensagens.atendente) };
  }

  if (casaAlgumGatilho(texto, dados.gatilhosSaudacao) || dados.gatilhosSaudacao.includes(texto)) {
    return { tipo: "menu", resposta: menuPrincipal(), novoContexto: principais };
  }

  // Número → responde a opção do MENU ATUAL (sub-menu) ou, se não houver, do principal.
  if (/^\d+$/.test(texto)) {
    const lista = contexto && contexto.length ? contexto : principais;
    const indice = parseInt(texto, 10) - 1;
    if (indice >= 0 && indice < lista.length) {
      const opcao = lista[indice];
      return { tipo: "opcao", chave: opcao.chave, resposta: config.preencher(opcao.resposta) };
    }
    return { tipo: "menu", resposta: menuPrincipal(), novoContexto: principais };
  }

  // Palavra-chave de um SUB-MENU → abre o sub-menu e lembra suas opções.
  for (const menu of dados.menus || []) {
    if (casaAlgumGatilho(texto, menu.gatilhos)) {
      return { tipo: "submenu", chave: menu.id, resposta: menuTexto(menu), novoContexto: menu.opcoes || [] };
    }
  }

  // Palavra-chave de serviço/FAQ/entrega (menu principal).
  for (const opcao of principais) {
    if (casaAlgumGatilho(texto, opcao.gatilhos)) {
      return { tipo: "opcao", chave: opcao.chave, resposta: config.preencher(opcao.resposta), novoContexto: principais };
    }
  }

  // Mensagens personalizadas (só por palavra-chave).
  for (const ex of dados.mensagensExtras || []) {
    if (casaAlgumGatilho(texto, ex.gatilhos)) {
      return { tipo: "mensagem", chave: ex.chave, resposta: config.preencher(ex.resposta) };
    }
  }

  // Sem palavra-chave reconhecida → deixa a IA (Gemini) responder a pergunta livre.
  return { tipo: "ia" };
}

module.exports = { triar, normalizar, menuPrincipal, menuTexto };
