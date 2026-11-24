// ============================================================
// VARIABLES GLOBALES
// ============================================================
let origenSeleccionado = "Lima (Óvalo Infantas)";
let destinoSeleccionado = "Churín";
let fechaSeleccionada = new Date();
let horarioSeleccionado = null;

let salidasLimaChurin = []; // Se llenará desde el JSON

const ocupadosRetornoChurinLima = [3, 8, 11];
let asientosOcupados = [...ocupadosRetornoChurinLima];
let asientosElegidos = [];

const DURACION_TEMPORIZADOR_SEG = 5 * 60;
let segundosRestantes = DURACION_TEMPORIZADOR_SEG;
let intervaloTemporizador = null;
let seleccionExpirada = false;

const filasSalonH350 = [
    [3, 4, null, 5],
    [6, 7, null, 8],
    [9, 10, null, 11],
    [12, 13, null, 14],
    [15, 16, 17, 18]
];

let slideActual = 0;
const totalSlides = 2;
const titulosSlides = ["Nuestra Flota: Hyundai H350", "Nuestra Flota: DFSK Glory 580"];

// ============================================================
// CARGA DINÁMICA DE DATOS (JSON)
// ============================================================
async function cargarHorarios() {
    try {
        const respuesta = await fetch('./data/horarios.json');
        if (!respuesta.ok) throw new Error("Error al cargar JSON");
        salidasLimaChurin = await respuesta.json();
    } catch (error) {
        console.warn("Fallo al cargar horarios.json. Usando datos de respaldo.", error);
        // Respaldo en caso de que falle el fetch (ej. abriendo el HTML directamente sin servidor)
        salidasLimaChurin = [
            { id: 1, turno: "Primera salida", hora: "6:00 AM", servicio: "TURÍSTICO", terminal: "ÓVALO INFANTAS", ocupados: [4, 7, 12] },
            { id: 2, turno: "Segunda salida", hora: "9:00 AM", servicio: "TURÍSTICO", terminal: "ÓVALO INFANTAS", ocupados: [2, 5, 9, 14] },
            { id: 3, turno: "Tercera salida", hora: "12:00 M", servicio: "TURÍSTICO", terminal: "ÓVALO INFANTAS", ocupados: [1, 6, 11] },
            { id: 4, turno: "Cuarta salida", hora: "3:00 PM", servicio: "TURÍSTICO", terminal: "ÓVALO INFANTAS", ocupados: [3, 8] },
            { id: 5, turno: "Quinta salida", hora: "5:00 PM", servicio: "TURÍSTICO", terminal: "ÓVALO INFANTAS", ocupados: [10, 15, 16] }
        ];
    }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar datos del JSON
    await cargarHorarios();

    // 2. Recuperar datos de LocalStorage (Memoria)
    const origenGuardado = localStorage.getItem('mt_origen');
    const destinoGuardado = localStorage.getItem('mt_destino');
    
    if (origenGuardado) {
        origenSeleccionado = origenGuardado;
        document.getElementById('txtOrigen').innerText = origenGuardado;
    }
    if (destinoGuardado) {
        destinoSeleccionado = destinoGuardado;
        document.getElementById('txtDestino').innerText = destinoGuardado;
    }

    // 3. Inicializar UI
    const hoy = new Date();
    setFechaSeleccionada(hoy);
    renderCalendario();
    renderMapaAsientos();
    actualizarVistaTemporizador();
    actualizarEstadoBotonSiguiente();
    
    // 4. Inicializar Hero Carrusel
    initHeroCarousel();
});

// ============================================================
// LÓGICA DEL CARRUSEL PRINCIPAL (HERO SECTION)
// ============================================================
function initHeroCarousel() {
    const heroTrack = document.getElementById('heroTrack');
    if (!heroTrack) return;

    const heroSlides = heroTrack.querySelectorAll('.snap-center');
    if (heroSlides.length === 0) return;
    
    let currentHeroSlide = 0;
    let heroInterval;

    function nextHeroSlide() {
        currentHeroSlide = (currentHeroSlide + 1) % heroSlides.length;
        const scrollAmount = heroSlides[currentHeroSlide].offsetLeft;
        heroTrack.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }

    heroInterval = setInterval(nextHeroSlide, 3500);

    heroTrack.addEventListener('mouseenter', () => clearInterval(heroInterval));
    heroTrack.addEventListener('mouseleave', () => {
        clearInterval(heroInterval);
        heroInterval = setInterval(nextHeroSlide, 3500);
    });

    heroTrack.addEventListener('touchstart', () => clearInterval(heroInterval));
    heroTrack.addEventListener('touchend', () => {
        clearInterval(heroInterval);
        heroInterval = setInterval(nextHeroSlide, 3500);
    });
}

