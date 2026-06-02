/* ==========================================================================
   LÓGICA DEL JUEGO DEL RELOJ
   Gestión de turnos, generación de horas, respuestas y podio final.
   ========================================================================== */

// Nombres de las horas en español
const hourNames = {
  1: "la una",
  2: "las dos",
  3: "las tres",
  4: "las cuatro",
  5: "las cinco",
  6: "las seis",
  7: "las siete",
  8: "las ocho",
  9: "las nueve",
  10: "las diez",
  11: "las once",
  12: "las doce"
};

// Minutos en español (para distractores)
const minuteWords = {
  5: "cinco",
  10: "diez",
  15: "cuarto",
  20: "veinte",
  25: "veinticinco",
  30: "media"
};

// Estado Global del Juego
const state = {
  p1Name: "Jugador 1",
  p2Name: "Jugador 2",
  p1Score: 0,
  p2Score: 0,
  p1Hits: 0,
  p2Hits: 0,
  
  currentRound: 0,
  totalRounds: 10, // número o 'infinite'
  isInfinite: false,
  gameMode: "all", // 'all' o 'menos'
  
  // Variables del turno actual
  currentHour24: 12,
  currentHour12: 12,
  currentMinute: 0,
  correctText: "",
  options: [],
  clockType: "analog", // 'analog' o 'digital'
  
  // Respuestas del turno
  p1ChoiceIdx: null,
  p2ChoiceIdx: null,
  currentPlayerTurn: 1, // 1 o 2
  
  // Confetti animation control
  confettiActive: false
};

// Inicialización cuando carga el documento
document.addEventListener("DOMContentLoaded", () => {
  renderClockTicks();
  setupEventListeners();
});

/* ==========================================================================
   CONFIGURACIÓN DE EVENT LISTENERS
   ========================================================================== */
function setupEventListeners() {
  // Configuración de Modo de Juego (Botones toggle)
  const modeButtons = document.querySelectorAll("#game-mode-toggle .toggle-btn");
  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      modeButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.gameMode = btn.dataset.mode;
    });
  });

  // Configuración de Cantidad de Rondas
  const roundButtons = document.querySelectorAll("#rounds-selector .round-btn");
  roundButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      roundButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const val = btn.dataset.rounds;
      if (val === "infinite") {
        state.isInfinite = true;
        state.totalRounds = 9999;
      } else {
        state.isInfinite = false;
        state.totalRounds = parseInt(val);
      }
    });
  });

  // Botón: Empezar Partida
  document.getElementById("btn-start-game").addEventListener("click", startGame);

  // Botones de Opciones de Respuesta
  for (let i = 0; i < 4; i++) {
    document.getElementById(`option-${i}`).addEventListener("click", () => selectOption(i));
  }

  // Botón: Continuar en la Transición
  document.getElementById("btn-continue-transition").addEventListener("click", startPlayer2Turn);

  // Botón: Siguiente Ronda
  document.getElementById("btn-next-round").addEventListener("click", nextRound);

  // Botones para Finalizar Partida
  document.getElementById("btn-end-game-early").addEventListener("click", endGame);
  document.getElementById("btn-play-again").addEventListener("click", resetToSetup);
}

/* ==========================================================================
   DIBUJO DE MARCAS DEL RELOJ (SVG ticks)
   ========================================================================== */
function renderClockTicks() {
  const container = document.getElementById("clock-ticks");
  if (!container) return;
  container.innerHTML = "";
  
  for (let i = 0; i < 60; i++) {
    const angle = i * 6; // 360 / 60 = 6 grados
    const isHour = i % 5 === 0;
    const r1 = isHour ? 82 : 86; // Ticks de horas son más largos
    const r2 = 90;
    
    const x1 = 100 + r1 * Math.sin((angle * Math.PI) / 180);
    const y1 = 100 - r1 * Math.cos((angle * Math.PI) / 180);
    const x2 = 100 + r2 * Math.sin((angle * Math.PI) / 180);
    const y2 = 100 - r2 * Math.cos((angle * Math.PI) / 180);
    
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    
    if (isHour) {
      line.setAttribute("class", "hour-tick");
    }
    container.appendChild(line);
  }
}

