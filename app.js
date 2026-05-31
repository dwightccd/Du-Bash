const scriptSteps = [
  {
    title: "1. Traducir el enunciado",
    goal: "Antes de programar, convierte el texto de ASO06 en una lista de requisitos comprobables.",
    theory: "El script recibe tres parametros: fichero base, limite en MB y CSV de salida. Debe recorrer usuarios con UID > 500, revisar su home en /home, exportar los que superen el limite y guardar resumen/errores en historial.log.",
    examTip: "Si puedes explicar entradas, salida y condiciones antes de escribir codigo, ya tienes medio examen controlado.",
    code: ""
  },
  {
    title: "2. Shebang, log y ayuda",
    goal: "Crear la base del script y una funcion de ayuda clara.",
    theory: "El shebang selecciona Bash. La ayuda debe aparecer con -help o cuando falten parametros. El log debe tener fecha y hora en cada linea.",
    examTip: "La ayuda puntua porque demuestra que sabes preparar scripts mantenibles.",
    code: `#!/bin/bash

LOGFILE="historial.log"

log_msg() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOGFILE"
}

mostrar_ayuda() {
    echo "Uso:"
    echo "  $0 ficheroBase espacioMB salida.csv"
    echo "  $0 -help"
    echo
    echo "Ejemplo:"
    echo "  $0 base.txt 100 salida.csv"
}`
  },
  {
    title: "3. Control de root",
    goal: "Impedir que el script se ejecute sin permisos de administrador.",
    theory: "En GNU/Linux, root tiene UID 0. El comando id -u devuelve el UID del usuario actual.",
    examTip: "No lo dejes para el final: si el enunciado exige root, es una de las primeras funciones.",
    code: `comprobar_root() {
    if [ "$(id -u)" -ne 0 ]; then
        echo "ERROR: Este script solo puede ejecutarlo root."
        log_msg "ERROR: intento de ejecucion sin root"
        exit 1
    fi
}`
  },
  {
    title: "4. Validar parametros",
    goal: "Comprobar -help, numero de parametros, nombres vacios y limite numerico.",
    theory: "$# cuenta argumentos. $1, $2 y $3 contienen los parametros. grep -Eq permite validar que el limite sea entero.",
    examTip: "Muchos scripts suspenden por funcionar solo con el caso perfecto. Tu script debe fallar bien.",
    code: `validar_parametros() {
    if [ "$1" = "-help" ]; then
        mostrar_ayuda
        exit 0
    fi

    if [ $# -ne 3 ]; then
        echo "ERROR: numero de parametros incorrecto."
        mostrar_ayuda
        log_msg "ERROR: numero de parametros incorrecto"
        exit 1
    fi

    FICHERO_BASE="$1"
    LIMITE_MB="$2"
    SALIDA_CSV="$3"

    if [ -z "$FICHERO_BASE" ] || [ -z "$SALIDA_CSV" ]; then
        echo "ERROR: fichero base y CSV no pueden estar vacios."
        log_msg "ERROR: parametro vacio"
        exit 1
    fi

    if ! echo "$LIMITE_MB" | grep -Eq '^[0-9]+$'; then
        echo "ERROR: el segundo parametro debe ser numerico."
        log_msg "ERROR: limite no numerico: $LIMITE_MB"
        exit 1
    fi
}`
  },
  {
    title: "5. Preparar el CSV",
    goal: "Crear la cabecera y preguntar antes de sobrescribir.",
    theory: "El enunciado pide CSV con Usuario, UID y Espacio(MB). Si el fichero existe, hay que preguntar.",
    examTip: "La cabecera exacta evita perder puntos tontos en la evidencia final.",
    code: `preparar_csv() {
    if [ -f "$SALIDA_CSV" ]; then
        echo -n "El fichero $SALIDA_CSV ya existe. Deseas sobrescribirlo? (s/n): "
        read RESPUESTA
        if [ "$RESPUESTA" != "s" ] && [ "$RESPUESTA" != "S" ]; then
            echo "Operacion cancelada."
            log_msg "Cancelada sobrescritura de $SALIDA_CSV"
            exit 0
        fi
    fi

    echo "Usuario,UID,Espacio(MB)" > "$SALIDA_CSV"
}`
  },
  {
    title: "6. Recorrer /etc/passwd con awk",
    goal: "Seleccionar usuarios cuyo UID sea mayor que 500.",
    theory: "/etc/passwd usa campos separados por dos puntos. El tercer campo es UID y el sexto suele ser HOME.",
    examTip: "El enunciado dice ayuda del comando awk: usalo de forma visible.",
    code: `procesar_usuarios() {
    LINEAS_PROCESADAS=0
    USUARIOS_LISTADOS=0

    while IFS=: read -r USUARIO _ ID_USUARIO _ _ HOME_USUARIO _; do
        LINEAS_PROCESADAS=$((LINEAS_PROCESADAS + 1))
        echo "Procesando $USUARIO con UID $ID_USUARIO"
    done < <(awk -F: '$3>500 {print $0}' /etc/passwd)
}`
  },
  {
    title: "7. Comprobar /home y medir con du",
    goal: "Filtrar homes reales en /home y calcular espacio en MB.",
    theory: "du -sm devuelve el espacio en MB. cut -f1 extrae solo el numero. Los errores de du van al log con 2>>.",
    examTip: "Comillas siempre: \"$HOME_USUARIO\" evita errores si una ruta contiene espacios.",
    code: `if [[ "$HOME_USUARIO" == /home/* ]] && [ -d "$HOME_USUARIO" ]; then
    ESPACIO_MB=$(du -sm "$HOME_USUARIO" 2>>"$LOGFILE" | cut -f1)

    if [ -z "$ESPACIO_MB" ]; then
        log_msg "ERROR: no se pudo calcular espacio para $USUARIO"
        continue
    fi
else
    log_msg "AVISO: usuario omitido por no tener home en /home: $USUARIO"
    continue
fi`
  },
  {
    title: "8. Comparar y exportar",
    goal: "Escribir en CSV solo los usuarios que superan el limite.",
    theory: "-gt compara enteros. Cada fila CSV debe respetar el orden Usuario, UID, Espacio(MB).",
    examTip: "No listes todos los usuarios: solo los que cumplen la condicion del enunciado.",
    code: `if [ "$ESPACIO_MB" -gt "$LIMITE_MB" ]; then
    echo "$USUARIO,$ID_USUARIO,$ESPACIO_MB" >> "$SALIDA_CSV"
    USUARIOS_LISTADOS=$((USUARIOS_LISTADOS + 1))
fi`
  },
  {
    title: "9. Resumen y programa principal",
    goal: "Mostrar y registrar el resumen final, y llamar funciones en orden.",
    theory: "El corrector espera total de lineas procesadas y usuarios listados tanto en pantalla como en historial.log.",
    examTip: "El programa principal debe leerse como una receta: permisos, parametros, salida y procesamiento.",
    code: `echo "Total lineas procesadas: $LINEAS_PROCESADAS"
echo "Usuarios listados: $USUARIOS_LISTADOS"
log_msg "Total lineas procesadas: $LINEAS_PROCESADAS"
log_msg "Usuarios listados: $USUARIOS_LISTADOS"

comprobar_root
validar_parametros "$@"
preparar_csv
procesar_usuarios`
  },
  {
    title: "10. Pruebas para la entrega",
    goal: "Preparar evidencias reales para no perder puntos en documentacion.",
    theory: "Haz capturas de -help, error sin root, CSV generado, historial.log y ejecucion completa con usuarios UID > 500.",
    examTip: "Si no hay evidencias reales, el script puede estar bien y aun asi perder mucha nota.",
    code: `# Pruebas recomendadas:
# ./apartado4a.sh -help
# ./apartado4a.sh base.txt cien salida.csv
# sudo ./apartado4a.sh base.txt 100 salida.csv
# cat salida.csv
# tail historial.log`
  }
];

