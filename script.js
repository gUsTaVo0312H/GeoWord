/* ==========================================================================
   1. BANCO DE DADOS DE PAÍSES E IMAGENS DO MAPILLARY
   ========================================================================== */
// Insira aqui o Token que você copiou do painel do Mapillary
const MAPILLARY_ACCESS_TOKEN =
  "MLY|35692328117077583|cc2e5453075e8e09556d39de7182d979"

// Lista de países com IDs de imagens reais e verificadas em 360º no Mapillary
const BANCO_PAISES = [
  { nome: "BRASIL", imageId: "513364947118228" },
  { nome: "JAPAO", imageId: "508734007357416" },
  { nome: "FRANCA", imageId: "1482939332155725" },
  { nome: "ITALIA", imageId: "472304910940562" },
  { nome: "ARGENTINA", imageId: "1056586071633519" },
  { nome: "CANADA", imageId: "419992643196964" },
  { nome: "AUSTRALIA", imageId: "375086084478144" },
  { nome: "ALEMANHA", imageId: "281691136952763" },
  { nome: "PORTUGAL", imageId: "542718100588661" },
  { nome: "MEXICO", imageId: "437648347963212" },
  { nome: "EGITO", imageId: "374246944368940" },
  { nome: "INDIA", imageId: "651473182604925" },
]

/* ==========================================================================
   2. ESTADO DO JOGO (VARIÁVEIS DE CONTROLE)
   ========================================================================== */
let paisAtual = null
let palavraSecreta = ""
let tentativaAtual = 0
let letraAtualIndex = 0
let maxTentativas = 6
let tempoRestante = 30
let cronometroInterval = null
let mlyViewer = null // Armazena a instância do visualizador Mapillary

// Elementos da Interface (DOM)
const mapPhaseSec = document.getElementById("map-phase")
const guessPhaseSec = document.getElementById("guess-phase")
const countdownEl = document.getElementById("countdown")
const skipBtn = document.getElementById("skip-button")
const gridContainer = document.getElementById("grid-container")
const letterCountEl = document.getElementById("letter-count")
const modalContainer = document.getElementById("modal-container")
const modalTitle = document.getElementById("modal-title")
const modalMessage = document.getElementById("modal-message")
const restartBtn = document.getElementById("restart-button")

/* ==========================================================================
   3. INICIALIZAÇÃO DO MAPILLARY
   ========================================================================== */
function carregarMapillary(imageId) {
  // Se já existir um mapa rodando, destrói para não pesar a memória
  if (mlyViewer) {
    mlyViewer.remove()
  }

  // Inicializa o visualizador dentro da div do HTML
  mlyViewer = new mapillary.Viewer({
    accessToken: MAPILLARY_ACCESS_TOKEN,
    container: "street-view-container",
    imageId: imageId,
    component: {
      cover: false, // Esconde telas de carregamento padrão deles
      direction: false, // Esconde bússolas para não dar pistas fáceis
      sequence: true, // Mantém as setas para o jogador andar pela rua
    },
  })
}

/* ==========================================================================
   4. LÓGICA DO FLUXO DO JOGO
   ========================================================================== */
function iniciarNovoJogo() {
  // 1. Limpar estados anteriores
  clearInterval(cronometroInterval)
  gridContainer.innerHTML = ""
  tentativaAtual = 0
  letraAtualIndex = 0
  tempoRestante = 30
  countdownEl.textContent = tempoRestante

  // Resetar cores do teclado virtual
  document.querySelectorAll(".key-btn").forEach((btn) => {
    btn.className =
      "key-btn" + (btn.classList.contains("special-key") ? " special-key" : "")
  })

  // 2. Escolher país aleatório
  paisAtual = BANCO_PAISES[Math.floor(Math.random() * BANCO_PAISES.length)]
  palavraSecreta = paisAtual.nome.toUpperCase()
  letterCountEl.textContent = palavraSecreta.length

  // 3. Configurar Telas (Mostrar Mapa, Esconder Chutes e Modal)
  mapPhaseSec.classList.remove("hidden")
  guessPhaseSec.classList.add("hidden")
  modalContainer.classList.add("hidden")

  // 4. Verificar Token e Carregar o Mapa
  if (MAPILLARY_ACCESS_TOKEN === "SEU_CLIENT_TOKEN_AQUI") {
    document.getElementById("street-view-container").innerHTML =
      "<p style='padding:20px; text-align:center; color:red;'>Substitua 'SEU_CLIENT_TOKEN_AQUI' no topo do script.js com seu token do Mapillary!</p>"
  } else {
    carregarMapillary(paisAtual.imageId)
  }

  iniciarCronometro()
}

function iniciarCronometro() {
  cronometroInterval = setInterval(() => {
    tempoRestante--
    countdownEl.textContent = tempoRestante

    if (tempoRestante <= 0) {
      encerrarFaseMapa()
    }
  }, 1000)
}

function encerrarFaseMapa() {
  clearInterval(cronometroInterval)
  mapPhaseSec.classList.add("hidden")
  guessPhaseSec.classList.remove("hidden")

  // Destrói o mapa ao fechar para poupar desempenho do navegador
  if (mlyViewer) {
    mlyViewer.remove()
    mlyViewer = null
  }

  criarGradeTermo()
}

/* ==========================================================================
   5. LÓGICA DA GRADE ESTILO "TERMO"
   ========================================================================== */
function criarGradeTermo() {
  gridContainer.innerHTML = ""

  for (let i = 0; i < maxTentativas; i++) {
    const row = document.createElement("div")
    row.classList.add("grid-row")

    for (let j = 0; j < palavraSecreta.length; j++) {
      const tile = document.createElement("div")
      tile.classList.add("letter-tile")
      tile.setAttribute("id", `tile-${i}-${j}`)
      row.appendChild(tile)
    }

    gridContainer.appendChild(row)
  }
}