/* ==========================================================================
   FLUJO DE PANTALLAS Y PARTIDA
   ========================================================================== */
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(scr => {
    scr.classList.remove("active");
  });
  document.getElementById(screenId).classList.add("active");
}

function startGame() {
  // Leer nombres
  const p1Val = document.getElementById("p1-name").value.trim();
  const p2Val = document.getElementById("p2-name").value.trim();
  state.p1Name = p1Val !== "" ? p1Val : "Jugador 1";
  state.p2Name = p2Val !== "" ? p2Val : "Jugador 2";

  // Reset puntuaciones
  state.p1Score = 0;
  state.p2Score = 0;
  state.p1Hits = 0;
  state.p2Hits = 0;
  state.currentRound = 0;
  
  // Actualizar HUD names
  document.getElementById("hud-p1-name").textContent = state.p1Name;
  document.getElementById("hud-p2-name").textContent = state.p2Name;
  document.getElementById("reveal-p1-name").textContent = state.p1Name;
  document.getElementById("reveal-p2-name").textContent = state.p2Name;
  document.getElementById("summary-p1-name").textContent = state.p1Name + ":";
  document.getElementById("summary-p2-name").textContent = state.p2Name + ":";
  document.getElementById("stats-p1-title").textContent = state.p1Name;
  document.getElementById("stats-p2-title").textContent = state.p2Name;

  nextRound();
}

function nextRound() {
  state.currentRound++;
  
  // Comprobar si hemos terminado las rondas
  if (state.currentRound > state.totalRounds) {
    endGame();
    return;
  }

  // Actualizar HUD ronda
  const roundText = state.isInfinite ? `Ronda ${state.currentRound}` : `Ronda ${state.currentRound} de ${state.totalRounds}`;
  document.getElementById("hud-round-number").textContent = roundText;
  document.getElementById("hud-p1-score").textContent = `${state.p1Score} pts`;
  document.getElementById("hud-p2-score").textContent = `${state.p2Score} pts`;

  // Alternar el tipo de reloj: Impar = Analógico, Par = Digital
  state.clockType = state.currentRound % 2 === 1 ? "analog" : "digital";

  // Generar nueva hora y opciones
  generateNewTime();
  
  // Preparar turno del Jugador 1
  state.currentPlayerTurn = 1;
  state.p1ChoiceIdx = null;
  state.p2ChoiceIdx = null;

  prepareTurnUI();
  showScreen("screen-game");
}

function prepareTurnUI() {
  const activePlayerName = state.currentPlayerTurn === 1 ? state.p1Name : state.p2Name;
  const turnBadge = document.getElementById("turn-announcement");
  
  // Cambiar clases según jugador activo
  if (state.currentPlayerTurn === 1) {
    turnBadge.className = "turn-announcement-card p1-active";
  } else {
    turnBadge.className = "turn-announcement-card p2-active";
  }
  
  document.getElementById("current-player-turn-name").textContent = activePlayerName;

  // Actualizar Relojes
  updateClocksDisplay();

  // Renderizar las 4 opciones
  for (let i = 0; i < 4; i++) {
    const btn = document.getElementById(`option-${i}`);
    btn.textContent = state.options[i];
    btn.className = "option-btn"; // reset classes
  }
}

/* ==========================================================================
   ACTUALIZACIÓN VISUAL DE LOS RELOJES Y TEMAS
   ========================================================================== */