// ============================================================
// LÓGICA DEL CARRUSEL DE FLOTA
// ============================================================
function moverCarrusel(direccion) {
    slideActual = (slideActual + direccion + totalSlides) % totalSlides;
    const track = document.getElementById('carruselTrack');
    track.style.transform = `translateX(-${slideActual * 50}%)`;
    document.getElementById('tituloUnidad').innerText = titulosSlides[slideActual];
}

// ============================================================
// LÓGICA DE SELECCIÓN Y DROPDOWNS
// ============================================================
function toggleDropdown(id) {
    document.querySelectorAll('[id^="dropdown"]').forEach(el => {
        if(el.id !== id) el.classList.add('hidden');
    });
    document.getElementById(id).classList.toggle('hidden');
}

function limpiarFlujoSeleccion() {
    horarioSeleccionado = null;
    asientosElegidos = [];
    seleccionExpirada = false;
    detenerYReiniciarTemporizador();
    document.getElementById('seccionHorarios').classList.add('hidden');
    document.getElementById('seccionMapaAsientos').classList.add('hidden');
    ocultarResumenReserva();
}

function seleccionarOrigen(valor) {
    origenSeleccionado = valor;
    document.getElementById('txtOrigen').innerText = valor;
    document.getElementById('dropdownOrigen').classList.add('hidden');
    localStorage.setItem('mt_origen', valor); // Guardar en memoria
    verificarRestriccionRuta();
    limpiarFlujoSeleccion();
}

function seleccionarDestino(valor) {
    destinoSeleccionado = valor;
    document.getElementById('txtDestino').innerText = valor;
    document.getElementById('dropdownDestino').classList.add('hidden');
    localStorage.setItem('mt_destino', valor); // Guardar en memoria
    verificarRestriccionRuta();
    limpiarFlujoSeleccion();
}

function verificarRestriccionRuta() {
    const alerta = document.getElementById('alertaError');
    if (origenSeleccionado === destinoSeleccionado) {
        alerta.classList.remove('hidden');
        return false;
    } else {
        alerta.classList.add('hidden');
        return true;
    }
}

function esRutaLimaAChurin() {
    return origenSeleccionado === "Lima (Óvalo Infantas)" && destinoSeleccionado === "Churín";
}

window.onclick = function(event) {
    if (!event.target.closest('.relative')) {
        document.querySelectorAll('[id^="dropdown"]').forEach(el => {
            el.classList.add('hidden');
        });
    }
}

// ============================================================
// LÓGICA DEL CALENDARIO
// ============================================================
function setFechaRelativa(dias) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    setFechaSeleccionada(d);
    document.getElementById('dropdownFecha').classList.add('hidden');
    limpiarFlujoSeleccion();
}

let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();

function setFechaSeleccionada(date) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (date < hoy) return;

    fechaSeleccionada = date;
    const opciones = { day: 'numeric', month: 'short', year: 'numeric' };
    document.getElementById('txtFecha').innerText = date.toLocaleDateString('es-ES', opciones);

    const manana = new Date();
    manana.setDate(hoy.getDate() + 1);

    const btnHoy = document.getElementById('btnHoy');
    const btnManana = document.getElementById('btnManana');

    if(date.toDateString() === hoy.toDateString()) {
        btnHoy.className = "text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 transition";
        btnManana.className = "text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition";
    } else if(date.toDateString() === manana.toDateString()) {
        btnHoy.className = "text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition";
        btnManana.className = "text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 transition";
    } else {
        btnHoy.className = "text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition";
        btnManana.className = "text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition";
    }
}