/* ==========================================================================
   6. CAPTURA DE ENTRADAS (TECLADO FÍSICO E VIRTUAL)
   ========================================================================== */
document.getElementById("keyboard-container").addEventListener("click", (e) => {
  const botao = e.target.closest(".key-btn")
  if (!botao) return

  const tecla = botao.getAttribute("data-key")
  processarEntradaLetra(tecla)
})

document.addEventListener("keydown", (e) => {
  if (!mapPhaseSec.classList.contains("hidden")) return

  const tecla = e.key.toUpperCase()

  if (tecla === "ENTER") {
    processarEntradaLetra("ENTER")
  } else if (tecla === "BACKSPACE" || e.key === "Backspace") {
    processarEntradaLetra("BACKSPACE")
  } else if (tecla === "Ç") {
    processarEntradaLetra("Ç")
  } else if (tecla.length === 1 && tecla >= "A" && tecla <= "Z") {
    processarEntradaLetra(tecla)
  }
})

function processarEntradaLetra(tecla) {
  if (guessPhaseSec.classList.contains("hidden")) return

  const linhaAtual = tentativaAtual

  if (tecla === "BACKSPACE") {
    if (letraAtualIndex > 0) {
      letraAtualIndex--
      const tile = document.getElementById(
        `tile-${linhaAtual}-${letraAtualIndex}`,
      )
      tile.textContent = ""
      tile.classList.remove("tile-toggled")
    }
  } else if (tecla === "ENTER") {
    if (letraAtualIndex === palavraSecreta.length) {
      verificarTentativa()
    } else {
      alert("Preencha todas as letras antes de enviar!")
    }
  } else {
    if (letraAtualIndex < palavraSecreta.length) {
      const tile = document.getElementById(
        `tile-${linhaAtual}-${letraAtualIndex}`,
      )
      tile.textContent = tecla
      tile.classList.add("tile-toggled")
      letraAtualIndex++
    }
  }
}

/* ==========================================================================
   7. VALIDAÇÃO DA PALAVRA (ALGORITMO DO TERMO)
   ========================================================================== */
function verificarTentativa() {
  const linhaAtual = tentativaAtual
  let acertos = 0

  let letrasPalavraSecretaContagem = {}
  for (let l of palavraSecreta) {
    letrasPalavraSecretaContagem[l] = (letrasPalavraSecretaContagem[l] || 0) + 1
  }

  let statuses = new Array(palavraSecreta.length).fill("tile-absent")
  let letrasChute = []

  for (let j = 0; j < palavraSecreta.length; j++) {
    const tile = document.getElementById(`tile-${linhaAtual}-${j}`)
    letrasChute.push(tile.textContent)
  }

  for (let j = 0; j < palavraSecreta.length; j++) {
    if (letrasChute[j] === palavraSecreta[j]) {
      statuses[j] = "tile-correct"
      letrasPalavraSecretaContagem[letrasChute[j]]--
      acertos++
    }
  }

  for (let j = 0; j < palavraSecreta.length; j++) {
    if (statuses[j] !== "tile-correct") {
      if (letrasPalavraSecretaContagem[letrasChute[j]] > 0) {
        statuses[j] = "tile-present"
        letrasPalavraSecretaContagem[letrasChute[j]]--
      }
    }
  }

  for (let j = 0; j < palavraSecreta.length; j++) {
    const tile = document.getElementById(`tile-${linhaAtual}-${j}`)
    const letra = letrasChute[j]

    tile.classList.remove("tile-toggled")
    tile.classList.add(statuses[j])

    atualizarCorTecladoVirtual(letra, statuses[j])
  }

  if (acertos === palavraSecreta.length) {
    finalizarJogo(true)
  } else {
    tentativaAtual++
    letraAtualIndex = 0

    if (tentativaAtual >= maxTentativas) {
      finalizarJogo(false)
    }
  }
}

function atualizarCorTecladoVirtual(letra, novoStatus) {
  const botaoTeclado = document.querySelector(`.key-btn[data-key="${letra}"]`)
  if (!botaoTeclado) return

  if (botaoTeclado.classList.contains("tile-correct")) return
  if (
    botaoTeclado.classList.contains("tile-present") &&
    novoStatus === "tile-absent"
  )
    return

  botaoTeclado.classList.remove("tile-present", "tile-absent", "tile-correct")
  botaoTeclado.classList.add(novoStatus)
}

/* ==========================================================================
   8. TELA FINAL (FIM DE JOGO)
   ========================================================================== */
function finalizarJogo(ganhou) {
  modalContainer.classList.remove("hidden")

  if (ganhou) {
    modalTitle.textContent = "Você acertou! 🎉"
    modalTitle.style.color = "var(--color-correct)"
    modalMessage.innerHTML = `Parabéns! O país era realmente <strong>${palavraSecreta}</strong>.`
  } else {
    modalTitle.textContent = "Fim de Jogo! 😢"
    modalTitle.style.color = "#ff4a4a"
    modalMessage.innerHTML = `Não foi dessa vez! O país correto era <strong>${palavraSecreta}</strong>.`
  }
}

/* ==========================================================================
   9. EVENTOS DOS BOTÕES DE INTERAÇÃO
   ========================================================================== */
skipBtn.addEventListener("click", encerrarFaseMapa)
restartBtn.addEventListener("click", iniciarNovoJogo)

// Inicia o jogo assim que a página estiver pronta
window.addEventListener("DOMContentLoaded", iniciarNovoJogo)