function updateClocksDisplay() {
  const h = state.currentHour12;
  const m = state.currentMinute;
  const h24 = state.currentHour24;

  // 1. Aplicar Tema de Color según la hora del día (24h)
  const body = document.body;
  body.className = ""; // Limpiar temas anteriores
  
  if (h24 >= 6 && h24 < 12) {
    body.classList.add("theme-morning");
  } else if (h24 >= 12 && h24 < 18) {
    body.classList.add("theme-afternoon");
  } else if (h24 >= 18 && h24 < 21) {
    body.classList.add("theme-sunset");
  } else {
    body.classList.add("theme-night");
  }

  // 2. Mostrar contenedor correspondiente
  const analogContainer = document.getElementById("analog-clock-container");
  const digitalContainer = document.getElementById("digital-clock-container");

  if (state.clockType === "analog") {
    analogContainer.classList.remove("hidden");
    digitalContainer.classList.add("hidden");

    // Rotar manecillas
    const hourHand = document.getElementById("hand-hour");
    const minuteHand = document.getElementById("hand-minute");

    // Ángulo de minutos: cada minuto son 6 grados (360/60)
    const minuteAngle = m * 6;
    // Ángulo de horas: cada hora son 30 grados (360/12) + fracción del minuto (30 grados / 60 minutos = 0.5 grados por minuto)
    const hourAngle = (h % 12) * 30 + m * 0.5;

    hourHand.style.transform = `rotate(${hourAngle}deg)`;
    minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
  } else {
    analogContainer.classList.add("hidden");
    digitalContainer.classList.remove("hidden");

    // Formatear digital display (12h para facilitar el aprendizaje infantil)
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const strHour = h12.toString().padStart(2, "0");
    const strMin = m.toString().padStart(2, "0");
    document.getElementById("digital-time-display").textContent = `${strHour}:${strMin}`;
    
    // PM / AM indicator
    const period = h24 >= 12 ? "PM" : "AM";
    document.getElementById("digital-period-display").textContent = period;
  }
}

/* ==========================================================================
   SELECCIÓN DE OPCIÓN Y TRANSICIONES
   ========================================================================== */
function selectOption(idx) {
  if (state.currentPlayerTurn === 1) {
    state.p1ChoiceIdx = idx;
    
    // Pasar al turno del Jugador 2 con pantalla intermedia
    state.currentPlayerTurn = 2;
    document.getElementById("next-player-transition-name").textContent = state.p2Name;
    showScreen("screen-transition");
  } else {
    state.p2ChoiceIdx = idx;
    
    // Ambos han respondido, revelar resultados de la ronda
    revealRoundResults();
  }
}

function startPlayer2Turn() {
  prepareTurnUI();
  showScreen("screen-game");
}

/* ==========================================================================
   LÓGICA DE REVELACIÓN Y EVALUACIÓN
   ========================================================================== */
