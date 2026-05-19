/* ==========================================================================
   1. BANCO DE DADOS DE PAÍSES E IMAGENS DO MAPILLARY
   ========================================================================== */
// Se você tiver o token, cole aqui. Se deixar vazio, o jogo vai funcionar em modo de testes!
const MAPILLARY_ACCESS_TOKEN = "MLY|35692328117077583|cc2e5453075e8e09556d39de7182d979"

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
let mlyViewer = null

// Elementos do DOM
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
const viewContainer = document.getElementById("street-view-container")

/* ==========================================================================
   3. INICIALIZAÇÃO DO MAPILLARY (COM TRATAMENTO DE ERROS)
   ========================================================================== */
function carregarMapillary(imageId) {
  if (mlyViewer) {
    try {
      mlyViewer.remove()
    } catch (e) {
      console.log(e)
    }
    mlyViewer = null
  }

  // Se não mudou o token ou ele está vazio, avisa na tela de forma amigável
  if (
    !MAPILLARY_ACCESS_TOKEN ||
    MAPILLARY_ACCESS_TOKEN === "SEU_CLIENT_TOKEN_AQUI"
  ) {
    viewContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ffbc00; font-weight: bold;">
                <p>Modo de Testes Ativo (Sem Mapa)</p>
                <p style="font-size: 0.9rem; font-weight: normal; margin-top: 10px; color: #eee;">
                    O cronômetro abaixo está rodando! Quando chegar a 0, você poderá adivinhar o país.
                </p>
            </div>`
    return
  }

  // Tenta carregar o mapa dentro de um bloco try/catch para não travar o cronômetro se falhar
  try {
    if (typeof mapillary !== "undefined" && mapillary.Viewer) {
      viewContainer.innerHTML = "" // Limpa textos anteriores
      mlyViewer = new mapillary.Viewer({
        accessToken: MAPILLARY_ACCESS_TOKEN,
        container: "street-view-container",
        imageId: imageId,
        component: {
          cover: false,
          direction: false,
          sequence: true,
        },
      })
    } else {
      throw new Error("Biblioteca Mapillary não encontrada")
    }
  } catch (error) {
    console.error("Erro ao carregar o mapa:", error)
    viewContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ff4a4a;">
                <p>Erro ao renderizar o mapa 3D.</p>
                <p style="font-size: 0.85rem; color: #ccc; margin-top: 10px;">
                    Isso geralmente ocorre se o navegador bloquear o WebGL ou se o Token estiver incorreto. 
                    O jogo continuará normalmente em modo de texto!
                </p>
            </div>`
  }
}

/* ==========================================================================
   4. LÓGICA DO FLUXO DO JOGO
   ========================================================================== */
function iniciarNovoJogo() {
  // Força a limpeza de qualquer intervalo anterior antes de começar
  clearInterval(cronometroInterval)

  gridContainer.innerHTML = ""
  tentativaAtual = 0
  letraAtualIndex = 0
  tempoRestante = 30
  countdownEl.textContent = tempoRestante

  document.querySelectorAll(".key-btn").forEach((btn) => {
    btn.className =
      "key-btn" + (btn.classList.contains("special-key") ? " special-key" : "")
  })

  paisAtual = BANCO_PAISES[Math.floor(Math.random() * BANCO_PAISES.length)]
  palavraSecreta = paisAtual.nome.toUpperCase()
  letterCountEl.textContent = palavraSecreta.length

  mapPhaseSec.classList.remove("hidden")
  guessPhaseSec.classList.add("hidden")
  modalContainer.classList.add("hidden")

  // 1. Primeiro inicia o cronômetro para garantir que ele NUNCA trave
  iniciarCronometro()

  // 2. Depois tenta carregar o mapa
  carregarMapillary(paisAtual.imageId)
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

  if (mlyViewer) {
    try {
      mlyViewer.remove()
    } catch (e) {
      console.log(e)
    }
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

window.addEventListener("DOMContentLoaded", iniciarNovoJogo)