function cambiarMes(dir) {
    mesActual += dir;
    if(mesActual > 11) { mesActual = 0; anioActual++; }
    if(mesActual < 0) { mesActual = 11; anioActual--; }
    renderCalendario();
}

function renderCalendario() {
    const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('mesAnioLabel').innerText = `${mesesNombres[mesActual]} de ${anioActual}`;

    const primerDiaIndex = new Date(anioActual, mesActual, 1).getDay();
    const totalDiasMes = new Date(anioActual, mesActual + 1, 0).getDate();
    const totalDiasMesAnterior = new Date(anioActual, mesActual, 0).getDate();

    let html = '';
    for(let i = primerDiaIndex; i > 0; i--) {
        const dia = totalDiasMesAnterior - i + 1;
        html += `<div class="py-2 text-slate-300 font-normal">${dia}</div>`;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for(let i = 1; i <= totalDiasMes; i++) {
        const d = new Date(anioActual, mesActual, i);
        d.setHours(0, 0, 0, 0);

        const esPasado = d < hoy;
        const esHoy = d.getTime() === hoy.getTime();
        const fechaRef = new Date(fechaSeleccionada);
        fechaRef.setHours(0,0,0,0);
        const esSeleccionado = d.getTime() === fechaRef.getTime();

        let classes = "py-2 rounded-xl transition font-bold ";
        if (esPasado) {
            classes += "text-slate-300 cursor-not-allowed line-through";
            html += `<div class="${classes}">${i}</div>`;
        } else {
            classes += "cursor-pointer ";
            if(esSeleccionado) {
                classes += "bg-slate-900 text-white shadow-md";
            } else if(esHoy) {
                classes += "border border-slate-900 text-slate-900 hover:bg-slate-100";
            } else {
                classes += "hover:bg-slate-100 text-slate-700";
            }
            html += `<div onclick="seleccionarFechaDia(${anioActual}, ${mesActual}, ${i})" class="${classes}">${i}</div>`;
        }
    }
    document.getElementById('calendarioDias').innerHTML = html;
}

function seleccionarFechaDia(anio, mes, dia) {
    const nuevaFecha = new Date(anio, mes, dia);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (nuevaFecha < hoy) return;

    setFechaSeleccionada(nuevaFecha);
    document.getElementById('dropdownFecha').classList.add('hidden');
    limpiarFlujoSeleccion();
}

// ============================================================
// BÚSQUEDA DE SALIDAS Y TARJETAS
// ============================================================
function buscarHorariosDisponibles() {
    if (!verificarRestriccionRuta()) return;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fechaSeleccionada < hoy) {
        alert('No se pueden seleccionar fechas anteriores a hoy.');
        return;
    }

    obtenerCantidadRequerida();

    const btn = document.getElementById('btnBuscarSalidas');
    const textoOriginal = btn.innerHTML;
    
    // Mostrar Spinner
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-emerald-400 text-sm"></i><span>Buscando...</span>';
    btn.disabled = true;

    // Simulamos retardo para UX
    setTimeout(() => {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;

        if (esRutaLimaAChurin()) {
            document.getElementById('seccionMapaAsientos').classList.add('hidden');
            ocultarResumenReserva();
            renderTarjetasHorarios();
            const secHorarios = document.getElementById('seccionHorarios');
            secHorarios.classList.remove('hidden');
            secHorarios.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            document.getElementById('seccionHorarios').classList.add('hidden');
            horarioSeleccionado = null;
            asientosOcupados = [...ocupadosRetornoChurinLima];
            asientosElegidos = [];
            seleccionExpirada = false;
            detenerYReiniciarTemporizador();
            ocultarResumenReserva();

            document.getElementById('subtituloUnidadHorario').innerText = `Hyundai H350 • ${origenSeleccionado} ➔ ${destinoSeleccionado}`;

            const seccion = document.getElementById('seccionMapaAsientos');
            seccion.classList.remove('hidden');
            ocultarAlertaAsientos();
            renderMapaAsientos();
            actualizarVistaTemporizador();
            actualizarEstadoBotonSiguiente();
            seccion.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 800);
}

function renderTarjetasHorarios() {
    const contenedor = document.getElementById('listaTarjetasHorarios');
    contenedor.innerHTML = '';

    salidasLimaChurin.forEach(salida => {
        const disponibles = 18 - salida.ocupados.length;
        const esActiva = horarioSeleccionado && horarioSeleccionado.id === salida.id;

        const card = document.createElement('div');
        card.className = `bg-white rounded-2xl border ${esActiva ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'} p-3.5 sm:px-5 sm:py-4 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-3`;

        card.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-800">
                    <img src="assets/img/manantialtours_logo.jpg" alt="Manantial" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" loading="lazy">
                    <span class="hidden text-xs font-extrabold">M</span>
                </div>
                <div>
                    <span class="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">${salida.turno}</span>
                    <span class="text-xs sm:text-sm font-extrabold text-slate-900">MANANTIAL TOURS</span>
                </div>
            </div>

            <div class="grid grid-cols-3 sm:flex sm:items-center gap-3 sm:gap-6 text-center">
                <div>
                    <span class="block text-[10px] font-bold text-slate-400 uppercase">Servicio</span>
                    <span class="text-xs font-extrabold text-slate-700">${salida.servicio}</span>
                </div>
                <div>
                    <span class="block text-[10px] font-bold text-slate-400 uppercase">Salida</span>
                    <span class="text-xs sm:text-sm font-extrabold text-slate-900">${salida.hora}</span>
                </div>
                <div>
                    <span class="block text-[10px] font-bold text-slate-400 uppercase">Asientos disp.</span>
                    <span class="text-xs sm:text-sm font-extrabold text-emerald-700">${disponibles}</span>
                </div>
            </div>

            <button type="button" onclick="seleccionarHorarioYVerAsientos(${salida.id})" class="${esActiva ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'} text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 flex-shrink-0">
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
                <span>Ver asientos</span>
            </button>
        `;
        contenedor.appendChild(card);
    });
}

function seleccionarHorarioYVerAsientos(salidaId) {
    if (!esRutaLimaAChurin()) return;

    const salida = salidasLimaChurin.find(s => s.id === salidaId);
    if (!salida) return;

    const requeridos = obtenerCantidadRequerida();
    const disponibles = 18 - salida.ocupados.length;

    if (requeridos > disponibles) {
        alert(`Esta salida de las ${salida.hora} solo tiene ${disponibles} asiento(s) disponible(s). Reduce la cantidad de pasajeros o elige otro horario.`);
        return;
    }

    horarioSeleccionado = salida;
    asientosOcupados = [...salida.ocupados];
    asientosElegidos = [];
    seleccionExpirada = false;
    detenerYReiniciarTemporizador();
    ocultarResumenReserva();

    renderTarjetasHorarios();
    document.getElementById('subtituloUnidadHorario').innerText = `Hyundai H350 • ${salida.turno} (${salida.hora})`;

    const seccion = document.getElementById('seccionMapaAsientos');
    seccion.classList.remove('hidden');
    ocultarAlertaAsientos();
    renderMapaAsientos();
    actualizarVistaTemporizador();
    actualizarEstadoBotonSiguiente();
    seccion.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================================
// TEMPORIZADOR Y ESTADO DE BOTONES
// ============================================================
function formatearTiempo(seg) {
    const minutos = Math.floor(seg / 60);
    const segundos = seg % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

function actualizarVistaTemporizador() {
    const texto = document.getElementById('temporizadorTexto');
    const caja = document.getElementById('cajaTemporizador');
    if (!texto || !caja) return;

    texto.innerText = formatearTiempo(segundosRestantes);

    if (seleccionExpirada) {
        caja.className = "flex items-center space-x-1.5 sm:space-x-2 bg-red-50 border border-red-200 text-red-800 px-2.5 sm:px-3 py-1.5 rounded-xl";
    } else if (segundosRestantes <= 60 && asientosElegidos.length > 0) {
        caja.className = "flex items-center space-x-1.5 sm:space-x-2 bg-rose-50 border border-rose-300 text-rose-800 px-2.5 sm:px-3 py-1.5 rounded-xl animate-pulse";
    } else {
        caja.className = "flex items-center space-x-1.5 sm:space-x-2 bg-amber-50 border border-amber-200 text-amber-900 px-2.5 sm:px-3 py-1.5 rounded-xl";
    }
}

function iniciarTemporizadorSiAplica() {
    if (intervaloTemporizador !== null) return;

    seleccionExpirada = false;
    if (segundosRestantes <= 0) {
        segundosRestantes = DURACION_TEMPORIZADOR_SEG;
    }
    actualizarVistaTemporizador();

    intervaloTemporizador = setInterval(() => {
        segundosRestantes--;
        actualizarVistaTemporizador();
        if (segundosRestantes <= 0) {
            manejarExpiracionTemporizador();
        }
    }, 1000);
}

function detenerYReiniciarTemporizador() {
    if (intervaloTemporizador !== null) {
        clearInterval(intervaloTemporizador);
        intervaloTemporizador = null;
    }
    segundosRestantes = DURACION_TEMPORIZADOR_SEG;
    actualizarVistaTemporizador();
}

function manejarExpiracionTemporizador() {
    if (intervaloTemporizador !== null) {
        clearInterval(intervaloTemporizador);
        intervaloTemporizador = null;
    }
    segundosRestantes = 0;
    seleccionExpirada = true;
    asientosElegidos = [];

    ocultarResumenReserva();
    renderMapaAsientos();
    actualizarVistaTemporizador();
    actualizarEstadoBotonSiguiente();
    mostrarAlertaAsientos("El tiempo de 5 minutos para completar tu selección ha terminado. Tus asientos se liberaron; vuelve a seleccionar tus asientos para continuar.");
    document.getElementById('seccionMapaAsientos').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function actualizarEstadoBotonSiguiente() {
    const btn = document.getElementById('btnSiguienteAsientos');
    if (!btn) return;

    if (seleccionExpirada) {
        btn.disabled = true;
        btn.className = "bg-slate-300 text-slate-500 font-extrabold py-3 px-6 rounded-2xl cursor-not-allowed flex items-center justify-center space-x-2 text-sm tracking-wide";
    } else {
        btn.disabled = false;
        btn.className = "bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 px-6 rounded-2xl shadow-md transition flex items-center justify-center space-x-2 text-sm tracking-wide";
    }
}

// ============================================================
// MAPA DE ASIENTOS
// ============================================================
function obtenerCantidadRequerida() {
    const input = document.getElementById('asientos');
    let val = parseInt(input.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 18) val = 18;
    input.value = val;
    return val;
}

function onCambioCantidadPasajeros() {
    const requeridos = obtenerCantidadRequerida();
    if (asientosElegidos.length > requeridos) {
        asientosElegidos = asientosElegidos.slice(0, requeridos);
    }
    if (asientosElegidos.length === 0) {
        detenerYReiniciarTemporizador();
    }
    ocultarAlertaAsientos();
    ocultarResumenReserva();
    renderMapaAsientos();
    actualizarEstadoBotonSiguiente();
}

function crearBotonAsiento(numero) {
    const estaOcupado = asientosOcupados.includes(numero);
    const estaElegido = asientosElegidos.includes(numero);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = numero;
    btn.setAttribute('aria-label', `Asiento ${numero}`);

    if (estaOcupado) {
        btn.className = 'seat-btn seat-occupied';
        btn.disabled = true;
        btn.title = `Asiento ${numero}: Ocupado`;
    } else if (estaElegido) {
        btn.className = 'seat-btn seat-selected';
        btn.title = `Asiento ${numero}: Elegido (clic para quitar)`;
        btn.onclick = () => toggleAsiento(numero);
    } else {
        btn.className = 'seat-btn seat-free';
        btn.title = `Asiento ${numero}: Libre`;
        btn.onclick = () => toggleAsiento(numero);
    }
    return btn;
}

function renderMapaAsientos() {
    const requeridos = obtenerCantidadRequerida();

    const slot1 = document.getElementById('seat-slot-1');
    const slot2 = document.getElementById('seat-slot-2');
    slot1.innerHTML = '';
    slot2.innerHTML = '';
    slot1.appendChild(crearBotonAsiento(1));
    slot2.appendChild(crearBotonAsiento(2));

    const salon = document.getElementById('salonPasajeros');
    salon.innerHTML = '';

    filasSalonH350.forEach(fila => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'grid grid-cols-4 gap-2 items-center';

        fila.forEach(numAsiento => {
            const cell = document.createElement('div');
            cell.className = 'flex justify-center';
            if (numAsiento !== null) {
                cell.appendChild(crearBotonAsiento(numAsiento));
            }
            rowDiv.appendChild(cell);
        });
        salon.appendChild(rowDiv);
    });

    document.getElementById('contadorElegidos').innerText = asientosElegidos.length;
    document.getElementById('contadorRequeridos').innerText = requeridos;

    const resumenTexto = document.getElementById('resumenAsientosTexto');
    if (asientosElegidos.length === 0) {
        resumenTexto.innerText = 'Ninguno aún';
    } else {
        const ordenados = [...asientosElegidos].sort((a, b) => a - b);
        resumenTexto.innerText = ordenados.map(n => `N° ${n}`).join(', ');
    }
}

function toggleAsiento(numero) {
    if (asientosOcupados.includes(numero)) return;

    const requeridos = obtenerCantidadRequerida();
    const indice = asientosElegidos.indexOf(numero);

    if (indice !== -1) {
        asientosElegidos.splice(indice, 1);
        if (asientosElegidos.length === 0) {
            seleccionExpirada = false;
            detenerYReiniciarTemporizador();
        }
        ocultarAlertaAsientos();
    } else {
        if (asientosElegidos.length >= requeridos) {
            mostrarAlertaAsientos(`Ya elegiste ${requeridos} asiento(s). Desmarca uno o aumenta la cantidad de pasajeros arriba.`);
            return;
        }
        const estabaVacio = asientosElegidos.length === 0;
        asientosElegidos.push(numero);
        seleccionExpirada = false;
        if (estabaVacio) {
            segundosRestantes = DURACION_TEMPORIZADOR_SEG;
            iniciarTemporizadorSiAplica();
        }
        ocultarAlertaAsientos();
    }
    ocultarResumenReserva();
    renderMapaAsientos();
    actualizarEstadoBotonSiguiente();
}

function mostrarAlertaAsientos(mensaje) {
    const box = document.getElementById('alertaAsientos');
    document.getElementById('textoAlertaAsientos').innerText = mensaje;
    box.classList.remove('hidden');
}

function ocultarAlertaAsientos() {
    document.getElementById('alertaAsientos').classList.add('hidden');
}

// ============================================================
// RESUMEN Y WHATSAPP
// ============================================================
function ocultarResumenReserva() {
    document.getElementById('seccionResumenReserva').classList.add('hidden');
    ocultarErrorContacto();
}

function mostrarErrorContacto(mensaje) {
    const box = document.getElementById('alertaContacto');
    document.getElementById('textoAlertaContacto').innerText = mensaje;
    box.classList.remove('hidden');
}

function ocultarErrorContacto() {
    document.getElementById('alertaContacto').classList.add('hidden');
}

function validarDatosContacto() {
    const dni = document.getElementById('contactoDni').value.trim();
    const edadRaw = document.getElementById('contactoEdad').value.trim();
    const edad = parseInt(edadRaw, 10);
    const nombre = document.getElementById('contactoNombre').value.trim();

    if (!dni || dni.length !== 8) {
        mostrarErrorContacto('Por favor, ingresa un DNI válido de 8 dígitos.');
        document.getElementById('contactoDni').focus();
        return null;
    }
    if (!edadRaw || isNaN(edad) || edad < 1 || edad > 120) {
        mostrarErrorContacto('Por favor, ingresa una edad válida.');
        document.getElementById('contactoEdad').focus();
        return null;
    }
    if (!nombre || nombre.length < 2) {
        mostrarErrorContacto('Por favor, ingresa el nombre de la persona de contacto.');
        document.getElementById('contactoNombre').focus();
        return null;
    }
    ocultarErrorContacto();
    return { dni, edad, nombre };
}

function volverAAsientos() {
    ocultarResumenReserva();
    document.getElementById('seccionMapaAsientos').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function mostrarResumenReserva() {
    if (seleccionExpirada) {
        mostrarAlertaAsientos("El tiempo expiró y los asientos se liberaron. Selecciona tus asientos nuevamente.");
        actualizarEstadoBotonSiguiente();
        return;
    }
    if (!verificarRestriccionRuta()) return;

    const requeridos = obtenerCantidadRequerida();
    if (asientosElegidos.length < requeridos) {
        const faltan = requeridos - asientosElegidos.length;
        mostrarAlertaAsientos(`Te falta elegir ${faltan} asiento(s) más para completar los ${requeridos} pasajero(s).`);
        return;
    }

    const asientosOrdenados = [...asientosElegidos].sort((a, b) => a - b);
    const fechaFormateada = fechaSeleccionada.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
    const detalleFechaHora = horarioSeleccionado
        ? `${fechaFormateada} • ${horarioSeleccionado.hora} (${horarioSeleccionado.turno})`
        : fechaFormateada;

    document.getElementById('resumenRuta').innerText = `${origenSeleccionado} ➔ ${destinoSeleccionado}`;
    document.getElementById('resumenFecha').innerText = detalleFechaHora;
    document.getElementById('resumenPasajeros').innerText = `${requeridos} pasajero(s)`;
    document.getElementById('resumenAsientosDetalle').innerText = asientosOrdenados.map(n => `Asiento ${n}`).join(', ');

    ocultarErrorContacto();
    const seccionResumen = document.getElementById('seccionResumenReserva');
    seccionResumen.classList.remove('hidden');
    seccionResumen.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function enviarResumenWhatsApp() {
    if (seleccionExpirada) {
        mostrarResumenReserva();
        return;
    }
    if (!verificarRestriccionRuta()) return;

    const requeridos = obtenerCantidadRequerida();
    if (asientosElegidos.length < requeridos) {
        mostrarResumenReserva();
        return;
    }

    const contacto = validarDatosContacto();
    if (!contacto) return;

    // Generar código único de reserva
    const codigoReserva = `MT-${Math.floor(1000 + Math.random() * 9000)}`;

    const asientosOrdenados = [...asientosElegidos].sort((a, b) => a - b);
    const listaAsientosTexto = asientosOrdenados.map(n => `Asiento ${n}`).join(', ');
    const fechaFormateada = fechaSeleccionada.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
    const lineaHorario = horarioSeleccionado
        ? `* Horario: ${horarioSeleccionado.hora} (${horarioSeleccionado.turno})\n`
        : '';

    const mensaje = `Hola, quisiera reservar pasajes en *Manantial Tours* con el siguiente detalle:\n\n` +
        `*Código de reserva:* ${codigoReserva}\n` +
        `* Ruta: ${origenSeleccionado} ➔ ${destinoSeleccionado}\n` +
        `* Fecha de viaje: ${fechaFormateada}\n` +
        lineaHorario +
        `* Pasajeros: ${requeridos}\n` +
        `* Asientos elegidos: ${listaAsientosTexto}\n\n` +
        `*Datos de contacto:*\n` +
        `- Nombre: ${contacto.nombre}\n` +
        `- DNI: ${contacto.dni}\n` +
        `- Edad: ${contacto.edad} años\n\n` +
        `Quedo atento a la confirmación y tarifa. ¡Gracias!`;
    
    const urlWhatsApp = `https://wa.me/51946704105?text=${encodeURIComponent(mensaje)}`;

    if (typeof gtag === 'function') {
        gtag('event', 'clic_cotizador_whatsapp', {
            'event_category': 'Conversión',
            'event_label': `${origenSeleccionado} a ${destinoSeleccionado} | ${horarioSeleccionado ? horarioSeleccionado.hora + ' | ' : ''}Asientos: ${asientosOrdenados.join(',')} (${fechaFormateada})`
        });
    }
    window.open(urlWhatsApp, '_blank');
}

// ============================================================
// PWA: REGISTRO DEL SERVICE WORKER
// ============================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => console.log('Service Worker registrado con éxito', registration))
            .catch(err => console.log('Error al registrar Service Worker', err));
    });
}