function revealRoundResults() {
  // Comprobar respuestas
  const p1Choice = state.options[state.p1ChoiceIdx];
  const p2Choice = state.options[state.p2ChoiceIdx];

  const p1Correct = (p1Choice === state.correctText);
  const p2Correct = (p2Choice === state.correctText);

  // Sumar puntos e hits
  if (p1Correct) {
    state.p1Score += 10;
    state.p1Hits++;
  }
  if (p2Correct) {
    state.p2Score += 10;
    state.p2Hits++;
  }

  // Actualizar UI del panel de revelación
  document.getElementById("reveal-correct-text").textContent = state.correctText;
  
  // Miniatura del reloj
  const miniContainer = document.getElementById("reveal-clock-mini");
  miniContainer.innerHTML = "";
  if (state.clockType === "analog") {
    // Clonar el SVG para mostrarlo en miniatura
    const svgClone = document.getElementById("analog-clock").cloneNode(true);
    svgClone.removeAttribute("id");
    miniContainer.appendChild(svgClone);
  } else {
    // Crear una mini cajita digital
    const digitalBox = document.createElement("div");
    digitalBox.className = "digital-clock-frame";
    digitalBox.style.transform = "scale(0.8)";
    digitalBox.style.margin = "0";
    digitalBox.style.padding = "10px 20px";
    
    const h12Num = state.currentHour24 % 12 === 0 ? 12 : state.currentHour24 % 12;
    const h12Str = h12Num.toString().padStart(2, "0");
    const m = state.currentMinute.toString().padStart(2, "0");
    const period = state.currentHour24 >= 12 ? "PM" : "AM";

    digitalBox.innerHTML = `
      <div class="digital-screen" style="padding: 8px 14px;">
        <span id="digital-time-display" style="font-size: 1.8rem;">${h12Str}:${m}</span>
        <span id="digital-period-display" style="font-size: 0.8rem; margin-left: 5px;">${period}</span>
      </div>
    `;
    miniContainer.appendChild(digitalBox);
  }

  // Generar explicación pedagógica personalizada
  const expl = getPedagogicalExplanation(state.currentHour12, state.currentMinute);
  document.getElementById("explanation-text").textContent = expl;

  // Actualizar tarjetas de acierto/error de jugadores
  const rP1Card = document.getElementById("reveal-p1-card");
  const rP2Card = document.getElementById("reveal-p2-card");
  const rP1Result = document.getElementById("reveal-p1-result");
  const rP2Result = document.getElementById("reveal-p2-result");

  if (p1Correct) {
    rP1Card.className = "player-score-card p1-card winner-card";
    rP1Result.textContent = "¡Correcto! ✅ (+10 pts)";
    rP1Result.style.color = "var(--color-success)";
    document.getElementById("summary-p1-choice").innerHTML = `<span style="color:var(--color-success)">${p1Choice} ✅</span>`;
  } else {
    rP1Card.className = "player-score-card p1-card";
    rP1Result.textContent = "Incorrecto ❌";
    rP1Result.style.color = "var(--color-error)";
    document.getElementById("summary-p1-choice").innerHTML = `<span style="color:var(--color-error)">${p1Choice} ❌</span>`;
  }

  if (p2Correct) {
    rP2Card.className = "player-score-card p2-card winner-card";
    rP2Result.textContent = "¡Correcto! ✅ (+10 pts)";
    rP2Result.style.color = "var(--color-success)";
    document.getElementById("summary-p2-choice").innerHTML = `<span style="color:var(--color-success)">${p2Choice} ✅</span>`;
  } else {
    rP2Card.className = "player-score-card p2-card";
    rP2Result.textContent = "Incorrecto ❌";
    rP2Result.style.color = "var(--color-error)";
    document.getElementById("summary-p2-choice").innerHTML = `<span style="color:var(--color-error)">${p2Choice} ❌</span>`;
  }

  // Actualizar título de ronda completada
  document.getElementById("result-round-title").textContent = `Resultado de la Ronda ${state.currentRound}`;

  showScreen("screen-reveal");
}

/* ==========================================================================
   GENERADOR DE HORAS Y DISTRACTORES INTELIGENTES
   ========================================================================== */
function generateNewTime() {
  // Elegir hora (1 a 12 para analógico, 24h para digital/tema)
  state.currentHour24 = Math.floor(Math.random() * 24);
  state.currentHour12 = state.currentHour24 % 12;
  if (state.currentHour12 === 0) state.currentHour12 = 12;

  // Elegir minutos según modo
  if (state.gameMode === "menos") {
    // Solo minutos de resta: 35, 40, 45, 50, 55
    const subtractionMinutes = [35, 40, 45, 50, 55];
    state.currentMinute = subtractionMinutes[Math.floor(Math.random() * subtractionMinutes.length)];
  } else {
    // Todas las horas (pasos de 5)
    const allMinutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    state.currentMinute = allMinutes[Math.floor(Math.random() * allMinutes.length)];
  }

  // Texto correcto
  state.correctText = getSpanishTimeText(state.currentHour12, state.currentMinute);

  // Generar opciones (distractores inteligentes)
  state.options = generateSmartDistractors(state.currentHour12, state.currentMinute);
}