const fullScript = `#!/bin/bash

LOGFILE="historial.log"

log_msg() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOGFILE"
}

mostrar_ayuda() {
    echo "Uso:"
    echo "  $0 ficheroBase espacioMB salida.csv"
    echo "  $0 -help"
    echo
    echo "Ejemplo:"
    echo "  $0 base.txt 100 salida.csv"
}

comprobar_root() {
    if [ "$(id -u)" -ne 0 ]; then
        echo "ERROR: Este script solo puede ejecutarlo root."
        log_msg "ERROR: intento de ejecucion sin root"
        exit 1
    fi
}

validar_parametros() {
    if [ "$1" = "-help" ]; then
        mostrar_ayuda
        exit 0
    fi

    if [ $# -ne 3 ]; then
        echo "ERROR: numero de parametros incorrecto."
        mostrar_ayuda
        log_msg "ERROR: numero de parametros incorrecto"
        exit 1
    fi

    FICHERO_BASE="$1"
    LIMITE_MB="$2"
    SALIDA_CSV="$3"

    if [ -z "$FICHERO_BASE" ] || [ -z "$SALIDA_CSV" ]; then
        echo "ERROR: fichero base y CSV no pueden estar vacios."
        log_msg "ERROR: parametro vacio"
        exit 1
    fi

    if ! echo "$LIMITE_MB" | grep -Eq '^[0-9]+$'; then
        echo "ERROR: el segundo parametro debe ser numerico."
        log_msg "ERROR: limite no numerico: $LIMITE_MB"
        exit 1
    fi
}

preparar_csv() {
    if [ -f "$SALIDA_CSV" ]; then
        echo -n "El fichero $SALIDA_CSV ya existe. Deseas sobrescribirlo? (s/n): "
        read RESPUESTA
        if [ "$RESPUESTA" != "s" ] && [ "$RESPUESTA" != "S" ]; then
            echo "Operacion cancelada."
            log_msg "Cancelada sobrescritura de $SALIDA_CSV"
            exit 0
        fi
    fi

    echo "Usuario,UID,Espacio(MB)" > "$SALIDA_CSV"
}

procesar_usuarios() {
    LINEAS_PROCESADAS=0
    USUARIOS_LISTADOS=0

    while IFS=: read -r USUARIO _ ID_USUARIO _ _ HOME_USUARIO _; do
        LINEAS_PROCESADAS=$((LINEAS_PROCESADAS + 1))

        if [[ "$HOME_USUARIO" == /home/* ]] && [ -d "$HOME_USUARIO" ]; then
            ESPACIO_MB=$(du -sm "$HOME_USUARIO" 2>>"$LOGFILE" | cut -f1)

            if [ -z "$ESPACIO_MB" ]; then
                log_msg "ERROR: no se pudo calcular espacio para $USUARIO"
                continue
            fi

            if [ "$ESPACIO_MB" -gt "$LIMITE_MB" ]; then
                echo "$USUARIO,$ID_USUARIO,$ESPACIO_MB" >> "$SALIDA_CSV"
                USUARIOS_LISTADOS=$((USUARIOS_LISTADOS + 1))
            fi
        else
            log_msg "AVISO: usuario omitido por no tener home en /home: $USUARIO"
        fi
    done < <(awk -F: '$3>500 {print $0}' /etc/passwd)

    echo "Total lineas procesadas: $LINEAS_PROCESADAS"
    echo "Usuarios listados: $USUARIOS_LISTADOS"
    log_msg "Total lineas procesadas: $LINEAS_PROCESADAS"
    log_msg "Usuarios listados: $USUARIOS_LISTADOS"
}

comprobar_root
validar_parametros "$@"
preparar_csv
procesar_usuarios`;

