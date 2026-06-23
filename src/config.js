// Carrega e salva os dados do negócio a partir de data/config.json.
// Tudo que o bot responde vem daqui — e o painel web (admin) edita este arquivo.

const fs = require("fs");
const path = require("path");

const CAMINHO = path.join(__dirname, "..", "data", "config.json");

let dados = carregar();

function carregar() {
  const bruto = fs.readFileSync(CAMINHO, "utf8");
  return JSON.parse(bruto);
}

// Relê o arquivo do disco (chamado após salvar pelo painel).
function reload() {
  dados = carregar();
  return dados;
}

// Retorna os dados atuais em memória.
function get() {
  return dados;
}

// Salva novos dados no arquivo e atualiza a memória.
function salvar(novos) {
  fs.writeFileSync(CAMINHO, JSON.stringify(novos, null, 2), "utf8");
  dados = novos;
  return dados;
}

// Substitui {nome}, {telefone}, {endereco}, {horarioSemana}, etc. em qualquer texto.
function preencher(texto) {
  if (!texto) return texto;
  const n = dados.negocio;
  return texto
    .replace(/{nome}/g, n.nome)
    .replace(/{tipo}/g, n.tipo)
    .replace(/{endereco}/g, n.endereco)
    .replace(/{telefone}/g, n.telefone)
    .replace(/{horarioSemana}/g, n.horarioSemana)
    .replace(/{horarioSabado}/g, n.horarioSabado)
    .replace(/{horarioDomingo}/g, n.horarioDomingo)
    .replace(/{pagamento}/g, n.pagamento);
}

// Monta o texto da resposta de entrega a partir das taxas cadastradas.
function respostaEntrega() {
  const e = dados.entrega;
  const linhas = (e.taxas || []).map((t) => `• ${t.bairro}: R$ ${t.valor}`).join("\n");
  let texto = e.intro;
  if (linhas) texto += "\n" + linhas;
  if (e.rodape) texto += "\n\n" + e.rodape;
  return preencher(texto);
}

// Lista unificada de "intenções" para o menu numerado e a busca por palavra-chave.
// Ordem: serviços, FAQ rápido e (se ativa) a entrega. O número no menu = posição aqui.
function intents() {
  const lista = [];
  for (const s of dados.servicos) {
    lista.push({ chave: s.chave, titulo: s.titulo, gatilhos: s.gatilhos, resposta: preencher(s.resposta) });
  }
  for (const f of dados.faqRapido) {
    lista.push({ chave: f.chave, titulo: f.titulo, gatilhos: f.gatilhos, resposta: preencher(f.resposta) });
  }
  if (dados.entrega && dados.entrega.ativo) {
    lista.push({
      chave: "entrega",
      titulo: dados.entrega.titulo,
      gatilhos: dados.entrega.gatilhos,
      resposta: respostaEntrega(),
    });
  }
  return lista;
}

module.exports = { get, reload, salvar, preencher, respostaEntrega, intents, CAMINHO };