function getSpanishTimeText(h, m) {
  const nextH = (h % 12) + 1;

  if (m === 0) return `${hourNames[h]} en punto`;
  if (m === 5) return `${hourNames[h]} y cinco`;
  if (m === 10) return `${hourNames[h]} y diez`;
  if (m === 15) return `${hourNames[h]} y cuarto`;
  if (m === 20) return `${hourNames[h]} y veinte`;
  if (m === 25) return `${hourNames[h]} y veinticinco`;
  if (m === 30) return `${hourNames[h]} y media`;
  
  if (m === 35) return `${hourNames[nextH]} menos veinticinco`;
  if (m === 40) return `${hourNames[nextH]} menos veinte`;
  if (m === 45) return `${hourNames[nextH]} menos cuarto`;
  if (m === 50) return `${hourNames[nextH]} menos diez`;
  if (m === 55) return `${hourNames[nextH]} menos cinco`;

  return `${hourNames[h]} y ${m} minutos`;
}

function generateSmartDistractors(h, m) {
  const correct = getSpanishTimeText(h, m);
  
  // Pool de distractores potenciales (excluyendo la respuesta correcta)
  const distractorPool = new Set();
  
  const nextH = (h % 12) + 1;
  const prevH = (h - 1 === 0) ? 12 : h - 1;

  if (m >= 35) {
    // 1. Error de Hora: Usar hora actual en vez de la siguiente hora de resta
    distractorPool.add(`${hourNames[h]} ${getMinuteSubtractionWord(m)}`);
    
    // 2. Error de Sentido: Decir "y" en vez de "menos" con la siguiente hora
    const positiveMappedMin = { 35: 25, 40: 20, 45: 15, 50: 10, 55: 5 };
    distractorPool.add(`${hourNames[nextH]} y ${minuteWords[positiveMappedMin[m]]}`);

    // 3. Error de Sentido con la hora actual
    distractorPool.add(`${hourNames[h]} y ${minuteWords[positiveMappedMin[m]]}`);
    
    // 4. Distractor de minutos cercanos en resta
    const offsetMin = m === 45 ? 50 : 45;
    distractorPool.add(`${hourNames[nextH]} ${getMinuteSubtractionWord(offsetMin)}`);
  } else if (m > 0 && m < 30) {
    // 1. Error de Sentido: Decir "menos" en vez de "y"
    distractorPool.add(`${hourNames[h]} menos ${minuteWords[m]}`);
    
    // 2. Error de Hora: Usar la hora siguiente
    distractorPool.add(`${hourNames[nextH]} y ${minuteWords[m]}`);

    // 3. Error de minutos cercanos
    const offsetMin = m === 15 ? 20 : 15;
    distractorPool.add(`${hourNames[h]} y ${minuteWords[offsetMin]}`);
  } else if (m === 30) {
    distractorPool.add(`${hourNames[h]} menos media`);
    distractorPool.add(`${hourNames[nextH]} y media`);
    distractorPool.add(`${hourNames[h]} en punto`);
  } else if (m === 0) {
    distractorPool.add(`${hourNames[h]} y media`);
    distractorPool.add(`${hourNames[prevH]} en punto`);
    distractorPool.add(`${hourNames[h]} y cinco`);
  }

  // Asegurar que la respuesta correcta no esté en el pool de distractores
  distractorPool.delete(correct);

  // Convertir a array y barajar los distractores
  const distractorList = Array.from(distractorPool);
  shuffle(distractorList);

  // Tomar exactamente los primeros 3 distractores
  const selectedDistractors = distractorList.slice(0, 3);

  // Crear el conjunto final con la correcta + los 3 distractores
  const finalOptionsSet = new Set([correct]);
  selectedDistractors.forEach(d => finalOptionsSet.add(d));

  // Rellenar con horas aleatorias si por alguna razón no llegamos a 4 opciones
  while (finalOptionsSet.size < 4) {
    const randomH = Math.floor(Math.random() * 12) + 1;
    const minutesArray = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    const randomM = minutesArray[Math.floor(Math.random() * minutesArray.length)];
    const randTimeText = getSpanishTimeText(randomH, randomM);
    if (randTimeText !== correct) {
      finalOptionsSet.add(randTimeText);
    }
  }

  // Convertir a array y barajar una última vez para que la respuesta correcta cambie de posición
  const finalOptionsArray = Array.from(finalOptionsSet);
  shuffle(finalOptionsArray);
  return finalOptionsArray;
}