const lessons = [
  {
    id: "enunciado",
    title: "Leer el enunciado",
    xp: 20,
    desc: "Aprende a convertir ASO06 en requisitos tecnicos antes de escribir codigo.",
    challenges: [
      {
        type: "quiz",
        prompt: "Que tres parametros recibe el script de la opcion 4a?",
        options: ["ficheroBase, espacioMB y salida.csv", "usuario, grupo y clave", "IP, puerto y servicio"],
        answer: 0,
        explain: "El enunciado pide fichero base, limite numerico en MB y CSV de salida."
      },
      {
        type: "quiz",
        prompt: "Que usuarios hay que recorrer?",
        options: ["Usuarios con UID mayor de 500", "Solo root", "Todos los procesos activos"],
        answer: 0,
        explain: "El filtro central del ejercicio es UID > 500 usando awk."
      }
    ]
  },
  {
    id: "estructura",
    title: "Estructura del script",
    xp: 25,
    desc: "Shebang, funciones, programa principal, variables y comentarios utiles.",
    challenges: [
      {
        type: "fill",
        prompt: "Completa el shebang habitual para Bash.",
        before: "",
        after: "",
        answer: "#!/bin/bash",
        explain: "El shebang indica que el script se ejecuta con Bash."
      },
      {
        type: "order",
        prompt: "Ordena el programa principal.",
        pieces: ["comprobar_root", "validar_parametros \"$@\"", "preparar_csv", "procesar_usuarios"],
        answer: ["comprobar_root", "validar_parametros \"$@\"", "preparar_csv", "procesar_usuarios"],
        explain: "Primero permisos, luego parametros, despues salida y al final procesamiento."
      }
    ]
  },
  {
    id: "parametros",
    title: "Parametros y errores",
    xp: 25,
    desc: "Uso de $0, $1, $#, validacion numerica, -help y salida controlada.",
    challenges: [
      {
        type: "quiz",
        prompt: "En Bash, que contiene $#?",
        options: ["El numero de parametros recibidos", "El nombre del script", "El ultimo codigo de salida"],
        answer: 0,
        explain: "$# guarda cuantos argumentos ha recibido el script."
      },
      {
        type: "fill",
        prompt: "Completa la condicion para exigir exactamente 3 parametros.",
        before: "if [ ",
        after: " ]; then",
        answer: "$# -ne 3",
        explain: "-ne significa distinto de. Si no hay 3 parametros, muestras ayuda y sales."
      }
    ]
  },
  {
    id: "awk",
    title: "awk y /etc/passwd",
    xp: 30,
    desc: "Filtra usuarios por UID y separa campos con dos puntos.",
    challenges: [
      {
        type: "fill",
        prompt: "Completa el filtro awk que selecciona usuarios con UID mayor de 500.",
        before: "awk -F: '",
        after: " {print $0}' /etc/passwd",
        answer: "$3>500",
        explain: "En /etc/passwd el tercer campo es el UID."
      },
      {
        type: "quiz",
        prompt: "Que significa IFS=: en el while?",
        options: ["Leer campos separados por dos puntos", "Ejecutar como root", "Crear un CSV"],
        answer: 0,
        explain: "IFS define el separador que read usa para repartir campos."
      }
    ]
  },
  {
    id: "du-csv-log",
    title: "du, CSV y log",
    xp: 35,
    desc: "Calcula espacio, exporta resultados y registra errores con fecha.",
    challenges: [
      {
        type: "quiz",
        prompt: "Que consigue 2>>historial.log?",
        code: "du -sm \"$HOME_USUARIO\" 2>>\"$LOGFILE\"",
        options: ["Anade errores al log", "Borra el log", "Muestra solo el CSV"],
        answer: 0,
        explain: "El descriptor 2 es stderr y >> anade sin sobrescribir."
      },
      {
        type: "quiz",
        prompt: "Que cabecera debe tener el CSV?",
        options: ["Usuario,UID,Espacio(MB)", "Nombre,Grupo,Fecha", "Home,Shell,Password"],
        answer: 0,
        explain: "Esa cabecera coincide con la rubrica del apartado 4a."
      }
    ]
  },
  {
    id: "entrega",
    title: "Entrega y defensa",
    xp: 45,
    desc: "Prepara pruebas, capturas y explicacion para demostrar que lo entiendes.",
    challenges: [
      {
        type: "order",
        prompt: "Ordena las pruebas recomendadas.",
        pieces: ["./apartado4a.sh -help", "sudo ./apartado4a.sh base.txt 100 salida.csv", "cat salida.csv", "tail historial.log"],
        answer: ["./apartado4a.sh -help", "sudo ./apartado4a.sh base.txt 100 salida.csv", "cat salida.csv", "tail historial.log"],
        explain: "Primero ayuda, luego ejecucion real, despues evidencia CSV y log."
      },
      {
        type: "quiz",
        prompt: "Que debes poder explicar si te preguntan en el examen?",
        options: ["Por que cada funcion existe y que requisito cubre", "Solo como cambiar colores", "Nada si el script ejecuta"],
        answer: 0,
        explain: "Aprobar no es copiar: es justificar estructura, comandos y validaciones."
      }
    ]
  }
];

const examChecks = [
  { label: "Shebang Bash", points: 1, test: (text) => /^#!\/bin\/bash/m.test(text), hint: "Empieza con #!/bin/bash." },
  { label: "Ayuda -help", points: 1, test: (text) => /-help/.test(text) && /mostrar_ayuda|Uso:/.test(text), hint: "Incluye funcion de ayuda y caso -help." },
  { label: "Control de root", points: 1, test: (text) => /id -u/.test(text) && /-ne 0/.test(text), hint: "Comprueba id -u distinto de 0." },
  { label: "Tres parametros", points: 1, test: (text) => /\$#\s+-ne\s+3/.test(text), hint: "Valida que $# sea exactamente 3." },
  { label: "Limite numerico", points: 1, test: (text) => /grep\s+-Eq\s+'?\^?\[0-9\]\+\$?'?/.test(text) || /\[\[.*[0-9].*\]\]/s.test(text), hint: "Comprueba que el limite en MB sea un entero." },
  { label: "CSV correcto", points: 1, test: (text) => /Usuario,UID,Espacio\(MB\)/.test(text) && />>\s*"?\$SALIDA_CSV"?/.test(text), hint: "Crea cabecera y anade filas al CSV." },
  { label: "awk UID > 500", points: 1, test: (text) => /awk\b/.test(text) && /\$3\s*>\s*500/.test(text), hint: "Usa awk -F: '$3>500 ...' /etc/passwd." },
  { label: "Home en /home", points: 1, test: (text) => /\/home\/\*/.test(text) && /\[ -d/.test(text), hint: "Filtra homes bajo /home y comprueba que existan." },
  { label: "du -sm y errores al log", points: 1, test: (text) => /du\s+-sm/.test(text) && /2>>\s*"?\$LOGFILE"?/.test(text), hint: "Calcula MB con du -sm y manda stderr al log." },
  { label: "Resumen final en log", points: 1, test: (text) => /Total lineas procesadas/.test(text) && /Usuarios listados/.test(text) && /log_msg/.test(text), hint: "Muestra y registra lineas procesadas y usuarios listados." }
];

const tips = [
  "Primero entiende el enunciado; despues escribe codigo.",
  "Cada funcion debe cubrir un requisito de la tarea.",
  "stderr es el canal 2: perfecto para mandar errores al log.",
  "awk brilla cuando el dato esta en campos separados.",
  "En el examen, saber explicar vale casi tanto como ejecutar."
];

const defaultState = {
  xp: 0,
  hearts: 5,
  streak: 0,
  completed: [],
  completedChallenges: {},
  activeLesson: "enunciado",
  activeScriptStep: 0,
  attempts: 0,
  correct: 0,
  dailyXp: 0,
  lastDay: "",
  history: []
};

let state = loadState();
let currentLessonId = state.activeLesson || lessons[0].id;
let currentChallengeIndex = 0;
let selectedAnswer = null;
let orderedPieces = [];
let challengeAnswered = false;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  const saved = localStorage.getItem("duBashState");
  let parsed = { ...defaultState };
  try {
    parsed = saved ? JSON.parse(saved) : { ...defaultState };
  } catch {
    localStorage.removeItem("duBashState");
  }
  const merged = { ...defaultState, ...parsed };
  merged.completedChallenges = merged.completedChallenges || {};
  merged.completed.forEach((lessonId) => {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return;
    lesson.challenges.forEach((_, index) => {
      merged.completedChallenges[challengeKey(lesson.id, index)] = true;
    });
  });
  merged.completed = lessons
    .filter((lesson) => lesson.challenges.every((_, index) => merged.completedChallenges[challengeKey(lesson.id, index)]))
    .map((lesson) => lesson.id);
  if (merged.lastDay !== todayKey()) {
    merged.dailyXp = 0;
    merged.hearts = 5;
    merged.lastDay = todayKey();
  }
  return merged;
}

function saveState() {
  localStorage.setItem("duBashState", JSON.stringify(state));
}

function getLesson(id) {
  return lessons.find((lesson) => lesson.id === id) || lessons[0];
}

function isUnlocked(index) {
  if (index === 0) return true;
  return state.completed.includes(lessons[index - 1].id);
}

function challengeKey(lessonId, challengeIndex) {
  return `${lessonId}:${challengeIndex}`;
}

function lessonProgress(lesson) {
  const solved = lesson.challenges.filter((_, index) => state.completedChallenges[challengeKey(lesson.id, index)]).length;
  return { solved, total: lesson.challenges.length };
}

function routeTo(route) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
  document.querySelector(`#view${route[0].toUpperCase()}${route.slice(1)}`).classList.add("active-view");
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.route === route));
  const titles = {
    inicio: "Aprende Bash jugando",
    guia: "Guia paso a paso",
    ruta: "Ruta de aprendizaje",
    practica: "Practica",
    examen: "Simulador de examen",
    resultados: "Resultados"
  };
  document.querySelector("#pageTitle").textContent = titles[route];
  if (route === "guia") renderScriptGuide();
  if (route === "practica") renderChallenge();
  if (route === "examen") renderExam();
  if (route === "resultados") renderResults();
}