function getMinuteSubtractionWord(m) {
  if (m === 35) return "menos veinticinco";
  if (m === 40) return "menos veinte";
  if (m === 45) return "menos cuarto";
  if (m === 50) return "menos diez";
  if (m === 55) return "menos cinco";
  return "";
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/* ==========================================================================
   EXPLICACIÓN PEDAGÓGICA PERSONALIZADA
   ========================================================================== */
function getPedagogicalExplanation(h, m) {
  const nextH = (h % 12) + 1;
  const nameH = hourNames[h];
  const nameNextH = hourNames[nextH];

  if (m === 0) {
    return `Como los minutos están en 00, el minutero apunta exactamente hacia arriba (a las 12). Decimos que es "${nameH} en punto".`;
  }
  if (m === 15) {
    return `El minutero ha recorrido un cuarto de círculo (15 minutos). Por eso decimos que es "${nameH} y cuarto".`;
  }
  if (m === 30) {
    return `El minutero ha completado media vuelta al reloj (30 minutos). Por eso decimos que es "${nameH} y media".`;
  }
  
  if (m >= 35) {
    const minRestantes = 60 - m;
    let minText = minRestantes.toString();
    if (minRestantes === 15) minText = "un cuarto";
    
    return `¡Ojo con las restas! El minutero ya pasó de la mitad (y media). Ahora miramos cuánto falta para llegar a la siguiente hora (${nameNextH}). Como faltan ${minRestantes === 15 ? 'quince minutos' : minRestantes + ' minutos'} (${minText} de hora), restamos ese tiempo: decimos "${getSpanishTimeText(h, m)}".`;
  }

  return `Han pasado ${m} minutos desde las ${nameH}. Por eso simplemente le sumamos los minutos: "${nameH} y ${minuteWords[m]}".`;
}

/* ==========================================================================
   PANTALLA FINAL: PODIO Y ESTADÍSTICAS
   ========================================================================== */
function endGame() {
  // Determinar ganador
  let announcement = "";
  let goldPlayer = "";
  let silverPlayer = "";
  let goldScore = 0;
  let silverScore = 0;
  let goldAvatar = "🎒";
  let silverAvatar = "🎨";

  if (state.p1Score > state.p2Score) {
    announcement = `¡Felicidades ${state.p1Name}, has ganado la partida! 🎉`;
    goldPlayer = state.p1Name;
    goldScore = state.p1Score;
    goldAvatar = "🎒";
    silverPlayer = state.p2Name;
    silverScore = state.p2Score;
    silverAvatar = "🎨";
  } else if (state.p2Score > state.p1Score) {
    announcement = `¡Felicidades ${state.p2Name}, has ganado la partida! 🎉`;
    goldPlayer = state.p2Name;
    goldScore = state.p2Score;
    goldAvatar = "🎨";
    silverPlayer = state.p1Name;
    silverScore = state.p1Score;
    silverAvatar = "🎒";
  } else {
    announcement = `¡Ha sido un increíble empate a ${state.p1Score} puntos! 🤝`;
    goldPlayer = state.p1Name;
    goldScore = state.p1Score;
    goldAvatar = "🎒";
    silverPlayer = state.p2Name;
    silverScore = state.p2Score;
    silverAvatar = "🎨";
  }

  // Actualizar textos del podio
  document.getElementById("winner-announcement-text").textContent = announcement;
  document.getElementById("podium-p-gold").textContent = goldPlayer;
  document.getElementById("podium-p-gold-score").textContent = `${goldScore} pts`;
  document.querySelector(".step-1 .podium-avatar").textContent = goldAvatar;

  document.getElementById("podium-p-silver").textContent = silverPlayer;
  document.getElementById("podium-p-silver-score").textContent = `${silverScore} pts`;
  document.querySelector(".step-2 .podium-avatar").textContent = silverAvatar;

  // Estadísticas globales
  const roundsPlayed = state.currentRound - 1;
  document.getElementById("stats-total-rounds").textContent = roundsPlayed;

  // Jugador 1 estadisticas
  document.getElementById("stats-p1-hits").textContent = `${state.p1Hits} / ${roundsPlayed}`;
  const p1Pct = roundsPlayed > 0 ? Math.round((state.p1Hits / roundsPlayed) * 100) : 0;
  document.getElementById("stats-p1-pct").textContent = `${p1Pct}%`;

  // Jugador 2 estadisticas
  document.getElementById("stats-p2-hits").textContent = `${state.p2Hits} / ${roundsPlayed}`;
  const p2Pct = roundsPlayed > 0 ? Math.round((state.p2Hits / roundsPlayed) * 100) : 0;
  document.getElementById("stats-p2-pct").textContent = `${p2Pct}%`;

  // Lanzar Confeti si hay puntuación positiva
  if (state.p1Score > 0 || state.p2Score > 0) {
    startConfetti();
  }

  showScreen("screen-gameover");
}

function resetToSetup() {
  stopConfetti();
  showScreen("screen-setup");
}

/* ==========================================================================
   SISTEMA DE CONFETI EN CANVAS (LIGERO Y SIN LIBRERÍAS)
   ========================================================================== */
let confettiInterval = null;
let confettiParticles = [];
const canvas = document.getElementById("confetti-canvas");
const ctx = canvas.getContext("2d");

function startConfetti() {
  state.confettiActive = true;
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  
  confettiParticles = [];
  for (let i = 0; i < 150; i++) {
    confettiParticles.push(createConfettiParticle());
  }

  if (confettiInterval) cancelAnimationFrame(confettiInterval);
  animateConfetti();
}

function stopConfetti() {
  state.confettiActive = false;
  window.removeEventListener("resize", resizeCanvas);
  if (confettiInterval) cancelAnimationFrame(confettiInterval);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createConfettiParticle() {
  const colors = ["#fbbf24", "#3b82f6", "#ec4899", "#10b981", "#8b5cf6", "#f97316"];
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    r: Math.random() * 6 + 4,
    d: Math.random() * canvas.height,
    color: colors[Math.floor(Math.random() * colors.length)],
    tilt: Math.random() * 10 - 5,
    tiltAngleIncremental: Math.random() * 0.07 + 0.02,
    tiltAngle: 0,
    speed: Math.random() * 3 + 2
  };
}

function animateConfetti() {
  if (!state.confettiActive) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  confettiParticles.forEach((p, idx) => {
    p.tiltAngle += p.tiltAngleIncremental;
    p.y += p.speed;
    p.x += Math.sin(p.tiltAngle) * 0.5;
    p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

    // Dibujar partícula
    ctx.beginPath();
    ctx.lineWidth = p.r;
    ctx.strokeStyle = p.color;
    ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
    ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
    ctx.stroke();

    // Resetear partícula si se sale de la pantalla
    if (p.y > canvas.height) {
      confettiParticles[idx] = createConfettiParticle();
      confettiParticles[idx].y = -10;
    }
  });

  confettiInterval = requestAnimationFrame(animateConfetti);
}