function renderAll() {
  renderStats();
  renderHome();
  renderPath();
  renderPracticeList();
  renderScriptGuide();
  renderExam();
  renderResults();
}

function renderStats() {
  document.querySelector("#xpTotal").textContent = state.xp;
  document.querySelector("#streakCount").textContent = state.streak;
  document.querySelector("#heartCount").textContent = state.hearts;
  document.querySelector("#dailyXp").textContent = state.dailyXp;
  document.querySelector("#dailyProgress").style.width = `${Math.min(100, (state.dailyXp / 50) * 100)}%`;
  document.querySelector("#goalState").textContent = state.dailyXp >= 50 ? "Completado" : "En marcha";
  const league = getLeague();
  document.querySelector("#leagueName").textContent = league.name;
  document.querySelector("#leagueProgress").style.width = `${league.progress}%`;
}

function getLeague() {
  const tiers = [
    { name: "Bronce", min: 0, max: 120 },
    { name: "Plata", min: 120, max: 280 },
    { name: "Oro", min: 280, max: 520 },
    { name: "Terminal Pro", min: 520, max: 900 }
  ];
  const tier = tiers.find((item) => state.xp >= item.min && state.xp < item.max) || tiers[tiers.length - 1];
  const progress = Math.min(100, Math.round(((state.xp - tier.min) / (tier.max - tier.min)) * 100));
  return { ...tier, progress };
}

function renderHome() {
  const next = scriptSteps[Math.min(state.activeScriptStep || 0, scriptSteps.length - 1)];
  document.querySelector("#nextLessonName").textContent = next.title.replace(/^\d+\.\s*/, "");
  document.querySelector("#nextLessonDesc").textContent = next.goal;
  document.querySelector("#dailyTip").textContent = tips[new Date().getDate() % tips.length];
  const badges = [];
  if ((state.activeScriptStep || 0) >= 3) badges.push("Arquitecto de script");
  if (state.completed.length > 0) badges.push("Primer modulo");
  if (state.streak >= 3) badges.push("Racha 3");
  if (state.xp >= 120) badges.push("Liga Plata");
  if (state.correct >= 10) badges.push("Depurador");
  if (!badges.length) badges.push("Empieza la guia");
  document.querySelector("#badges").innerHTML = badges.map((badge) => `<span class="badge">${badge}</span>`).join("");
}

function renderScriptGuide() {
  const stepIndex = Math.min(state.activeScriptStep || 0, scriptSteps.length - 1);
  const step = scriptSteps[stepIndex];
  document.querySelector("#scriptStepList").innerHTML = scriptSteps
    .map((item, index) => `
      <button class="step-pick ${index === stepIndex ? "active" : ""}" data-step="${index}" type="button">
        <span>${index + 1}</span>
        ${item.title.replace(/^\d+\.\s*/, "")}
      </button>
    `)
    .join("");

  document.querySelector("#scriptStepDetail").innerHTML = `
    <p class="eyebrow">Paso ${stepIndex + 1} de ${scriptSteps.length}</p>
    <h2>${step.title}</h2>
    <p>${step.goal}</p>
    <div class="teacher-note">
      <strong>Por que importa</strong>
      <span>${step.theory}</span>
    </div>
    <div class="teacher-note">
      <strong>Tip de examen</strong>
      <span>${step.examTip}</span>
    </div>
    <div class="challenge-actions">
      <button class="secondary-btn" data-prev-step type="button">Anterior</button>
      <button class="primary-btn" data-next-step type="button">${stepIndex === scriptSteps.length - 1 ? "Ir al simulador" : "Siguiente paso"}</button>
    </div>
  `;

  const script = buildScriptUntil(stepIndex);
  document.querySelector("#scriptBuildCode").textContent = script || "# En este paso todavia no escribimos codigo: primero entendemos el problema.";
  document.querySelector("#rubricStrip").innerHTML = examChecks
    .map((check) => `<span class="rubric-pill ${check.test(script) ? "done" : ""}">${check.label}</span>`)
    .join("");
}

function buildScriptUntil(stepIndex) {
  if (stepIndex >= scriptSteps.length - 1) return fullScript;
  const fragments = scriptSteps.slice(0, stepIndex + 1).map((step) => step.code).filter(Boolean);
  return fragments.join("\n\n");
}

function renderPath() {
  document.querySelector("#lessonPath").innerHTML = lessons
    .map((lesson, index) => {
      const done = state.completed.includes(lesson.id);
      const locked = !isUnlocked(index);
      const progress = lessonProgress(lesson);
      return `
        <article class="lesson-card ${locked ? "locked" : ""}">
          <div class="node">${done ? "OK" : index + 1}</div>
          <div>
            <h3>${lesson.title}</h3>
            <p>${lesson.desc}</p>
            <small>${progress.solved}/${progress.total} retos resueltos</small>
          </div>
          <button class="${locked ? "secondary-btn" : "primary-btn"}" data-lesson="${lesson.id}" ${locked ? "disabled" : ""} type="button">
            ${done ? "Repasar" : locked ? "Bloqueado" : "Empezar"}
          </button>
        </article>
      `;
    })
    .join("");
}

function renderPracticeList() {
  document.querySelector("#practiceLessonList").innerHTML = lessons
    .map((lesson, index) => {
      const locked = !isUnlocked(index);
      return `
        <button class="lesson-pick ${lesson.id === currentLessonId ? "active" : ""}" data-pick="${lesson.id}" ${locked ? "disabled" : ""} type="button">
          ${lesson.title}
        </button>
      `;
    })
    .join("");
}

function renderChallenge() {
  selectedAnswer = null;
  orderedPieces = [];
  challengeAnswered = false;
  const lesson = getLesson(currentLessonId);
  const challenge = lesson.challenges[currentChallengeIndex % lesson.challenges.length];
  const alreadySolved = Boolean(state.completedChallenges[challengeKey(lesson.id, currentChallengeIndex % lesson.challenges.length)]);
  const typeLabel = challenge.type === "quiz" ? "Elige una respuesta" : challenge.type === "fill" ? "Completa el comando" : "Ordena las piezas";

  document.querySelector("#challengeCard").innerHTML = `
    <div class="challenge-top">
      <div>
        <span class="label">${lesson.title} - ${typeLabel}</span>
        <h2>${challenge.prompt}</h2>
      </div>
      <span class="badge">${alreadySolved ? "Repaso" : `+${lesson.xp} XP`}</span>
    </div>
    ${challenge.code ? `<code class="code-block">${escapeHtml(challenge.code)}</code>` : ""}
    ${renderChallengeBody(challenge)}
    <div class="feedback" id="feedback">${alreadySolved ? "Ya resolviste este reto. Puedes repasarlo sin gastar vidas ni sumar XP." : "Resuelve el reto para que el pinguino compile tu progreso."}</div>
    <div class="challenge-actions">
      <button class="primary-btn" id="checkAnswer" type="button">Comprobar</button>
      <button class="secondary-btn" id="nextChallenge" type="button">Siguiente reto</button>
    </div>
  `;
}

function renderChallengeBody(challenge) {
  if (challenge.type === "quiz") {
    return `<div class="answers">${challenge.options.map((option, index) => `<button class="answer-btn" data-answer="${index}" type="button">${escapeHtml(option)}</button>`).join("")}</div>`;
  }
  if (challenge.type === "fill") {
    return `
      <div class="fill-row">
        <code>${escapeHtml(challenge.before)}</code>
        <input class="fill-input" id="fillInput" autocomplete="off" spellcheck="false" aria-label="Respuesta" />
        <code>${escapeHtml(challenge.after)}</code>
      </div>
    `;
  }
  return `
    <div class="ordered" id="orderedPieces" aria-label="Piezas ordenadas"></div>
    <div class="chips">
      ${shuffle(challenge.pieces).map((piece) => `<button class="chip-btn" data-piece="${escapeHtml(piece)}" type="button">${escapeHtml(piece)}</button>`).join("")}
    </div>
  `;
}

function renderOrderAreas(challenge) {
  const ordered = document.querySelector("#orderedPieces");
  if (!ordered) return;
  ordered.innerHTML = orderedPieces.map((piece) => `<button class="chip-btn" data-remove-piece="${escapeHtml(piece)}" type="button">${escapeHtml(piece)}</button>`).join("");
  const used = {};
  orderedPieces.forEach((piece) => {
    used[piece] = (used[piece] || 0) + 1;
  });
  const remaining = challenge.pieces.filter((piece) => {
    if (used[piece]) {
      used[piece] -= 1;
      return false;
    }
    return true;
  });
  document.querySelector(".chips").innerHTML = remaining.map((piece) => `<button class="chip-btn" data-piece="${escapeHtml(piece)}" type="button">${escapeHtml(piece)}</button>`).join("");
}

function checkAnswer() {
  if (challengeAnswered) return;
  const lesson = getLesson(currentLessonId);
  const challenge = lesson.challenges[currentChallengeIndex % lesson.challenges.length];
  const currentKey = challengeKey(lesson.id, currentChallengeIndex % lesson.challenges.length);
  const wasAlreadySolved = Boolean(state.completedChallenges[currentKey]);
  let ok = false;
  let ready = true;

  if (challenge.type === "quiz") {
    ready = selectedAnswer !== null;
    ok = Number(selectedAnswer) === challenge.answer;
    document.querySelectorAll(".answer-btn").forEach((btn) => {
      const isCorrect = Number(btn.dataset.answer) === challenge.answer;
      btn.classList.toggle("correct", isCorrect);
      btn.classList.toggle("wrong", btn.classList.contains("selected") && !isCorrect);
    });
  }
  if (challenge.type === "fill") {
    const value = document.querySelector("#fillInput").value.trim().replace(/\s+/g, " ");
    ready = value.length > 0;
    ok = value === challenge.answer;
  }
  if (challenge.type === "order") {
    ready = orderedPieces.length === challenge.answer.length;
    ok = orderedPieces.join(" ") === challenge.answer.join(" ");
  }
  if (!ready) {
    const feedback = document.querySelector("#feedback");
    feedback.className = "feedback bad";
    feedback.textContent = "Completa el reto antes de comprobar. Aqui se compila con pruebas, no con fe.";
    return;
  }
  challengeAnswered = true;
  state.attempts += 1;
  if (ok) {
    state.correct += 1;
    if (!wasAlreadySolved) awardXp(lesson.xp, lesson, challenge, currentKey);
  } else if (!wasAlreadySolved) {
    state.streak = 0;
    state.hearts = Math.max(0, state.hearts - 1);
    if (state.hearts === 0) {
      state.hearts = 5;
      showToast("Vidas recargadas. Repite con calma y vuelve a compilar.");
    }
  }
  const feedback = document.querySelector("#feedback");
  feedback.className = `feedback ${ok ? "good" : "bad"}`;
  feedback.textContent = `${ok ? "Correcto." : "Todavia no."} ${challenge.explain}${wasAlreadySolved && ok ? " Reto ya puntuado anteriormente." : ""}`;
  document.querySelector("#checkAnswer").disabled = true;
  saveState();
  renderAll();
}

function awardXp(amount, lesson, challenge, currentKey) {
  state.completedChallenges[currentKey] = true;
  state.xp += amount;
  state.dailyXp += amount;
  state.streak += 1;
  const progress = lessonProgress(lesson);
  if (progress.solved === progress.total && !state.completed.includes(lesson.id)) state.completed.push(lesson.id);
  state.history.unshift({
    lesson: lesson.title,
    challenge: challenge.prompt,
    xp: amount,
    date: new Date().toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })
  });
  state.history = state.history.slice(0, 6);
  showToast(`+${amount} XP en ${lesson.title}`);
}

function nextChallenge() {
  const lesson = getLesson(currentLessonId);
  currentChallengeIndex = (currentChallengeIndex + 1) % lesson.challenges.length;
  renderChallenge();
}

function renderExam() {
  const editor = document.querySelector("#examEditor");
  if (editor && !editor.value.trim()) editor.value = buildScriptUntil(state.activeScriptStep || 0);
  analyzeScriptDraft(false);
}

function analyzeScriptDraft(showToastOnPass = true) {
  const editor = document.querySelector("#examEditor");
  const text = editor?.value || "";
  let score = 0;
  const results = examChecks.map((check) => {
    const ok = check.test(text);
    if (ok) score += check.points;
    return { ...check, ok };
  });
  document.querySelector("#examScore").textContent = `${score}/10`;
  document.querySelector("#examScore").className = score >= 8 ? "score-ok" : score >= 5 ? "score-mid" : "score-low";
  document.querySelector("#examChecks").innerHTML = results
    .map((item) => `
      <div class="exam-check ${item.ok ? "ok" : ""}">
        <strong>${item.ok ? "OK" : "Falta"} - ${item.label}</strong>
        <span>${item.ok ? "Cubierto en tu script." : item.hint}</span>
      </div>
    `)
    .join("");
  if (showToastOnPass) showToast(score >= 8 ? "Muy buena pinta. Ahora toca probarlo en Linux real." : "Buen borrador: revisa los puntos marcados.");
}

function renderResults() {
  const league = getLeague();
  const accuracy = state.attempts ? Math.round((state.correct / state.attempts) * 100) : 0;
  document.querySelector("#levelName").textContent = league.name;
  document.querySelector("#levelDetail").textContent = `${state.xp} XP acumulados. Progreso de examen: paso ${(state.activeScriptStep || 0) + 1}/${scriptSteps.length}.`;
  document.querySelector("#accuracy").textContent = `${accuracy}%`;
  document.querySelector("#completedLessons").textContent = `${state.completed.length}/${lessons.length}`;
  document.querySelector("#historyList").innerHTML = state.history.length
    ? state.history.map((item) => `<div class="history-item"><div><strong>${item.lesson}</strong><br><span>${item.challenge}</span></div><div><strong>+${item.xp} XP</strong><br><span>${item.date}</span></div></div>`).join("")
    : `<p class="label">Aun no hay sesiones. Completa un reto y aparecera aqui.</p>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

document.addEventListener("click", (event) => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) routeTo(routeButton.dataset.route);

  const startNext = event.target.closest("[data-start-next]");
  if (startNext) {
    const next = lessons.find((lesson) => !state.completed.includes(lesson.id)) || lessons[0];
    currentLessonId = next.id;
    state.activeLesson = next.id;
    currentChallengeIndex = 0;
    saveState();
    routeTo("practica");
  }

  const stepButton = event.target.closest("[data-step]");
  if (stepButton) {
    state.activeScriptStep = Number(stepButton.dataset.step);
    saveState();
    renderAll();
  }

  if (event.target.closest("[data-prev-step]")) {
    state.activeScriptStep = Math.max(0, (state.activeScriptStep || 0) - 1);
    saveState();
    renderAll();
  }

  if (event.target.closest("[data-next-step]")) {
    if ((state.activeScriptStep || 0) >= scriptSteps.length - 1) {
      routeTo("examen");
    } else {
      state.activeScriptStep = Math.min(scriptSteps.length - 1, (state.activeScriptStep || 0) + 1);
      state.xp += 5;
      state.dailyXp += 5;
      saveState();
      renderAll();
    }
  }

  if (event.target.closest("[data-copy-script]")) {
    document.querySelector("#examEditor").value = buildScriptUntil(state.activeScriptStep || 0);
    routeTo("examen");
    showToast("Script copiado al simulador.");
  }

  const lessonButton = event.target.closest("[data-lesson]");
  if (lessonButton && !lessonButton.disabled) {
    currentLessonId = lessonButton.dataset.lesson;
    state.activeLesson = currentLessonId;
    currentChallengeIndex = 0;
    saveState();
    renderPracticeList();
    routeTo("practica");
  }

  const pickButton = event.target.closest("[data-pick]");
  if (pickButton && !pickButton.disabled) {
    currentLessonId = pickButton.dataset.pick;
    state.activeLesson = currentLessonId;
    currentChallengeIndex = 0;
    saveState();
    renderPracticeList();
    renderChallenge();
  }

  const answerButton = event.target.closest("[data-answer]");
  if (answerButton) {
    selectedAnswer = answerButton.dataset.answer;
    document.querySelectorAll(".answer-btn").forEach((btn) => btn.classList.remove("selected"));
    answerButton.classList.add("selected");
  }

  const pieceButton = event.target.closest("[data-piece]");
  if (pieceButton) {
    const lesson = getLesson(currentLessonId);
    const challenge = lesson.challenges[currentChallengeIndex % lesson.challenges.length];
    orderedPieces.push(pieceButton.dataset.piece);
    renderOrderAreas(challenge);
  }

  const removePiece = event.target.closest("[data-remove-piece]");
  if (removePiece) {
    const value = removePiece.dataset.removePiece;
    const removeAt = orderedPieces.indexOf(value);
    if (removeAt >= 0) orderedPieces.splice(removeAt, 1);
    const lesson = getLesson(currentLessonId);
    const challenge = lesson.challenges[currentChallengeIndex % lesson.challenges.length];
    renderOrderAreas(challenge);
  }

  if (event.target.closest("#checkAnswer")) checkAnswer();
  if (event.target.closest("#nextChallenge")) nextChallenge();
  if (event.target.closest("[data-analyze-script]")) analyzeScriptDraft();

  if (event.target.closest("[data-load-skeleton]")) {
    document.querySelector("#examEditor").value = fullScript;
    analyzeScriptDraft(false);
    showToast("Plantilla completa cargada.");
  }

  if (event.target.closest("[data-reset]")) {
    state = { ...defaultState, lastDay: todayKey() };
    currentLessonId = "enunciado";
    currentChallengeIndex = 0;
    saveState();
    renderAll();
    showToast("Progreso reiniciado.");
  }
});

renderAll();
