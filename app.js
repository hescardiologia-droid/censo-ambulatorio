/* App de estudios cardiológicos AMBULATORIOS — registro, censo, estadísticas, usuarios y médicos.
   Los datos de pacientes se piden al servidor en cada sesión y viven solo en memoria:
   no se guardan en el dispositivo. Lo único que se recuerda es la sesión (12 horas). */
(function () {
  'use strict';

  const CFG = window.APP_CONFIG || {};
  const $app = document.getElementById('app');
  const $capas = document.getElementById('capas');
  const LLAVE_TOKEN = 'cardio_ambulatorio_sesion';
  const DIAS_INICIALES = 90;
  const MAX_BYTES = 8 * 1024 * 1024;
  const LB_A_KG = 0.45359237;

  /* ---- Listas. Deben coincidir con backend/Code.gs ---- */
  const ESTUDIOS = ['Ecocardiograma', 'Ecocardiograma transesofágico', 'Monitoreo Holter', 'Prueba de esfuerzo',
    'Resonancia magnética cardíaca', 'Evaluación preoperatoria para trasplante renal', 'Interconsulta'];
  const CORTO = { 'Ecocardiograma': 'Eco', 'Ecocardiograma transesofágico': 'ETE', 'Monitoreo Holter': 'Holter', 'Prueba de esfuerzo': 'P. esfuerzo',
    'Resonancia magnética cardíaca': 'RM cardíaca', 'Evaluación preoperatoria para trasplante renal': 'Eval. preop. TR', 'Interconsulta': 'Interconsulta' };
  const PROCEDENCIAS = [
    'H.N. "Dr. Juan Jose Fernandez", Zacamil',
    'H.N. "Dr. Luis Edmundo Vasquez", Chalatenango',
    'H.N. Neumologico "Dr. Jose Saldaña"',
    'H.N. Psiquiatrico "Dr. Jose Molina", Soyapango',
    'H.N. "Enf. Angelica Vidal", Ilopango',
    'H.N. "Nuestra Sra de Fatima", Cojutepeque',
    'H.N. "Dr. Francisco Menéndez", Ahuachapan',
    'H.N. "Dr. Jorge Mazzini Villacorta", Sonsonate',
    'H.N. "San Juan de Dios", Santa Ana',
    'H.N. "Dr. Arturo Morales", Metapán, Santa Ana',
    'H.N. De Chalchuapa, Santa Ana',
    'H.N. "San Rafael", Santa Tecla, La Libertad',
    'H.N. Nueva Concepcion, Chalatenango',
    'H.N. De Niños "Benjamin Bloom"',
    'H.N. De La Mujer "Dra. Maria Isabel Rodriguez"',
    'H.N. De Suchitoto, Cuscatlan',
    'H.N. "Santa Gertrudis", San Vicente',
    'H.N. "Santa Teresa", Zacatecoluca, La Paz',
    'H.N. "San Jerónimo Emiliani" De Sensuntepeque, Cabañas',
    'H.N. "Dr. José Luís Saca", Ilobasco, Cabañas',
    'H.N. "San Pedro", Usulután',
    'H.N. De Jiquilisco, Usulutan',
    'H.N. "Dr. Jorge Arturo Mena", Santiago de María, Usulután',
    'H.N. "San Juan de Dios", San Miguel',
    'H.N. Nueva Guadalupe, San Miguel',
    'H.N. "Monseñor Oscar Arnulfo Romero y Galdámez", Ciudad Barrios, San Miguel',
    'H.N. "Dr. Héctor Antonio Hernández Flores", San Francisco Gotera, Morazán',
    'H.N. De La Union',
    'H.N. Santa Rosa De Lima, La Union',
    'H.N. Rosales',
    'Consulta externa de Cardiología',
    'Consulta externa de Hemato/Oncología',
    'Consulta externa de Infectología',
    'Paciente externo',
    'Despacho'
  ];
  const OTRO = 'Otro';
  const SEXOS = ['Femenino', 'Masculino'];
  /* Catálogo de hallazgos (de la pestaña "Base Datos" de la hoja anterior). Se puede escribir uno que no esté. */
  const HALLAZGOS = [
    ['General', ['Ecocardiograma normal']],
    ['Valvulopatías', ['Insuficiencia mitral leve', 'Insuficiencia mitral moderada', 'Insuficiencia mitral grave', 'Estenosis mitral leve',
      'Estenosis mitral moderada', 'Estenosis mitral grave', 'Prolapso de válvula mitral', 'Calcificación del anillo mitral', 'Estenosis aórtica leve',
      'Estenosis aórtica moderada', 'Estenosis aórtica grave', 'Insuficiencia aórtica leve', 'Insuficiencia aórtica moderada', 'Insuficiencia aórtica grave',
      'Válvula aórtica bicúspide', 'Insuficiencia tricuspídea leve', 'Insuficiencia tricuspídea moderada', 'Insuficiencia tricuspídea grave',
      'Estenosis tricuspídea leve', 'Estenosis tricuspídea moderada', 'Estenosis tricuspídea grave', 'Insuficiencia pulmonar leve',
      'Insuficiencia pulmonar moderada', 'Insuficiencia pulmonar grave', 'Estenosis pulmonar leve', 'Estenosis pulmonar moderada', 'Estenosis pulmonar grave']],
    ['Miocardiopatías', ['Cardiopatía isquémica (alteraciones segmentarias de la contractilidad)', 'Miocardiopatía chagásica', 'Aneurisma ventricular izquierdo',
      'Miocardiopatía dilatada', 'Miocardiopatía hipertrófica obstructiva', 'Miocardiopatía hipertrófica no obstructiva', 'Miocardiopatía restrictiva',
      'Miocardiopatía infiltrativa', 'Miocarditis', 'Miocardiopatía hipertensiva', 'Miocardiopatía urémica']],
    ['Pericardio', ['Derrame pericárdico leve', 'Derrame pericárdico moderado', 'Derrame pericárdico grave', 'Taponamiento cardíaco', 'Pericarditis constrictiva',
      'Engrosamiento pericárdico', 'Agenesia de pericardio', 'Grasa pericárdica']],
    ['Cavidades derechas y presión pulmonar', ['Dilatación de cavidades derechas', 'Probabilidad baja de hipertensión pulmonar',
      'Probabilidad intermedia de hipertensión pulmonar', 'Probabilidad alta de hipertensión pulmonar']],
    ['Defectos estructurales y congénitos', ['Comunicación interauricular (CIA)', 'Comunicación interventricular (CIV)', 'Persistencia del conducto arterioso (PCA)',
      'Foramen oval permeable (FOP)', 'Anomalía de Ebstein', 'Tetralogía de Fallot', 'Tetralogía de Fallot corregida', 'Trasposición de grandes arterias',
      'Canal auriculoventricular', 'Cardiopatía congénita compleja', 'Displasia de válvula mitral', 'Displasia de válvula aórtica', 'Displasia de válvula tricúspide',
      'Displasia de válvula pulmonar', 'Válvula mitral en hamaca', 'Válvula mitral en paracaídas']],
    ['Enfermedades de la aorta', ['Dilatación o aneurisma de aorta ascendente', 'Disección aórtica', 'Coartación de aorta', 'Ateromatosis aórtica']],
    ['Trombos, masas y vegetaciones', ['Trombo en aurícula izquierda o en orejuela', 'Trombo en aurícula derecha', 'Trombo ventricular izquierdo',
      'Trombo ventricular derecho', 'Endocarditis de válvula mitral', 'Endocarditis de válvula aórtica', 'Endocarditis de válvula tricúspide',
      'Endocarditis de válvula pulmonar', 'Absceso de válvula mitral', 'Absceso de válvula aórtica', 'Absceso de válvula tricúspide', 'Absceso de válvula pulmonar',
      'Tumor en válvula mitral', 'Tumor en válvula aórtica', 'Tumor en válvula tricúspide', 'Tumor en válvula pulmonar']]
  ];
  const GRUPO_DE_HALLAZGO = {};
  HALLAZGOS.forEach(function (g) { g[1].forEach(function (x) { GRUPO_DE_HALLAZGO[x] = g[0]; }); GRUPO_DE_HALLAZGO[g[0]] = g[0]; });
  const GRUPOS_EDAD = [['Menos de 1 año', 0, 0], ['1 – 9', 1, 9], ['10 – 19', 10, 19], ['20 – 29', 20, 29], ['30 – 39', 30, 39], ['40 – 49', 40, 49],
    ['50 – 59', 50, 59], ['60 – 69', 60, 69], ['70 – 79', 70, 79], ['80 o más', 80, 200]];
  const NOMBRES_DIA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  const S = {
    token: '', usuario: null, medicos: [], motivos: [], hoy: '', filas: new Map(), repetidos: new Set(),
    desde: '', sincronizado: '', cargando: false, errorCarga: '', ui: {}, reportes: new Map(), stats: null, usuarios: null,
    form: null, detalleAbierto: null, plantillas: [], estudiosConReporte: [], estadoReportes: null
  };

  /* ============================== utilidades ============================== */
  function h(tag, attrs) {
    const el = document.createElement(tag);
    const a = attrs || {};
    Object.keys(a).forEach(function (k) {
      const v = a[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
    for (let i = 2; i < arguments.length; i++) agregar(el, arguments[i]);
    return el;
  }
  function agregar(el, hijo) {
    if (hijo === null || hijo === undefined || hijo === false) return;
    if (Array.isArray(hijo)) hijo.forEach(function (x) { agregar(el, x); });
    else el.appendChild(hijo.nodeType ? hijo : document.createTextNode(String(hijo)));
  }
  /** <select> con opciones [valor, texto] o grupos {grupo, opciones}. */
  function selector(opciones, valor, attrs) {
    const s = h('select', attrs);
    const op = function (o) { return h('option', { value: o[0], selected: String(o[0]) === String(valor) }, o[1]); };
    opciones.forEach(function (o) {
      if (o.grupo) { if (o.opciones.length) s.appendChild(h('optgroup', { label: o.grupo }, o.opciones.map(op))); } else s.appendChild(op(o));
    });
    return s;
  }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function partes(iso) { const p = String(iso || '').slice(0, 10).split('-'); return [Number(p[0]), Number(p[1]), Number(p[2])]; }
  function diaSemana(iso) { const p = partes(iso); const d = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(); return d === 0 ? 7 : d; }
  function fechaLarga(iso) { const p = partes(iso); return NOMBRES_DIA[diaSemana(iso) - 1] + ' ' + p[2] + ' de ' + MESES[p[1] - 1] + ' de ' + p[0]; }
  function fechaCorta(iso) { const p = String(iso || '').slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; }
  function fechaMedia(iso) { const p = partes(iso); return iso ? String(p[2]).padStart(2, '0') + ' ' + MES_CORTO[p[1] - 1] + ' ' + p[0] : ''; }
  function fechaHora(fh) { return fh ? fechaCorta(fh) + ' ' + String(fh).slice(11, 16) : ''; }
  function sumarDias(iso, n) { const p = partes(iso); return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10); }
  function diasEntre(a, b) { const x = partes(a), y = partes(b); return Math.round((Date.UTC(y[0], y[1] - 1, y[2]) - Date.UTC(x[0], x[1] - 1, x[2])) / 86400000); }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  function procCorta(x) { return String(x || '').replace(/^H\.N\.\s*/, '').replace(/"/g, '').replace(/^Otro: /, ''); }
  function hoyLocal() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function hoy() { return S.hoy || hoyLocal(); }
  function guardarToken(t) { try { if (t) localStorage.setItem(LLAVE_TOKEN, t); else localStorage.removeItem(LLAVE_TOKEN); } catch (e) { /* sin almacenamiento */ } }
  function leerToken() { try { return localStorage.getItem(LLAVE_TOKEN) || ''; } catch (e) { return ''; } }
  function esAdmin() { return S.usuario && S.usuario.rol === 'admin'; }
  function uuid() { return window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12); }
  function tamano(bytes) { return bytes < 1048576 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB'; }

  async function api(action, datos) {
    if (!CFG.API_URL || /PEGAR_AQUI/.test(CFG.API_URL)) {
      const e0 = new Error('La app aún no está conectada. Falta pegar la dirección de la API en el archivo config.js.');
      e0.code = 'CONFIG';
      throw e0;
    }
    let res, j;
    try {
      res = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action: action, token: S.token }, datos || {})) });
      j = await res.json();
    } catch (e) {
      const e1 = new Error('No hay conexión con el servidor. Revise su internet e intente de nuevo.');
      e1.code = 'RED';
      throw e1;
    }
    if (!j.ok) {
      const e2 = new Error(j.error || 'Ocurrió un error.');
      e2.code = j.code;
      if (j.code === 'SESION' && S.token) { cerrarSesion(j.error); }
      if (j.code === 'CAMBIAR_CLAVE' && S.usuario) { S.usuario.debe_cambiar = true; pintar(); }
      throw e2;
    }
    return j.data;
  }

  /* ============================== avisos y modales ============================== */
  let tostadaActual = null;
  function tostada(texto, opciones) {
    const o = opciones || {};
    if (tostadaActual) tostadaActual.remove();
    const t = h('div', { class: 'tostada' + (o.error ? ' error' : ''), role: 'status' }, h('span', null, texto),
      o.accion ? h('button', { onclick: function () { t.remove(); o.accion.fn(); } }, o.accion.texto) : null);
    document.body.appendChild(t);
    tostadaActual = t;
    setTimeout(function () { t.remove(); }, o.accion ? 9000 : 4500);
  }
  function modalesAbiertos() { return $capas.children.length > 0; }
  function abrirModal(contenido, opciones) {
    const o = opciones || {};
    const velo = h('div', { class: 'velo', role: 'dialog', 'aria-modal': 'true' });
    let cerrado = false, preguntando = false;
    const cerrar = function () {
      if (cerrado) return;
      cerrado = true;
      velo.remove(); document.removeEventListener('keydown', tecla);
      if (!modalesAbiertos()) document.body.style.overflow = '';
      if (o.alCerrar) o.alCerrar();
    };
    // o.antesDeCerrar() puede devolver false (o una promesa) para que el modal siga abierto, p. ej. con un comentario sin guardar.
    const intentarCerrar = function () {
      if (!o.antesDeCerrar) { cerrar(); return; }
      if (preguntando || cerrado) return;
      preguntando = true;
      Promise.resolve(o.antesDeCerrar()).then(function (ok) { preguntando = false; if (ok) cerrar(); });
    };
    const tecla = function (ev) { if (ev.key === 'Escape' && $capas.lastChild === velo && !document.querySelector('.visor, .capa.editor, .espera')) intentarCerrar(); };
    velo.addEventListener('mousedown', function (ev) { if (ev.target === velo) intentarCerrar(); });
    document.addEventListener('keydown', tecla);
    velo.appendChild(typeof contenido === 'function' ? contenido(cerrar, intentarCerrar) : contenido);
    $capas.appendChild(velo);
    document.body.style.overflow = 'hidden';
    const foco = velo.querySelector('[data-foco]') || velo.querySelector('button, input, select');
    if (foco) foco.focus({ preventScroll: true });
    return cerrar;
  }
  function modalChico(titulo, cuerpo) {
    return abrirModal(function (cerrar) {
      return h('div', { class: 'modal chico' },
        h('div', { class: 'modal-cab' }, h('h2', { style: 'margin:0' }, titulo), h('button', { class: 'btn chico x', onclick: cerrar, 'aria-label': 'Cerrar' }, '✕')),
        h('div', { class: 'modal-cuerpo' }, cuerpo(cerrar)));
    });
  }
  /** Pregunta con dos botones. Devuelve una promesa con true (confirmar) o false. */
  function preguntar(titulo, texto, siTexto, noTexto, claseSi) {
    return new Promise(function (resolver) {
      let respondido = false;
      const fin = function (v, cerrar) { if (respondido) return; respondido = true; cerrar(); resolver(v); };
      abrirModal(function (cerrar) {
        return h('div', { class: 'modal chico' },
          h('div', { class: 'modal-cab' }, h('h2', { style: 'margin:0' }, titulo)),
          h('div', { class: 'modal-cuerpo' }, (Array.isArray(texto) ? texto : [texto]).map(function (x) { return h('p', { style: 'margin:0 0 10px' }, x); }),
            h('div', { style: 'display:grid;gap:10px;margin-top:16px' },
              h('button', { class: 'btn ' + (claseSi || 'primario'), onclick: function () { fin(true, cerrar); } }, siTexto),
              h('button', { class: 'btn', 'data-foco': true, onclick: function () { fin(false, cerrar); } }, noTexto))));
      }, { alCerrar: function () { if (!respondido) { respondido = true; resolver(false); } } });
    });
  }
  function cajaError() { return h('div', { role: 'alert' }); }
  function mostrarError(caja, e) { caja.textContent = ''; caja.appendChild(h('div', { class: 'aviso error' }, e.message || String(e))); }
  async function conBoton(btn, fn) {
    const texto = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Un momento…';
    try { return await fn(); } finally { btn.disabled = false; btn.textContent = texto; }
  }
  /** Capa de "espere" mientras se sube algo. Devuelve la función para quitarla. */
  function espera(texto) {
    const c = h('div', { class: 'espera', role: 'status' }, h('div', { class: 'caja' }, h('div', { class: 'giro' }), h('strong', null, texto),
      h('p', { style: 'margin:6px 0 0;color:#51606f;font-size:14px' }, 'No cierre esta pantalla.')));
    document.body.appendChild(c);
    return function () { c.remove(); };
  }

  /* ============================== sesión ============================== */
  function cerrarSesion(mensaje) {
    S.token = '';
    S.usuario = null;
    S.filas = new Map();
    S.reportes.forEach(function (a) { URL.revokeObjectURL(a.url); });
    S.reportes = new Map();
    S.stats = S.usuarios = S.form = S.estadoReportes = null;
    S.plantillas = [];
    S.sincronizado = '';
    S.desde = '';
    guardarToken('');
    $capas.textContent = '';
    document.body.style.overflow = '';
    pintarAcceso(mensaje);
  }

  function pintarAcceso(mensaje) {
    $app.textContent = '';
    const err = cajaError();
    const usuario = h('input', { id: 'in-usuario', type: 'text', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' });
    const clave = h('input', { id: 'in-clave', type: 'password', autocomplete: 'current-password' });
    const btn = h('button', { class: 'btn primario ancho', type: 'submit' }, 'Ingresar');
    $app.appendChild(h('div', { class: 'acceso' }, h('form', { class: 'caja', onsubmit: async function (ev) {
      ev.preventDefault();
      err.textContent = '';
      try {
        const r = await conBoton(btn, function () { return api('login', { usuario: usuario.value, clave: clave.value }); });
        S.token = r.token;
        S.usuario = r.usuario;
        guardarToken(r.token);
        await iniciar();
      } catch (e) { mostrarError(err, e); }
    } },
      h('img', { src: 'icons/icon-192.png', alt: '' }),
      h('h1', null, 'Estudios ambulatorios'),
      h('p', { class: 'sub' }, 'Servicio de Cardiología · registro y censo'),
      mensaje ? h('div', { class: 'aviso alerta' }, mensaje) : null,
      h('div', { class: 'campo' }, h('label', { for: 'in-usuario' }, 'Usuario'), usuario),
      h('div', { class: 'campo' }, h('label', { for: 'in-clave' }, 'Contraseña'), clave),
      err, btn,
      h('p', { style: 'color:#51606f;font-size:12.5px;text-align:center;margin:14px 0 0' }, 'Acceso exclusivo del personal autorizado. Toda acción queda registrada.'))));
    usuario.focus();
  }

  function formularioClave(alTerminar, obligado) {
    const err = cajaError();
    const actual = h('input', { id: 'cl-actual', type: 'password', autocomplete: 'current-password' });
    const nueva = h('input', { id: 'cl-nueva', type: 'password', autocomplete: 'new-password' });
    const repite = h('input', { id: 'cl-repite', type: 'password', autocomplete: 'new-password' });
    const btn = h('button', { class: 'btn primario ancho', type: 'submit' }, 'Guardar contraseña');
    return h('form', { onsubmit: async function (ev) {
      ev.preventDefault();
      err.textContent = '';
      if (nueva.value !== repite.value) { mostrarError(err, new Error('Las contraseñas nuevas no coinciden.')); return; }
      try {
        await conBoton(btn, function () { return api('clave.cambiar', { actual: actual.value, nueva: nueva.value }); });
        S.usuario.debe_cambiar = false;
        tostada('Contraseña actualizada.');
        alTerminar();
      } catch (e) { mostrarError(err, e); }
    } },
      obligado ? h('div', { class: 'aviso info' }, 'Por seguridad, debe crear su propia contraseña antes de continuar.') : null,
      h('div', { class: 'campo' }, h('label', { for: 'cl-actual' }, obligado ? 'Contraseña temporal' : 'Contraseña actual'), actual),
      h('div', { class: 'campo' }, h('label', { for: 'cl-nueva' }, 'Contraseña nueva (mínimo 8 caracteres)'), nueva),
      h('div', { class: 'campo' }, h('label', { for: 'cl-repite' }, 'Repita la contraseña nueva'), repite),
      err, btn);
  }

  function menuCuenta() {
    modalChico(S.usuario.nombre, function (cerrar) {
      return [h('p', { style: 'margin:0 0 14px;color:#51606f' }, 'Usuario: ' + S.usuario.usuario + ' · ' + (esAdmin() ? 'Administrador' : 'Usuario')),
        h('div', { style: 'display:grid;gap:10px' },
          h('button', { class: 'btn', onclick: function () { cerrar(); modalChico('Cambiar contraseña', function (c2) { return formularioClave(c2, false); }); } }, 'Cambiar contraseña'),
          h('button', { class: 'btn peligro', onclick: function () {
            if (S.form && S.form.sucio && !confirm('Hay un registro sin guardar. ¿Cerrar sesión de todos modos?')) return;
            cerrarSesion('Sesión cerrada.');
          } }, 'Cerrar sesión'))];
    });
  }

  /* ============================== datos ============================== */
  function aObjeto(cols, arr) {
    const o = {};
    cols.forEach(function (c, i) { o[c] = arr[i] === undefined ? '' : arr[i]; });
    o.edadN = o.edad === '' ? -1 : Number(o.edad);
    const r = String(o.reporte || '').split(' · ');
    o.repTipo = o.reporte ? r[0] : '';
    o.repFecha = o.reporte ? r[1] || '' : '';
    o.repUsuario = o.reporte ? r[2] || '' : '';
    o.busca = norm(o.nombre + ' ' + o.expediente + ' ' + o.procedencia + ' ' + o.id + ' ' + o.estudio + ' ' + o.hallazgos + ' ' + o.comentario);
    return o;
  }
  function integrarFila(cols, arr) { const o = aObjeto(cols, arr); S.filas.set(o.id, o); return o; }
  /** "Posible repetido": mismo expediente y mismo estudio con menos de 8 días de diferencia. */
  function recalcularRepetidos() {
    const grupos = {};
    S.filas.forEach(function (f) {
      if (!f.expediente || f.anulado) return;
      const k = norm(f.expediente).replace(/\s/g, '') + '|' + f.estudio;
      (grupos[k] = grupos[k] || []).push(f);
    });
    S.repetidos = new Set();
    Object.keys(grupos).forEach(function (k) {
      const g = grupos[k];
      if (g.length < 2) return;
      g.sort(function (a, b) { return cmp(a.fecha_estudio, b.fecha_estudio); });
      for (let i = 1; i < g.length; i++) {
        if (diasEntre(g[i - 1].fecha_estudio, g[i].fecha_estudio) <= 7) { S.repetidos.add(g[i - 1].id); S.repetidos.add(g[i].id); }
      }
    });
  }
  function integrar(r) {
    r.filas.forEach(function (arr) { integrarFila(r.columnas, arr); });
    if (r.fecha) S.hoy = r.fecha;
    recalcularRepetidos();
  }
  /** Aplica la fila que devuelve el servidor después de un cambio. */
  function aplicarFila(r) {
    const o = integrarFila(r.columnas, r.fila);
    recalcularRepetidos();
    return o;
  }
  async function aplicarInicio() {
    const r = await api('inicio');
    S.usuario = r.usuario;
    S.medicos = r.medicos;
    S.motivos = r.motivos_no;
    S.hoy = r.fecha;
    S.plantillas = r.plantillas || [];
    S.estudiosConReporte = r.estudios_con_reporte || [];
    return r;
  }
  /** Trae del servidor los últimos días. Lo más antiguo ya cargado se conserva. */
  async function sincronizar(silencioso) {
    if (S.cargando || !S.token) return;
    S.cargando = true;
    if (!silencioso) pintar();
    try {
      const ventana = sumarDias(hoy(), -DIAS_INICIALES);
      const r = await Promise.all([aplicarInicio(), api('registros.listar', { desde: ventana, hasta: '9999-12-31' })]);
      const antiguas = new Map();
      S.filas.forEach(function (f, id) { if (f.fecha_estudio < ventana) antiguas.set(id, f); });
      S.filas = antiguas;
      integrar(r[1]);
      if (!S.desde || ventana < S.desde) S.desde = ventana;
      S.sincronizado = r[1].hora;
      S.errorCarga = '';
    } catch (e) {
      if (e.code !== 'SESION') S.errorCarga = e.message;
    }
    S.cargando = false;
    if (S.token && !(silencioso && (modalesAbiertos() || escribiendo() || ruta()[0] === 'registro'))) pintar();
  }
  function escribiendo() {
    const a = document.activeElement;
    return a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && $app.contains(a);
  }
  async function cargarAntiguos(desde) {
    if (S.desde && desde >= S.desde) return;
    const r = await api('registros.listar', { desde: desde, hasta: S.desde ? sumarDias(S.desde, -1) : '9999-12-31' });
    integrar(r);
    S.desde = desde;
  }
  async function iniciar() {
    try {
      await aplicarInicio();
    } catch (e) {
      if (e.code !== 'SESION') pintarAcceso(e.message);
      return;
    }
    if (S.usuario.debe_cambiar) { pintar(); return; }
    pintar();
    await sincronizar();
  }
  function filasArr() { return Array.from(S.filas.values()); }
  function vigentes() { return filasArr().filter(function (f) { return !f.anulado; }); }

  /* ============================== marco general ============================== */
  function barra(titulo, sub, conVolver) {
    return h('header', { class: 'barra' }, h('div', { class: 'barra-int' },
      conVolver ? h('a', { class: 'btn-barra', href: '#/' }, '‹ Inicio') : h('img', { class: 'logo', src: 'icons/icon-192.png', alt: '' }),
      h('h1', null, titulo, sub ? h('small', null, sub) : null),
      h('button', { class: 'btn-barra no-imprimir', title: 'Actualizar datos', onclick: function () { S.stats = S.usuarios = S.estadoReportes = null; sincronizar(); } }, '↻', h('span', { class: 'txt' }, S.cargando ? ' Actualizando…' : ' Actualizar')),
      h('button', { class: 'btn-barra no-imprimir', onclick: menuCuenta, 'aria-label': 'Mi cuenta' }, S.usuario ? S.usuario.usuario : '')));
  }
  function ruta() { return location.hash.replace(/^#\/?/, '').split('/'); }

  function pintar() {
    if (!S.token || !S.usuario) { pintarAcceso(); return; }
    const y = window.scrollY;
    const activo = document.activeElement && $app.contains(document.activeElement) ? document.activeElement : null;
    const foco = activo && activo.id ? { id: activo.id, pos: activo.tagName === 'INPUT' && /^(text|search)$/.test(activo.type) ? activo.selectionStart : null } : null;
    $app.textContent = '';
    if (S.usuario.debe_cambiar) {
      $app.appendChild(h('div', { class: 'acceso' }, h('div', { class: 'caja' }, h('h1', { style: 'margin-bottom:14px' }, 'Cree su contraseña'),
        formularioClave(function () { iniciar(); }, true))));
      return;
    }
    const r = ruta();
    const main = h('main', { class: 'contenido' });
    let titulo = 'Estudios ambulatorios · Cardiología', sub = fechaLarga(hoy()), volver = true;
    if (S.errorCarga) main.appendChild(h('div', { class: 'aviso error', role: 'alert' }, S.errorCarga));
    if (r[0] === 'registro') { titulo = 'Registro'; sub = 'Nuevo registro de estudio'; main.classList.add('angosto'); vistaRegistro(main); }
    else if (r[0] === 'censo') { titulo = 'Censo'; sub = 'Estudios ambulatorios registrados'; vistaCenso(main); }
    else if (r[0] === 'estadisticas') { titulo = 'Estadísticas'; sub = ''; vistaEstadisticas(main); }
    else if (r[0] === 'admin' && esAdmin()) { titulo = 'Usuarios y médicos'; sub = ''; vistaAdmin(main); }
    else { volver = false; vistaInicio(main); }
    $app.appendChild(barra(titulo, sub, volver));
    $app.appendChild(main);
    window.scrollTo(0, y);
    if (foco) {
      const el = document.getElementById(foco.id);
      if (el) { el.focus({ preventScroll: true }); if (foco.pos !== null) { try { el.setSelectionRange(foco.pos, foco.pos); } catch (e) { /* no aplica */ } } }
    }
  }

  /* ============================== inicio ============================== */
  function vistaInicio(main) {
    const todas = vigentes();
    const deHoy = todas.filter(function (f) { return f.fecha_estudio === hoy(); });
    const desde30 = sumarDias(hoy(), -30);
    const recientes = todas.filter(function (f) { return f.fecha_estudio >= desde30 && f.fecha_estudio <= hoy(); });
    const sinMedico = recientes.filter(function (f) { return f.estado === 'PENDIENTE'; }).length;
    const sinReporte = recientes.filter(function (f) { return f.estado === 'REALIZADO' && !f.reporte; }).length;
    const nRevisar = todas.filter(porRevisar).length;
    const sinDatos = !S.sincronizado;
    const tarjeta = function (href, clase, ico, nombre, cifra, cifraNota, nota) {
      return h('a', { class: 'modulo ' + clase, href: href }, h('div', { class: 'ico', 'aria-hidden': 'true' }, ico), h('div', { class: 'nombre' }, nombre),
        cifra !== null ? h('div', { class: 'cifra' }, sinDatos ? '–' : cifra, h('small', null, cifraNota)) : null,
        nota ? h('div', { class: 'nota' }, sinDatos && cifra !== null ? '' : nota) : null);
    };
    agregar(main, [
      h('div', { class: 'saludo' }, h('h2', null, 'Hola, ' + S.usuario.nombre),
        h('span', null, S.sincronizado ? plural(deHoy.length, 'estudio registrado', 'estudios registrados') + ' hoy · actualizado a las ' + S.sincronizado : 'Cargando registros…')),
      nRevisar ? h('a', { class: 'aviso alerta aviso-enlace', id: 'aviso-revisar', href: '#/censo', onclick: function () {
        const u = uiCenso();
        Object.assign(u, { falta: 'revisar', q: '', estudio: '', proc: '', medico: '', reporte: '', anulados: false, rapido: '', desde: S.desde > '0000-01-01' ? S.desde : '', hasta: '' });
      } }, h('b', null, plural(nRevisar, 'reporte de ecocardiograma por revisar', 'reportes de ecocardiograma por revisar') + '.'),
        ' Se encontraron reportes en la carpeta del ecógrafo que podrían corresponder a estos pacientes, pero no coinciden todos los datos. Toque aquí para revisarlos.') : null,
      h('div', { class: 'modulos' },
        tarjeta('#/registro', 'principal', '+', 'Registro', null, '', 'Registrar un paciente y sus estudios'),
        tarjeta('#/censo', '', '≡', 'Censo', deHoy.length, deHoy.length === 1 ? 'estudio hoy' : 'estudios hoy',
          (sinMedico || sinReporte) ? 'Últimos 30 días: ' + sinMedico + ' sin médico · ' + sinReporte + ' sin reporte' : 'Últimos 30 días: todo completo'),
        tarjeta('#/estadisticas', '', '▤', 'Estadísticas', null, '', 'Por estudio, médico, edad, sexo, procedencia y hallazgos'),
        esAdmin() ? tarjeta('#/admin', '', '☰', 'Usuarios y médicos', null, '', 'Cuentas, médicos, plantillas de comentario y censo de reportes') : null),
      S.form && S.form.sucio && !S.form.enviado ? h('div', { class: 'aviso info' }, 'Tiene un registro sin guardar. ', h('a', { href: '#/registro' }, 'Volver al registro')) : null
    ]);
  }

  /* ============================== archivos y editor de imagen ============================== */
  function leerDataUrl(blob) {
    return new Promise(function (ok, mal) {
      const r = new FileReader();
      r.onload = function () { ok(String(r.result)); };
      r.onerror = function () { mal(new Error('No se pudo leer el archivo.')); };
      r.readAsDataURL(blob);
    });
  }
  function cargarImagen(url) {
    return new Promise(function (ok, mal) {
      const img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = function () { mal(new Error('No se pudo abrir la imagen. Pruebe con otra foto.')); };
      img.src = url;
    });
  }
  /** Valida el tipo y reduce las fotos grandes para que la subida sea rápida con mala conexión. */
  async function prepararArchivo(file) {
    const nombre = file.name || 'archivo';
    const ext = (nombre.split('.').pop() || '').toLowerCase();
    const esPdf = file.type === 'application/pdf' || ext === 'pdf';
    const esImg = /^image\/(jpeg|png)$/.test(file.type) || ['jpg', 'jpeg', 'png'].indexOf(ext) >= 0;
    if (!esPdf && !esImg) throw new Error('Formato no permitido. Use JPG, JPEG, PNG o PDF.');
    if (esPdf) {
      if (file.size > MAX_BYTES) throw new Error('El PDF pesa ' + tamano(file.size) + '. El máximo es 8 MB.');
      return { blob: file, nombre: nombre, vista: '' };
    }
    const url = URL.createObjectURL(file);
    let blob = file;
    try {
      const img = await cargarImagen(url);
      const LADO = 2400;
      const escala = Math.min(1, LADO / Math.max(img.naturalWidth, img.naturalHeight));
      if (escala < 1 || file.size > 900 * 1024) {
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.round(img.naturalWidth * escala);
        lienzo.height = Math.round(img.naturalHeight * escala);
        const g = lienzo.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, lienzo.width, lienzo.height);
        g.drawImage(img, 0, 0, lienzo.width, lienzo.height);
        const reducido = await new Promise(function (ok) { lienzo.toBlob(ok, 'image/jpeg', 0.88); });
        if (reducido && reducido.size < file.size) blob = reducido;
      }
    } finally {
      URL.revokeObjectURL(url);
    }
    if (blob.size > MAX_BYTES) throw new Error('La imagen pesa ' + tamano(blob.size) + '. El máximo es 8 MB.');
    // "original" se conserva para que cada edición parta de la foto sin pérdidas acumuladas.
    return { blob: blob, nombre: nombre, vista: await leerDataUrl(blob), original: blob, edicion: { giro: 0, recorte: null }, editada: false };
  }
  /** Abre el selector de archivos del sistema. Devuelve una promesa con el File o null. */
  function elegirArchivo() {
    return new Promise(function (ok) {
      const inp = h('input', { type: 'file', accept: '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf', style: 'position:fixed;left:-9999px' });
      inp.addEventListener('change', function () { const f = inp.files && inp.files[0]; inp.remove(); ok(f || null); });
      document.body.appendChild(inp);
      inp.click();
    });
  }

  const RECORTE_COMPLETO = { x: 0, y: 0, w: 1, h: 1 };
  const RECORTE_MIN = 0.08;
  function girarRecorte(r, sentido) {
    return sentido > 0 ? { x: 1 - (r.y + r.h), y: r.x, w: r.h, h: r.w } : { x: r.y, y: 1 - (r.x + r.w), w: r.h, h: r.w };
  }
  function dibujarGirada(g, img, giro, ancho, alto) {
    g.save();
    g.fillStyle = '#fff';
    g.fillRect(0, 0, ancho, alto);
    g.translate(ancho / 2, alto / 2);
    g.rotate(giro * Math.PI / 2);
    const impar = giro % 2 === 1;
    const w = impar ? alto : ancho, hh = impar ? ancho : alto;
    g.drawImage(img, -w / 2, -hh / 2, w, hh);
    g.restore();
  }
  /**
   * Editor de imagen: girar y recortar. Se abre solo después de cargar una imagen de reporte.
   * Devuelve una promesa con {blob, vista, edicion, editada} o null si se cancela.
   */
  function abrirEditor(arch, titulo) {
    return new Promise(async function (resolver) {
      const url = URL.createObjectURL(arch.original || arch.blob);
      let img;
      try { img = await cargarImagen(url); } catch (e) { URL.revokeObjectURL(url); tostada(e.message, { error: true }); resolver(null); return; }
      let giro = arch.edicion ? arch.edicion.giro : 0;
      let rec = Object.assign({}, (arch.edicion && arch.edicion.recorte) || RECORTE_COMPLETO);

      const lienzo = h('canvas', { class: 'ed-lienzo', 'aria-label': 'Imagen a editar' });
      const caja = h('div', { class: 'ed-recorte', 'data-modo': 'mover', 'aria-label': 'Área de recorte. Arrástrela para moverla.' },
        ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'].map(function (m) { return h('span', { class: 'ed-asa ed-' + m, 'data-modo': m }); }));
      const marco = h('div', { class: 'ed-marco' }, lienzo, caja);
      const escenario = h('div', { class: 'ed-escenario' }, marco);
      const capa = h('div', { class: 'capa editor', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo });

      const cerrar = function (valor) {
        window.removeEventListener('resize', dibujar);
        document.removeEventListener('keydown', tecla, true);
        URL.revokeObjectURL(url);
        capa.remove();
        if (!modalesAbiertos()) document.body.style.overflow = '';
        resolver(valor);
      };
      const tecla = function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); cerrar(null); } };

      function dibujar() {
        const impar = giro % 2 === 1;
        const rw = impar ? img.naturalHeight : img.naturalWidth, rh = impar ? img.naturalWidth : img.naturalHeight;
        const dispW = Math.max(120, escenario.clientWidth - 24), dispH = Math.max(120, escenario.clientHeight - 24);
        const k = Math.min(dispW / rw, dispH / rh);
        const w = Math.round(rw * k), hh = Math.round(rh * k);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        lienzo.width = Math.round(w * dpr);
        lienzo.height = Math.round(hh * dpr);
        marco.style.width = w + 'px';
        marco.style.height = hh + 'px';
        dibujarGirada(lienzo.getContext('2d'), img, giro, lienzo.width, lienzo.height);
        pintarRecorte();
      }
      function pintarRecorte() {
        caja.style.left = (rec.x * 100) + '%';
        caja.style.top = (rec.y * 100) + '%';
        caja.style.width = (rec.w * 100) + '%';
        caja.style.height = (rec.h * 100) + '%';
      }
      let arrastre = null;
      caja.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        caja.setPointerCapture(ev.pointerId);
        arrastre = { modo: ev.target.getAttribute('data-modo') || 'mover', x0: ev.clientX, y0: ev.clientY, r0: Object.assign({}, rec),
          W: marco.clientWidth, H: marco.clientHeight };
      });
      caja.addEventListener('pointermove', function (ev) {
        if (!arrastre) return;
        const a = arrastre, dx = (ev.clientX - a.x0) / a.W, dy = (ev.clientY - a.y0) / a.H, r = a.r0;
        const lim = function (v, mn, mx) { return Math.max(mn, Math.min(mx, v)); };
        const n = Object.assign({}, r);
        if (a.modo === 'mover') {
          n.x = lim(r.x + dx, 0, 1 - r.w);
          n.y = lim(r.y + dy, 0, 1 - r.h);
        } else {
          if (a.modo.indexOf('w') >= 0) { n.x = lim(r.x + dx, 0, r.x + r.w - RECORTE_MIN); n.w = r.x + r.w - n.x; }
          if (a.modo.indexOf('e') >= 0) { n.w = lim(r.w + dx, RECORTE_MIN, 1 - r.x); }
          if (a.modo.indexOf('n') >= 0) { n.y = lim(r.y + dy, 0, r.y + r.h - RECORTE_MIN); n.h = r.y + r.h - n.y; }
          if (a.modo.indexOf('s') >= 0) { n.h = lim(r.h + dy, RECORTE_MIN, 1 - r.y); }
        }
        rec = n;
        pintarRecorte();
      });
      const soltar = function () { arrastre = null; };
      caja.addEventListener('pointerup', soltar);
      caja.addEventListener('pointercancel', soltar);
      const girar = function (sentido) {
        giro = (giro + sentido + 4) % 4;
        rec = girarRecorte(rec, sentido);
        dibujar();
      };
      async function aplicar(btn) {
        const completo = rec.x <= 0.001 && rec.y <= 0.001 && rec.w >= 0.999 && rec.h >= 0.999;
        if (giro === 0 && completo) {
          const b0 = arch.original || arch.blob;
          cerrar({ blob: b0, vista: await leerDataUrl(b0), edicion: { giro: 0, recorte: null }, editada: false });
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Guardando…';
        const impar = giro % 2 === 1;
        const rw = impar ? img.naturalHeight : img.naturalWidth, rh = impar ? img.naturalWidth : img.naturalHeight;
        const girada = document.createElement('canvas');
        girada.width = rw;
        girada.height = rh;
        dibujarGirada(girada.getContext('2d'), img, giro, rw, rh);
        const px = Math.round(rec.x * rw), py = Math.round(rec.y * rh);
        const pw = Math.max(1, Math.round(rec.w * rw)), ph = Math.max(1, Math.round(rec.h * rh));
        const salida = document.createElement('canvas');
        salida.width = pw;
        salida.height = ph;
        salida.getContext('2d').drawImage(girada, px, py, pw, ph, 0, 0, pw, ph);
        const blob = await new Promise(function (ok) { salida.toBlob(ok, 'image/jpeg', 0.9); });
        if (!blob) { btn.disabled = false; btn.textContent = 'Usar imagen'; tostada('No se pudo guardar la imagen editada.', { error: true }); return; }
        cerrar({ blob: blob, vista: await leerDataUrl(blob), edicion: { giro: giro, recorte: completo ? null : rec }, editada: true });
      }
      const btnAplicar = h('button', { type: 'button', class: 'btn primario', onclick: function (ev) { aplicar(ev.currentTarget); } }, 'Usar imagen');
      agregar(capa, h('div', { class: 'ed-caja' },
        h('div', { class: 'ed-cab' }, h('strong', null, titulo),
          h('span', null, 'Gire o recorte si hace falta (arrastre el recuadro o sus bordes). Si ya se ve bien, pulse "Usar imagen".')),
        escenario,
        h('div', { class: 'ed-barra' },
          h('div', { class: 'ed-grupo' },
            h('button', { type: 'button', class: 'btn', onclick: function () { girar(-1); }, 'aria-label': 'Girar a la izquierda' }, '⟲ Girar'),
            h('button', { type: 'button', class: 'btn', onclick: function () { girar(1); }, 'aria-label': 'Girar a la derecha' }, 'Girar ⟳'),
            h('button', { type: 'button', class: 'btn', onclick: function () { giro = 0; rec = Object.assign({}, RECORTE_COMPLETO); dibujar(); } }, 'Restablecer')),
          h('div', { class: 'ed-grupo' },
            h('button', { type: 'button', class: 'btn', onclick: function () { cerrar(null); } }, 'Cancelar'),
            btnAplicar))));
      document.body.appendChild(capa);
      document.body.style.overflow = 'hidden';
      window.addEventListener('resize', dibujar);
      document.addEventListener('keydown', tecla, true);
      dibujar();
      btnAplicar.focus();
    });
  }

  /* ============================== buscador con lista ============================== */
  function resaltar(texto, palabras) {
    if (!palabras.length) return texto;
    const n = norm(texto);
    const marcas = new Array(texto.length).fill(false);
    palabras.forEach(function (p) { let i = n.indexOf(p); while (i >= 0) { for (let j = i; j < i + p.length; j++) marcas[j] = true; i = n.indexOf(p, i + p.length); } });
    const out = [];
    let i = 0;
    while (i < texto.length) {
      let j = i;
      while (j < texto.length && marcas[j] === marcas[i]) j++;
      out.push(marcas[i] ? h('mark', null, texto.slice(i, j)) : texto.slice(i, j));
      i = j;
    }
    return out;
  }
  function palabrasDe(q) { return norm(q).replace(/["“”.,()]/g, ' ').trim().split(/\s+/).filter(function (p) { return p && p !== 'h' && p !== 'n'; }); }
  /**
   * Cuadro de texto con lista desplegable y búsqueda (sin acentos, en cualquier orden).
   * cfg: id, texto (lo que muestra), elegido (valor actual), items(palabras, textoLibre) → [{v, t} | {grupo}],
   *      elegir(item), alEscribir(texto), placeholder, limpiarAlElegir
   */
  function combo(cfg) {
    const idLista = cfg.id + '-lista';
    const input = h('input', { id: cfg.id, type: 'text', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': idLista, 'aria-autocomplete': 'list',
      autocomplete: 'off', spellcheck: 'false', placeholder: cfg.placeholder || 'Escriba para buscar…', value: cfg.texto || '' });
    const lista = h('ul', { id: idLista, role: 'listbox', class: 'combo-lista', hidden: true });
    const btn = h('button', { type: 'button', class: 'combo-btn', tabindex: '-1', 'aria-label': 'Mostrar la lista' }, '▾');
    let visibles = [], activo = -1;
    const abrir = function (todos) {
      const palabras = todos ? [] : palabrasDe(input.value);
      const items = cfg.items(palabras, todos ? '' : input.value.trim());
      lista.textContent = '';
      visibles = [];
      activo = -1;
      items.forEach(function (it) {
        if (it.grupo) { lista.appendChild(h('li', { class: 'grupo', role: 'presentation' }, it.grupo)); return; }
        const i = visibles.length;
        visibles.push(it);
        if (it.v === cfg.elegido) activo = i;
        lista.appendChild(h('li', { id: cfg.id + '-op-' + i, role: 'option', class: (it.v === cfg.elegido ? 'elegido ' : '') + (it.nuevo ? 'nuevo' : ''),
          onpointerdown: function (ev) { ev.preventDefault(); elegir(it); } }, it.nuevo ? it.t : resaltar(it.t, palabras)));
      });
      if (!visibles.length) lista.appendChild(h('li', { class: 'nada', role: 'option', 'aria-disabled': 'true' }, 'Nada coincide con ese texto.'));
      lista.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      marcarActivo();
    };
    const cerrar = function () { lista.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); };
    const marcarActivo = function () {
      Array.prototype.forEach.call(lista.querySelectorAll('[role=option]'), function (li, i) { li.setAttribute('aria-selected', String(i === activo)); });
      const li = document.getElementById(cfg.id + '-op-' + activo);
      if (li) { input.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); } else input.removeAttribute('aria-activedescendant');
    };
    const elegir = function (it) {
      cfg.elegido = it.v;
      input.value = cfg.limpiarAlElegir ? '' : it.t;
      cerrar();
      cfg.elegir(it);
      if (cfg.limpiarAlElegir) { setTimeout(function () { input.focus(); }, 0); }
    };
    input.addEventListener('focus', function () {
      if (window.matchMedia('(max-width: 640px)').matches) setTimeout(function () { input.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 250);
      abrir(input.value === (cfg.texto || ''));
    });
    input.addEventListener('input', function () { cfg.elegido = ''; if (cfg.alEscribir) cfg.alEscribir(input.value); abrir(false); });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (lista.hidden) { abrir(false); return; }
        if (!visibles.length) return;
        activo = ev.key === 'ArrowDown' ? Math.min(visibles.length - 1, activo + 1) : Math.max(0, activo - 1);
        marcarActivo();
      } else if (ev.key === 'Enter') {
        if (!lista.hidden && visibles.length && (activo >= 0 || input.value.trim())) { ev.preventDefault(); elegir(visibles[activo >= 0 ? activo : 0]); }
      } else if (ev.key === 'Escape') { cerrar(); }
    });
    input.addEventListener('blur', function () { cerrar(); if (cfg.alSalir) cfg.alSalir(input.value); });
    btn.addEventListener('pointerdown', function (ev) { ev.preventDefault(); });
    btn.addEventListener('click', function () { if (lista.hidden) { input.focus(); abrir(true); } else cerrar(); });
    return h('div', { class: 'combo' }, input, btn, lista);
  }

  /** Lista de hallazgos con buscador; "lista" es un arreglo que se modifica en su lugar. */
  function campoHallazgos(id, lista, alCambiar) {
    const etiquetas = h('div', { class: 'etiquetas', 'aria-live': 'polite' });
    const pintarEtiquetas = function () {
      etiquetas.textContent = '';
      lista.forEach(function (x, i) {
        etiquetas.appendChild(h('span', { class: 'etiqueta' }, x, h('button', { type: 'button', 'aria-label': 'Quitar ' + x,
          onclick: function () { lista.splice(i, 1); pintarEtiquetas(); alCambiar(); } }, '✕')));
      });
    };
    pintarEtiquetas();
    const c = combo({ id: id, texto: '', placeholder: 'Buscar o escribir un hallazgo…', limpiarAlElegir: true,
      items: function (palabras, libre) {
        const out = [];
        const tiene = function (x) { return lista.some(function (y) { return norm(y) === norm(x); }); };
        HALLAZGOS.forEach(function (g) {
          const ok = g[1].filter(function (x) { const n = norm(g[0] + ' ' + x); return !tiene(x) && palabras.every(function (p) { return n.indexOf(p) >= 0; }); });
          if (ok.length) { out.push({ grupo: g[0] }); ok.forEach(function (x) { out.push({ v: x, t: x }); }); }
        });
        if (libre.length >= 3 && !tiene(libre) && !HALLAZGOS.some(function (g) { return g[1].some(function (x) { return norm(x) === norm(libre); }); })) {
          out.push({ v: libre, t: 'Agregar «' + libre + '»', nuevo: true });
        }
        return out;
      },
      elegir: function (it) { if (lista.length < 20) { lista.push(it.v); pintarEtiquetas(); alCambiar(); } }
    });
    return h('div', null, c, etiquetas);
  }

  /* ============================== edad y medidas ============================== */
  /** Edad a partir de DD/MM/AAAA en la fecha ISO "en": {anios, meses, dias} o null. */
  function edadDe(s, en) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || ''));
    if (!m) return null;
    const d = Number(m[1]), mes = Number(m[2]), a = Number(m[3]);
    if (a < 1900 || mes < 1 || mes > 12 || d < 1 || d > new Date(a, mes, 0).getDate()) return null;
    const iso = m[3] + '-' + m[2] + '-' + m[1];
    const ref = en || hoy();
    if (iso > ref) return null;
    const r = partes(ref);
    let meses = (r[0] - a) * 12 + (r[1] - mes);
    if (r[2] < d) meses--;
    return { anios: Math.floor(meses / 12), meses: meses, dias: diasEntre(iso, ref) };
  }
  function textoEdad(e) {
    if (!e) return '';
    if (e.anios >= 2) return e.anios + ' años';
    if (e.anios === 1) return '1 año (' + e.meses + ' meses)';
    if (e.meses >= 1) return e.meses === 1 ? '1 mes' : e.meses + ' meses';
    return e.dias === 1 ? '1 día' : e.dias + ' días';
  }
  function edadCorta(f) {
    if (f.edad === '') return '—';
    if (f.edad === '0') {
      const e = edadDe(f.fecha_nacimiento, f.fecha_estudio);
      return e ? (e.meses >= 1 ? e.meses + ' m' : e.dias + ' d') : '< 1 a';
    }
    return f.edad + ' a';
  }
  function imcSc(peso, talla) {
    const p = Number(peso), t = Number(talla);
    if (!(p > 0 && t > 0)) return null;
    return { imc: (p / Math.pow(t / 100, 2)).toFixed(1), sc: Math.sqrt(p * t / 3600).toFixed(2) };
  }
  function redondear(n, d) { const k = Math.pow(10, d); return Math.round(n * k) / k; }

  /* ============================== formulario de registro ============================== */
  function claveEstudio(k) { return k === OTRO ? 'otro' : 'e' + ESTUDIOS.indexOf(k); }
  function nuevoFormulario() {
    return { modo: 'nuevo', v: { fecha_estudio: hoy(), procedencia: '', procedencia_otra: '', expediente: '', nombre: '', fn: '', edad: '', sexo: '',
      diagnostico: '', pa_s: '', pa_d: '', fc: '', fr: '', sato2: '', peso: '', unidad: 'kg', talla: '', observaciones: '' },
    sel: [], estudio_otro: '', res: {}, hallazgos: [], errores: {}, sucio: false, idCliente: uuid(), enviado: null, notaTalla: '' };
  }
  /** Formulario de edición a partir de un registro existente. */
  function formularioDe(f) {
    const F = nuevoFormulario();
    F.modo = 'editar';
    F.id = f.id;
    const proc = String(f.procedencia || '');
    const pa = String(f.pa || '').split('/');
    Object.assign(F.v, { fecha_estudio: f.fecha_estudio, procedencia: /^Otro: /.test(proc) ? OTRO : proc, procedencia_otra: /^Otro: /.test(proc) ? proc.slice(6) : '',
      expediente: f.expediente, nombre: f.nombre, fn: f.fecha_nacimiento, edad: f.fecha_nacimiento ? '' : f.edad, sexo: f.sexo, diagnostico: f.diagnostico,
      pa_s: pa[0] || '', pa_d: pa[1] || '', fc: f.fc, fr: f.fr, sato2: f.sato2, peso: f.peso, talla: f.talla, observaciones: f.observaciones });
    if (/^Otro: /.test(f.estudio)) { F.sel = [OTRO]; F.estudio_otro = f.estudio.slice(6); } else if (f.estudio) F.sel = [f.estudio];
    F.hallazgos = f.hallazgos ? f.hallazgos.split(' | ') : [];
    return F;
  }
  function resDe(F, k) { return F.res[k] || (F.res[k] = { r: 'P|', hallazgos: [], archivo: null }); }

  function vistaRegistro(main) {
    if (!S.form || (S.form.modo !== 'nuevo')) S.form = nuevoFormulario();
    const F = S.form;
    if (F.enviado) { pintarExito(main, F); return; }
    const raiz = h('div');
    F.raiz = raiz;
    agregar(main, [h('section', { class: 'form-cab' }, h('h2', null, 'Registro de paciente para estudio ambulatorio'),
      h('p', null, 'Ningún dato es obligatorio. Puede indicar quién realizó el estudio y cargar el reporte ahora o después, desde el Censo.')), raiz]);
    raiz.appendChild(construirFormulario(F));
  }
  /** Vuelve a dibujar el formulario conservando el foco (al cambiar algo que cambia su estructura). */
  function repintarForm(F) {
    if (!F.raiz) return;
    const a = document.activeElement;
    const id = a && F.raiz.contains(a) ? a.id : '';
    F.raiz.textContent = '';
    F.raiz.appendChild(construirFormulario(F));
    if (id) { const el = document.getElementById(id); if (el) el.focus({ preventScroll: true }); }
  }
  function marcarSucio(F) { F.sucio = true; }

  function campo(F, k, etiqueta, control, op) {
    const o = op || {};
    const caja = h('div', { class: 'campo' + (o.ancho ? ' ancho' : '') + (o.doble ? ' doble' : '') + (F.errores[k] ? ' mal' : ''), id: 'campo-' + k },
      o.grupo ? h('div', { class: 'etq', id: 'etq-' + k }, etiqueta) : h('label', { for: o.para || 'in-' + k }, etiqueta),
      control, o.ayuda ? h('div', { class: 'ayuda' }, o.ayuda) : null, o.extra || null,
      h('div', { class: 'msg', id: 'msg-' + k, role: 'alert' }, F.errores[k] || ''));
    return caja;
  }
  function limpiarError(F, k) {
    delete F.errores[k];
    const c = document.getElementById('campo-' + k), m = document.getElementById('msg-' + k);
    if (c) c.classList.remove('mal');
    if (m) m.textContent = '';
  }
  function texto(F, k, attrs) {
    return h('input', Object.assign({ id: 'in-' + k, type: 'text', value: F.v[k] || '', oninput: function (ev) { F.v[k] = ev.target.value; marcarSucio(F); limpiarError(F, k); } }, attrs || {}));
  }
  /** Entrada numérica: filtra lo que no es número; "decimales" permite punto decimal. */
  function numero(F, k, max, decimales, alCambiar) {
    return h('input', { id: 'in-' + k, type: 'text', inputmode: decimales ? 'decimal' : 'numeric', value: F.v[k] || '', autocomplete: 'off',
      oninput: function (ev) {
        const el = ev.target;
        let v = decimales ? el.value.replace(',', '.').replace(/[^\d.]/g, '') : el.value.replace(/\D/g, '');
        if (decimales) { const p = v.split('.'); v = p[0].slice(0, max) + (p.length > 1 ? '.' + p.slice(1).join('').slice(0, decimales) : ''); } else v = v.slice(0, max);
        if (v !== el.value) el.value = v;
        F.v[k] = v;
        marcarSucio(F);
        limpiarError(F, k);
        if (alCambiar) alCambiar();
      } });
  }

  function construirFormulario(F) {
    const nuevo = F.modo === 'nuevo';
    const frag = h('form', { novalidate: true, autocomplete: 'off', onsubmit: function (ev) { ev.preventDefault(); guardarFormulario(F, cajaErr, btn); } });
    const cajaErr = h('div');
    const btn = h('button', { class: 'btn primario grande', type: 'submit', id: 'btn-guardar' }, nuevo ? (F.sel.length > 1 ? 'Guardar ' + F.sel.length + ' registros' : 'Guardar registro') : 'Guardar cambios');

    /* --- Estudio --- */
    const elegirEstudio = function (k, marcado) {
      if (nuevo) {
        if (marcado && F.sel.indexOf(k) < 0) F.sel.push(k);
        if (!marcado) F.sel = F.sel.filter(function (x) { return x !== k; });
      } else F.sel = marcado ? [k] : [];
      marcarSucio(F);
      limpiarError(F, 'estudio');
      repintarForm(F);
      if (k === OTRO && marcado) { const el = document.getElementById('in-estudio_otro'); if (el) el.focus(); }
    };
    const opcionesEstudio = h('div', { class: 'estudios', role: nuevo ? 'group' : 'radiogroup', 'aria-labelledby': 'etq-estudio' },
      ESTUDIOS.concat([OTRO]).map(function (e) {
        return h('label', { class: 'opcion' }, h('input', { type: nuevo ? 'checkbox' : 'radio', name: 'estudio', id: 'est-' + claveEstudio(e), checked: F.sel.indexOf(e) >= 0,
          onchange: function (ev) { elegirEstudio(e, ev.target.checked); } }), e === OTRO ? 'Otro (introducir manualmente)' : e);
      }));
    const estudioOtro = F.sel.indexOf(OTRO) >= 0 ? h('div', { style: 'margin-top:8px' }, texto(F, 'estudio_otro', { value: F.estudio_otro, maxlength: 80, placeholder: 'Escriba el estudio',
      oninput: function (ev) { F.estudio_otro = ev.target.value; marcarSucio(F); limpiarError(F, 'estudio'); } })) : null;

    const fechaEstudio = h('input', { id: 'in-fecha_estudio', type: 'date', value: F.v.fecha_estudio, max: sumarDias(hoy(), 60),
      onchange: function (ev) { F.v.fecha_estudio = ev.target.value; marcarSucio(F); limpiarError(F, 'fecha_estudio'); actualizarEdad(); } });

    const procedencia = combo({ id: 'in-procedencia', texto: F.v.procedencia === OTRO ? 'Otro (introducir manualmente)' : F.v.procedencia, elegido: F.v.procedencia,
      items: function (palabras, libre) {
        const out = PROCEDENCIAS.filter(function (x) { const n = norm(x); return palabras.every(function (p) { return n.indexOf(p) >= 0; }); })
          .map(function (x) { return { v: x, t: x }; });
        const exacto = PROCEDENCIAS.some(function (x) { return norm(x) === norm(libre); });
        if (!out.length && libre.length >= 2 && !exacto && !/^otro/i.test(libre)) out.push({ v: OTRO, t: 'Usar «' + libre + '» (otro)', nuevo: true, libre: libre });
        else out.push({ v: OTRO, t: 'Otro (introducir manualmente)' });
        return out;
      },
      alEscribir: function () { if (F.v.procedencia) { F.v.procedencia = ''; F.v.procedencia_otra = ''; } marcarSucio(F); limpiarError(F, 'procedencia'); },
      alSalir: function (valor) {
        if (F.v.procedencia || !valor.trim()) return;
        const exacto = PROCEDENCIAS.filter(function (x) { return norm(x) === norm(valor.trim()); })[0];
        if (exacto) { F.v.procedencia = exacto; repintarForm(F); }
      },
      elegir: function (it) {
        F.v.procedencia = it.v;
        F.v.procedencia_otra = it.v === OTRO ? (it.libre || F.v.procedencia_otra || '') : '';
        marcarSucio(F);
        limpiarError(F, 'procedencia');
        repintarForm(F);
        if (it.v === OTRO && !it.libre) { const el = document.getElementById('in-procedencia_otra'); if (el) el.focus(); }
      } });
    const procOtra = F.v.procedencia === OTRO ? h('div', { style: 'margin-top:8px' }, texto(F, 'procedencia_otra', { maxlength: 80, placeholder: 'Escriba de dónde proviene', 'aria-label': 'Otra procedencia',
      oninput: function (ev) { F.v.procedencia_otra = ev.target.value; marcarSucio(F); limpiarError(F, 'procedencia'); } })) : null;

    /* --- Paciente --- */
    const calculo = h('div', { class: 'calculo', id: 'calc-edad', 'aria-live': 'polite' });
    const cajaEdad = h('div', { class: 'con-sufijo', style: 'margin-top:8px' });
    const actualizarEdad = function () {
      calculo.textContent = '';
      cajaEdad.textContent = '';
      const e = edadDe(F.v.fn, F.v.fecha_estudio || hoy());
      if (e) { agregar(calculo, ['Edad el día del estudio: ', h('b', null, textoEdad(e))]); return; }
      if (F.v.fn.replace(/\//g, '').length) return; // escribiendo la fecha
      agregar(cajaEdad, [h('span', null, 'o edad:'), numero(F, 'edad', 3, 0), h('span', null, 'años')]);
      cajaEdad.querySelector('input').setAttribute('aria-label', 'Edad en años (si no conoce la fecha de nacimiento)');
    };
    const segmentos = (function () {
      const largos = [2, 2, 4], ph = ['DD', 'MM', 'AAAA'], aria = ['Día de nacimiento', 'Mes de nacimiento', 'Año de nacimiento'];
      const previo = String(F.v.fn || '').split('/');
      const entradas = [];
      const actualizar = function () {
        const p = entradas.map(function (x) { return x.value; });
        const antes = F.v.fn;
        F.v.fn = p.some(Boolean) ? p.join('/') : '';
        if (F.v.fn !== antes) { marcarSucio(F); limpiarError(F, 'fn'); }
        const conEdad = !!cajaEdad.querySelector('input');
        actualizarEdad();
        if (conEdad && cajaEdad.querySelector('input') === null) F.v.edad = '';
      };
      largos.forEach(function (largo, i) {
        const inp = h('input', { type: 'text', inputmode: 'numeric', maxlength: largo, class: 'seg-' + largo, placeholder: ph[i], 'aria-label': aria[i],
          id: i === 0 ? 'in-fn' : 'in-fn' + i, value: previo[i] || '',
          oninput: function (ev) {
            const v = ev.target.value.replace(/\D/g, '').slice(0, largo);
            if (v !== ev.target.value) ev.target.value = v;
            actualizar();
            if (v.length === largo && entradas[i + 1]) entradas[i + 1].focus();
          },
          onblur: function (ev) { if (i < 2 && ev.target.value.length === 1) { ev.target.value = '0' + ev.target.value; actualizar(); } },
          onkeydown: function (ev) {
            if ((ev.key === '/' || ev.key === '-' || ev.key === ' ' || ev.key === '.') && entradas[i + 1]) { ev.preventDefault(); if (ev.target.value) entradas[i + 1].focus(); }
            if (ev.key === 'Backspace' && !ev.target.value && entradas[i - 1]) entradas[i - 1].focus();
          } });
        entradas.push(inp);
      });
      const g = h('div', { class: 'segmentos', role: 'group', 'aria-labelledby': 'etq-fn' });
      entradas.forEach(function (inp, i) { if (i) g.appendChild(h('span', { class: 'sep', 'aria-hidden': 'true' }, '/')); g.appendChild(inp); });
      return g;
    })();
    actualizarEdad();

    const sexo = h('div', { class: 'opciones', role: 'radiogroup', 'aria-labelledby': 'etq-sexo' }, SEXOS.map(function (s) {
      return h('label', { class: 'opcion' }, h('input', { type: 'radio', name: 'sexo', id: 'sexo-' + s.charAt(0), value: s, checked: F.v.sexo === s,
        onchange: function () { F.v.sexo = s; marcarSucio(F); },
        // Tocar otra vez la opción ya marcada la desmarca (ningún dato es obligatorio).
        onclick: function (ev) { if (F.v.sexo === s) { ev.target.checked = false; F.v.sexo = ''; marcarSucio(F); } } }), s);
    }));

    /* --- Signos vitales y medidas --- */
    const cajaImc = h('div', { class: 'imc', id: 'calc-imc', 'aria-live': 'polite' });
    const pesoKg = function () {
      const n = Number(F.v.peso);
      if (!(n > 0)) return '';
      return F.v.unidad === 'lb' ? String(redondear(n * LB_A_KG, 2)) : String(n);
    };
    const conversion = h('div', { class: 'calculo', id: 'calc-peso' });
    const actualizarMedidas = function () {
      cajaImc.textContent = '';
      conversion.textContent = '';
      const kg = pesoKg();
      if (F.v.unidad === 'lb' && kg) agregar(conversion, ['= ', h('b', null, kg + ' kg'), ' (se guarda en kilogramos)']);
      const r = imcSc(kg, F.v.talla >= 20 ? F.v.talla : '');
      if (r) agregar(cajaImc, [h('span', null, 'IMC ', h('b', null, r.imc)), h('span', null, 'Superficie corporal ', h('b', null, r.sc + ' m²'))]);
    };
    const unidad = h('div', { class: 'unidad', role: 'group', 'aria-label': 'Unidad del peso' }, ['kg', 'lb'].map(function (u) {
      return h('button', { type: 'button', id: 'unidad-' + u, 'aria-pressed': String(F.v.unidad === u), onclick: function () {
        if (F.v.unidad === u) return;
        F.v.unidad = u; marcarSucio(F); limpiarError(F, 'peso'); repintarForm(F);
      } }, u);
    }));
    const talla = numero(F, 'talla', 3, 2, actualizarMedidas);
    talla.addEventListener('blur', function () {
      const n = Number(F.v.talla);
      if (n > 0.3 && n < 3) {
        const cm = String(Math.round(n * 100));
        F.notaTalla = 'Se convirtió ' + F.v.talla + ' m a ' + cm + ' cm.';
        F.v.talla = cm;
        talla.value = cm;
        const nota = document.getElementById('nota-talla');
        if (nota) nota.textContent = F.notaTalla;
        actualizarMedidas();
      }
    });
    actualizarMedidas();

    const secciones = [
      h('section', { class: 'seccion' }, h('h3', null, 'Estudio'),
        h('div', { class: 'rejilla' },
          campo(F, 'fecha_estudio', 'Fecha del estudio', fechaEstudio, { ayuda: 'Por defecto, hoy.' }),
          campo(F, 'procedencia', 'Proviene de', h('div', null, procedencia, procOtra), { ayuda: 'Escriba parte del nombre o del lugar: "Zacamil", "Bloom", "consulta", "externo"…' }),
          campo(F, 'estudio', nuevo ? 'Estudio(s) a realizar' : 'Estudio', h('div', null, opcionesEstudio, estudioOtro),
            { ancho: true, grupo: true, ayuda: nuevo ? 'Puede marcar varios: se crea un registro por cada estudio, con los mismos datos del paciente.' : null }))),
      h('section', { class: 'seccion' }, h('h3', null, 'Paciente'),
        h('div', { class: 'rejilla' },
          campo(F, 'expediente', 'Número de expediente', texto(F, 'expediente', { maxlength: 30, autocapitalize: 'characters', spellcheck: 'false' })),
          campo(F, 'nombre', 'Nombre del paciente', texto(F, 'nombre', { maxlength: 120, autocapitalize: 'words' })),
          campo(F, 'fn', 'Fecha de nacimiento', h('div', null, segmentos, calculo, cajaEdad), { grupo: true, ayuda: 'Día / mes / año. La edad se calcula sola.' }),
          campo(F, 'sexo', 'Sexo', sexo, { grupo: true }),
          campo(F, 'diagnostico', 'Diagnósticos previos', h('textarea', { id: 'in-diagnostico', maxlength: 2000, rows: 2,
            oninput: function (ev) { F.v.diagnostico = ev.target.value; marcarSucio(F); } }, F.v.diagnostico), { ancho: true }))),
      h('section', { class: 'seccion' }, h('h3', null, 'Signos vitales y medidas'),
        h('div', { class: 'rejilla cuatro' },
          campo(F, 'pa', 'Presión arterial', h('div', { class: 'segmentos' }, (function () {
            const s = numero(F, 'pa_s', 3, 0), d = numero(F, 'pa_d', 3, 0);
            s.classList.add('seg-3'); d.classList.add('seg-3');
            s.setAttribute('aria-label', 'Presión sistólica'); d.setAttribute('aria-label', 'Presión diastólica');
            s.addEventListener('input', function () { limpiarError(F, 'pa'); if (s.value.length === 3) d.focus(); });
            s.addEventListener('keydown', function (ev) { if (ev.key === '/') { ev.preventDefault(); d.focus(); } });
            d.addEventListener('input', function () { limpiarError(F, 'pa'); });
            return [s, h('span', { class: 'sep', 'aria-hidden': 'true' }, '/'), d, h('span', { class: 'tenue' }, 'mmHg')];
          })()), { grupo: true }),
          campo(F, 'fc', 'Frecuencia cardiaca', h('div', { class: 'con-sufijo' }, numero(F, 'fc', 3, 0), h('span', null, 'lpm'))),
          campo(F, 'fr', 'Frecuencia respiratoria', h('div', { class: 'con-sufijo' }, numero(F, 'fr', 2, 0), h('span', null, 'rpm'))),
          campo(F, 'sato2', 'Saturación de oxígeno', h('div', { class: 'con-sufijo' }, numero(F, 'sato2', 3, 0), h('span', null, '%'))),
          campo(F, 'peso', 'Peso', h('div', null, h('div', { class: 'con-sufijo' }, numero(F, 'peso', 3, 2, actualizarMedidas), unidad), conversion), { doble: true }),
          campo(F, 'talla', 'Talla', h('div', null, h('div', { class: 'con-sufijo' }, talla, h('span', null, 'cm')), h('div', { class: 'calculo', id: 'nota-talla' }, F.notaTalla || '')),
            { doble: true, ayuda: 'En centímetros. Si la escribe en metros (1.62) se convierte sola.' }),
          h('div', { class: 'campo ancho', style: 'grid-column:1/-1' }, cajaImc)))
    ];

    /* --- Resultado por estudio (solo al registrar) o hallazgos (al editar) --- */
    if (nuevo) {
      const bloques = F.sel.map(function (k) {
        const R = resDe(F, k);
        const c = claveEstudio(k);
        const nombre = k === OTRO ? (F.estudio_otro.trim() || 'Otro estudio') : k;
        return h('div', { class: 'bloque' }, h('h4', null, nombre),
          h('div', { class: 'rejilla' },
            campo(F, 'res-' + c, 'Realizado por', selectorResultado(R.r, { id: 'in-res-' + c, onchange: function (ev) { R.r = ev.target.value; marcarSucio(F); } }, true)),
            campo(F, 'rep-' + c, 'Reporte del estudio', zonaReporte(F, R, c, nombre), { grupo: true }),
            campo(F, 'hal-' + c, 'Hallazgos', campoHallazgos('in-hal-' + c, R.hallazgos, function () { marcarSucio(F); }), { ancho: true, para: 'in-hal-' + c })));
      });
      secciones.push(h('section', { class: 'seccion' }, h('h3', null, 'Resultado del estudio', h('small', null, 'Opcional: puede completarse después en el Censo')),
        bloques.length ? h('div', { class: 'bloques' }, bloques) : h('p', { class: 'tenue', style: 'margin:0' }, 'Marque arriba el estudio para indicar quién lo realizó, cargar el reporte y anotar los hallazgos.')));
    } else {
      secciones.push(h('section', { class: 'seccion' }, h('h3', null, 'Hallazgos'),
        campo(F, 'hallazgos', 'Hallazgos del estudio', campoHallazgos('in-hallazgos', F.hallazgos, function () { marcarSucio(F); }), { para: 'in-hallazgos' })));
    }
    secciones.push(h('section', { class: 'seccion' }, h('h3', null, 'Observaciones'),
      campo(F, 'observaciones', 'Observaciones', h('textarea', { id: 'in-observaciones', maxlength: 2000, rows: 2,
        oninput: function (ev) { F.v.observaciones = ev.target.value; marcarSucio(F); } }, F.v.observaciones), { ayuda: 'Opcional.' })));

    agregar(frag, [secciones, cajaErr, h('div', { class: 'barra-enviar' }, btn,
      nuevo && F.sucio ? h('button', { type: 'button', class: 'btn', onclick: async function () {
        if (await preguntar('Limpiar el formulario', 'Se borrará lo que ha escrito en este registro.', 'Sí, limpiar', 'Volver', 'peligro')) { S.form = nuevoFormulario(); pintar(); window.scrollTo(0, 0); }
      } }, 'Limpiar') : null)]);
    return frag;
  }

  /** <select> de resultado: Pendiente / Realizado por (médicos) / No se realizó (motivos). */
  function selectorResultado(actual, attrs, enFormulario) {
    const medicoActual = actual.charAt(0) === 'R' ? actual.slice(2) : '';
    const medicos = S.medicos.filter(function (m) { return m.activo || m.nombre === medicoActual; }).map(function (m) { return ['R|' + m.nombre, m.nombre]; });
    if (medicoActual && !medicos.some(function (m) { return m[0] === actual; })) medicos.push([actual, medicoActual]);
    const motivos = S.motivos.map(function (m) { return ['N|' + m, m]; });
    if (actual.charAt(0) === 'N' && !motivos.some(function (m) { return m[0] === actual; })) motivos.push([actual, actual.slice(2)]);
    return selector([['P|', enFormulario ? 'Sin indicar (completar después)' : 'Sin indicar'], { grupo: 'Realizado por', opciones: medicos }, { grupo: 'No se realizó', opciones: motivos }], actual, attrs);
  }

  /** Zona para cargar el reporte en el formulario. Si es imagen, abre el editor en seguida. */
  function zonaReporte(F, R, c, nombre) {
    const zona = h('div', { class: 'zona', id: 'in-rep-' + c });
    const pintarZona = function () {
      zona.textContent = '';
      const a = R.archivo;
      const cargar = h('button', { type: 'button', class: 'btn', id: 'btn-rep-' + c, onclick: async function () {
        const file = await elegirArchivo();
        if (!file) return;
        limpiarError(F, 'rep-' + c);
        zona.textContent = 'Preparando archivo…';
        try {
          const arch = await prepararArchivo(file);
          if (arch.vista) {
            const r = await abrirEditor(arch, 'Reporte · ' + nombre);
            if (r) { Object.assign(arch, r); R.archivo = arch; marcarSucio(F); }
          } else { R.archivo = arch; marcarSucio(F); }
        } catch (e) {
          F.errores['rep-' + c] = e.message;
          const m = document.getElementById('msg-rep-' + c);
          if (m) m.textContent = e.message;
        }
        pintarZona();
      } }, a ? 'Cambiar' : 'Cargar reporte');
      if (a) {
        agregar(zona, [a.vista ? h('img', { class: 'mini', src: a.vista, alt: 'Vista previa del reporte' }) : h('div', { class: 'mini' }, 'PDF'),
          h('div', { class: 'info' }, h('b', null, a.nombre), h('span', null, tamano(a.blob.size) + (a.editada ? ' · editada' : ''))),
          h('div', { class: 'botones-archivo' },
            a.vista ? h('button', { type: 'button', class: 'btn', onclick: async function () {
              const r = await abrirEditor(a, 'Reporte · ' + nombre);
              if (r) { Object.assign(a, r); marcarSucio(F); pintarZona(); }
            } }, 'Editar') : null,
            cargar,
            h('button', { type: 'button', class: 'btn peligro', 'aria-label': 'Quitar el reporte', onclick: function () { R.archivo = null; pintarZona(); } }, 'Quitar'))]);
      } else {
        agregar(zona, [h('div', { class: 'info' }, h('b', null, 'Sin reporte'), h('span', null, 'Foto o PDF · JPG, PNG o PDF · máximo 8 MB')), cargar]);
      }
    };
    pintarZona();
    return zona;
  }

  /** Revisa formatos (nada es obligatorio). Devuelve {campo: mensaje}. */
  function validarFormulario(F) {
    const v = F.v, err = {};
    const procTexto = document.getElementById('in-procedencia');
    if (!v.fecha_estudio) err.fecha_estudio = 'Escriba la fecha del estudio.';
    else if (v.fecha_estudio > sumarDias(hoy(), 60)) err.fecha_estudio = 'Revise la fecha: está muy adelante.';
    if (!v.procedencia && procTexto && procTexto.value.trim()) err.procedencia = 'Elija una opción de la lista o use "Otro".';
    if (v.procedencia === OTRO && v.procedencia_otra.trim().length < 2) err.procedencia = 'Escriba de dónde proviene.';
    if (F.sel.indexOf(OTRO) >= 0 && F.estudio_otro.trim().length < 2) err.estudio = 'Escriba cuál es el otro estudio.';
    if (v.expediente.trim() && !/^[A-Za-z0-9][A-Za-z0-9 .\/-]*$/.test(v.expediente.trim())) err.expediente = 'Use solo números, letras, guion o diagonal.';
    if (v.fn) {
      const e = edadDe(v.fn, v.fecha_estudio || hoy());
      if (!e) err.fn = 'Escriba una fecha real (DD/MM/AAAA), anterior a la fecha del estudio.';
      else if (e.anios > 120) err.fn = 'Revise el año de nacimiento.';
    } else if (v.edad && Number(v.edad) > 120) err.fn = 'Revise la edad (0 a 120 años).';
    if (v.pa_s || v.pa_d) {
      const s = Number(v.pa_s), d = Number(v.pa_d);
      if (!v.pa_s || !v.pa_d) err.pa = 'Escriba sistólica y diastólica.';
      else if (!(s >= 50 && s <= 300 && d >= 20 && d <= 200 && s > d)) err.pa = 'Revise los valores (por ejemplo 120/80).';
    }
    if (v.fc && !(Number(v.fc) >= 20 && Number(v.fc) <= 250)) err.fc = 'Entre 20 y 250.';
    if (v.fr && !(Number(v.fr) >= 5 && Number(v.fr) <= 80)) err.fr = 'Entre 5 y 80.';
    if (v.sato2 && !(Number(v.sato2) >= 50 && Number(v.sato2) <= 100)) err.sato2 = 'Entre 50 y 100 %.';
    if (v.peso) {
      const kg = v.unidad === 'lb' ? Number(v.peso) * LB_A_KG : Number(v.peso);
      if (!(kg >= 0.3 && kg <= 400)) err.peso = v.unidad === 'lb' ? 'Revise el peso en libras.' : 'Escriba el peso en kilogramos (0.3 a 400) o cambie a lb.';
    }
    if (v.talla && !(Number(v.talla) >= 20 && Number(v.talla) <= 250)) err.talla = 'Escriba la talla en centímetros (20 a 250).';
    return err;
  }
  function datosDe(F) {
    const v = F.v;
    const kg = v.peso ? (v.unidad === 'lb' ? String(redondear(Number(v.peso) * LB_A_KG, 2)) : v.peso) : '';
    return { fecha_estudio: v.fecha_estudio, procedencia: v.procedencia === OTRO ? 'Otro: ' + v.procedencia_otra.trim() : v.procedencia,
      expediente: v.expediente.trim(), nombre: v.nombre.trim(), fecha_nacimiento: v.fn && edadDe(v.fn, v.fecha_estudio) ? v.fn : '',
      edad: v.fn ? '' : v.edad, sexo: v.sexo, diagnostico: v.diagnostico, pa: v.pa_s && v.pa_d ? v.pa_s + '/' + v.pa_d : '',
      fc: v.fc, fr: v.fr, sato2: v.sato2, peso: kg, talla: v.talla, observaciones: v.observaciones };
  }
  function nombreEstudio(F, k) { return k === OTRO ? 'Otro: ' + F.estudio_otro.trim() : k; }

  async function guardarFormulario(F, cajaErr, btn) {
    cajaErr.textContent = '';
    Object.keys(F.errores).forEach(function (k) { limpiarError(F, k); });
    const err = validarFormulario(F);
    const claves = Object.keys(err);
    if (claves.length) {
      F.errores = err;
      claves.forEach(function (k) {
        const c = document.getElementById('campo-' + k), m = document.getElementById('msg-' + k);
        if (c) c.classList.add('mal');
        if (m) m.textContent = err[k];
      });
      cajaErr.appendChild(h('div', { class: 'aviso error', role: 'alert' }, h('strong', null, claves.length === 1 ? 'Hay 1 dato por revisar' : 'Hay ' + claves.length + ' datos por revisar'), 'Están marcados en rojo.'));
      const primero = document.getElementById('campo-' + claves[0]);
      if (primero) { primero.scrollIntoView({ behavior: 'smooth', block: 'center' }); const foco = primero.querySelector('input,select,textarea'); if (foco) foco.focus({ preventScroll: true }); }
      return;
    }
    const datos = datosDe(F);
    if (F.modo === 'editar') {
      try {
        const r = await conBoton(btn, function () {
          return api('registros.actualizar', { id: F.id, datos: Object.assign(datos, { estudio: F.sel.length ? nombreEstudio(F, F.sel[0]) : '', hallazgos: F.hallazgos }) });
        });
        const f = aplicarFila(r);
        F.sucio = false;
        if (F.alGuardar) F.alGuardar(f, r.sin_cambios);
      } catch (e) { mostrarError(cajaErr, e); }
      return;
    }
    const vacio = !datos.procedencia && !datos.expediente && !datos.nombre && !datos.fecha_nacimiento && !datos.edad && !datos.sexo && !datos.diagnostico &&
      !datos.pa && !datos.fc && !datos.fr && !datos.sato2 && !datos.peso && !datos.talla && !datos.observaciones && !F.sel.length;
    if (vacio) { mostrarError(cajaErr, new Error('El registro está vacío. Escriba al menos el estudio o los datos del paciente.')); return; }
    const quitar = espera(F.sel.length > 1 ? 'Guardando ' + F.sel.length + ' registros…' : 'Guardando registro…');
    btn.disabled = true;
    try {
      const estudios = [];
      for (const k of F.sel) {
        const R = resDe(F, k);
        const x = { estudio: nombreEstudio(F, k), tipo: { R: 'REALIZADO', N: 'NO_REALIZADO', P: 'PENDIENTE' }[R.r.charAt(0)], valor: R.r.slice(2), hallazgos: R.hallazgos };
        if (R.archivo) x.reporte = { nombre: R.archivo.nombre, b64: (await leerDataUrl(R.archivo.blob)).split(',')[1] };
        estudios.push(x);
      }
      const r = await api('registros.crear', { datos: datos, estudios: estudios, id_cliente: F.idCliente });
      integrar(r.registros);
      F.enviado = { ids: r.ids };
      F.sucio = false;
      quitar();
      pintar();
      window.scrollTo(0, 0);
    } catch (e) {
      quitar();
      btn.disabled = false;
      mostrarError(cajaErr, e);
      if (e.code === 'RED') cajaErr.firstChild.appendChild(document.createTextNode(' Sus datos siguen en pantalla: puede volver a intentar sin escribir de nuevo.'));
      cajaErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function pintarExito(main, F) {
    const regs = F.enviado.ids.map(function (id) { return S.filas.get(id); }).filter(Boolean);
    const p = regs[0];
    main.appendChild(h('section', { class: 'seccion exito' },
      h('div', { class: 'check', 'aria-hidden': 'true' }, '✓'),
      h('h2', null, regs.length > 1 ? regs.length + ' registros guardados' : 'Registro guardado'),
      p ? h('p', { style: 'margin:0;color:#51606f' }, (p.nombre || 'Paciente sin nombre') + (p.expediente ? ' · Exp. ' + p.expediente : '') + ' · ' + fechaLarga(p.fecha_estudio)) : null,
      h('ul', null, regs.map(function (f) {
        return h('li', null, h('span', { class: 'folio' }, f.id), h('span', { style: 'flex:1' }, f.estudio || 'Sin estudio'),
          f.estado === 'REALIZADO' ? h('span', { class: 'chip ok' }, f.realizado_por) : f.estado === 'NO REALIZADO' ? h('span', { class: 'chip gris' }, f.motivo_no) : h('span', { class: 'chip alerta' }, 'Sin médico'),
          f.reporte ? h('span', { class: 'chip ok' }, 'Con reporte') : h('span', { class: 'chip gris' }, conCensoReportes(f) ? 'Reporte: se buscará en la carpeta del ecógrafo' : 'Sin reporte'));
      })),
      h('div', { class: 'acciones' },
        h('button', { class: 'btn primario', id: 'btn-nuevo', onclick: function () { S.form = nuevoFormulario(); pintar(); window.scrollTo(0, 0); } }, 'Nuevo registro'),
        h('button', { class: 'btn', onclick: function () {
          const ant = F;
          S.form = nuevoFormulario();
          ['fecha_estudio', 'procedencia', 'procedencia_otra', 'expediente', 'nombre', 'fn', 'edad', 'sexo', 'diagnostico', 'pa_s', 'pa_d', 'fc', 'fr', 'sato2', 'peso', 'unidad', 'talla']
            .forEach(function (k) { S.form.v[k] = ant.v[k]; });
          S.form.sucio = true;
          pintar(); window.scrollTo(0, 0);
          tostada('Datos del paciente copiados. Marque el otro estudio.');
        } }, 'Otro estudio para este paciente'),
        h('a', { class: 'btn', href: '#/censo' }, 'Ver el censo'))));
  }

  /* ============================== censo ============================== */
  const ORDENES = {
    fecha: ['Fecha del estudio', function (a, b) { return cmp(a.fecha_estudio, b.fecha_estudio) || cmp(a.fecha_hora, b.fecha_hora); }],
    nombre: ['Nombre', function (a, b) { return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }); }],
    edad: ['Edad', function (a, b) { return a.edadN - b.edadN || cmp(a.fecha_hora, b.fecha_hora); }],
    procedencia: ['Proviene de', function (a, b) { return procCorta(a.procedencia).localeCompare(procCorta(b.procedencia), 'es') || cmp(a.fecha_hora, b.fecha_hora); }],
    estudio: ['Estudio', function (a, b) { return (ESTUDIOS.indexOf(a.estudio) + 1 || 99) - (ESTUDIOS.indexOf(b.estudio) + 1 || 99) || cmp(a.fecha_hora, b.fecha_hora); }],
    medico: ['Realizado por', function (a, b) { return cmp(a.realizado_por || '~', b.realizado_por || '~') || cmp(a.fecha_hora, b.fecha_hora); }]
  };
  function ui(llave, base) { if (!S.ui[llave]) S.ui[llave] = Object.assign({ q: '', limite: 150 }, base); return S.ui[llave]; }

  function valorResultado(f) { return f.estado === 'REALIZADO' ? 'R|' + f.realizado_por : f.estado === 'NO REALIZADO' ? 'N|' + f.motivo_no : 'P|'; }
  function selectorMarcado(f) {
    const actual = valorResultado(f);
    return selectorResultado(actual, { class: 'marcar ' + (f.estado === 'REALIZADO' ? 'hecho' : f.estado === 'NO REALIZADO' ? 'no' : 'pend'),
      'aria-label': 'Realizado por (' + (f.nombre || f.id) + ')', disabled: !!f.anulado,
      onclick: function (ev) { ev.stopPropagation(); },
      onchange: function (ev) { marcar(f, ev.target.value, actual, ev.target); } });
  }
  async function marcar(f, valor, anterior, control, esDeshacer) {
    const tipo = { R: 'REALIZADO', N: 'NO_REALIZADO', P: 'PENDIENTE' }[valor.charAt(0)];
    if (control) control.disabled = true;
    try {
      const r = await api('registros.resultado', { id: f.id, tipo: tipo, valor: valor.slice(2) });
      f = aplicarFila(r);
      const t = tipo === 'REALIZADO' ? 'Realizado por ' + f.realizado_por : tipo === 'NO_REALIZADO' ? 'No se realizó: ' + f.motivo_no : 'Sin indicar quién lo realizó';
      tostada((f.nombre || f.id) + ' — ' + t, esDeshacer ? null : { accion: { texto: 'Deshacer', fn: function () { marcar(f, anterior, valor, null, true); } } });
    } catch (e) {
      tostada(e.message, { error: true });
    }
    refrescarDetalle(f.id);
    if (!modalesAbiertos()) pintar();
  }

  /* ---- reportes en el censo ---- */
  const TEXTO_REPORTE = { 'AUTOMÁTICO': 'Vinculado automáticamente', 'CONFIRMADO': 'Del censo, confirmado', 'CARGADO': 'Cargado a mano', 'POR REVISAR': 'Por revisar' };
  /** ¿Este estudio busca su reporte en el censo de la carpeta del ecógrafo? */
  function conCensoReportes(f) { return S.estudiosConReporte.indexOf(f.estudio) >= 0; }
  /** ¿El reporte actual viene del censo del ecógrafo? (esos archivos nunca se borran) */
  function esDelCenso(f) { return ['AUTOMÁTICO', 'POR REVISAR', 'CONFIRMADO'].indexOf(f.reporte_estado) >= 0; }
  function porRevisar(f) { return f.reporte_estado === 'POR REVISAR' && !f.anulado; }
  function conReporte(f) { return !!f.reporte && f.reporte_estado !== 'POR REVISAR'; }
  function chipReporte(f) {
    if (!f.reporte) return null;
    return h('span', { class: 'chip ' + (porRevisar(f) ? 'alerta' : 'ok') }, TEXTO_REPORTE[f.reporte_estado] || 'Cargado a mano');
  }
  function celdaReporte(f) {
    if (porRevisar(f)) {
      return h('button', { class: 'btn btn-rep revisar', title: 'Se encontró un reporte que podría ser de este paciente. Revíselo y confírmelo.',
        onclick: function (ev) { ev.stopPropagation(); verReporte(f); } }, 'Revisar reporte');
    }
    if (f.reporte) {
      return h('button', { class: 'btn btn-rep tiene', title: (TEXTO_REPORTE[f.reporte_estado] || 'Cargado a mano') + ' · ' + fechaHora(f.repFecha) + ' · ' + f.repUsuario,
        onclick: function (ev) { ev.stopPropagation(); verReporte(f); } }, (f.repTipo === 'pdf' ? 'PDF' : 'Imagen') + ' · Ver ✓');
    }
    if (f.anulado) return h('span', { class: 'tenue' }, '—');
    return h('button', { class: 'btn btn-rep falta', title: 'Subir una foto o un PDF del reporte' + (conCensoReportes(f) ? '. El reporte del ecógrafo también se busca solo cada hora.' : ''),
      onclick: function (ev) { ev.stopPropagation(); subirReporte(f); } }, '+ Subir reporte');
  }
  /** Elige archivo → (si es imagen) editor → sube. */
  async function subirReporte(f, archivoListo) {
    let arch = archivoListo;
    if (!arch) {
      const file = await elegirArchivo();
      if (!file) return;
      try { arch = await prepararArchivo(file); } catch (e) { tostada(e.message, { error: true }); return; }
      if (arch.vista) {
        const r = await abrirEditor(arch, 'Reporte · ' + (f.estudio || 'estudio') + (f.nombre ? ' · ' + f.nombre : ''));
        if (!r) { tostada('No se subió el reporte.'); return; }
        Object.assign(arch, r);
      }
    }
    const quitar = espera(f.reporte ? 'Reemplazando reporte…' : 'Subiendo reporte…');
    try {
      const r = await api('reporte.subir', { id: f.id, archivo: { nombre: arch.nombre, b64: (await leerDataUrl(arch.blob)).split(',')[1] } });
      olvidarReporte(f.id);
      const reemplazo = !!f.reporte;
      f = aplicarFila(r);
      quitar();
      tostada(reemplazo ? 'Reporte reemplazado.' : 'Reporte cargado: ' + (f.nombre || f.id) + '.');
    } catch (e) { quitar(); tostada(e.message, { error: true }); }
    refrescarDetalle(f.id);
    if (!modalesAbiertos()) pintar();
  }
  function olvidarReporte(id) {
    S.reportes.forEach(function (a, k) { if (k.indexOf(id + '|') === 0) { URL.revokeObjectURL(a.url); S.reportes.delete(k); } });
  }
  function aBlob(d) {
    const bin = atob(d.b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: d.tipo });
    return { url: URL.createObjectURL(blob), blob: blob, tipo: d.tipo, nombre: d.nombre };
  }
  async function guardarEnMemoria(llave, pedir) {
    if (S.reportes.has(llave)) return S.reportes.get(llave);
    const a = aBlob(await pedir());
    S.reportes.set(llave, a);
    if (S.reportes.size > 16) { const vieja = S.reportes.keys().next().value; URL.revokeObjectURL(S.reportes.get(vieja).url); S.reportes.delete(vieja); }
    return a;
  }
  function obtenerReporte(f) { return guardarEnMemoria(f.id + '|' + f.reporte, function () { return api('reporte.obtener', { id: f.id }); }); }
  function visor(url) {
    const img = h('img', { src: url, class: 'ajustar', alt: 'Imagen ampliada' });
    const v = h('div', { class: 'visor' }, h('button', { class: 'btn cerrar' }, '✕ Cerrar'), img);
    const cerrar = function () { v.remove(); document.removeEventListener('keydown', tecla, true); };
    const tecla = function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); cerrar(); } };
    img.addEventListener('click', function (ev) { ev.stopPropagation(); img.classList.toggle('ajustar'); v.style.cursor = img.classList.contains('ajustar') ? 'zoom-out' : 'zoom-in'; });
    v.addEventListener('click', cerrar);
    document.addEventListener('keydown', tecla, true);
    document.body.appendChild(v);
  }
  async function accionReporte(f, accion, btn, mensaje, alCambiar) {
    try {
      const r = await conBoton(btn, function () { return api(accion, { id: f.id }); });
      if (accion !== 'reporte.confirmar') olvidarReporte(f.id);
      aplicarFila(r);
      tostada(mensaje);
    } catch (e) { tostada(e.message, { error: true }); }
    refrescarDetalle(f.id);
    if (alCambiar) alCambiar();
  }
  /** Panel del reporte (en la ficha o en su propia ventana). */
  function panelReporte(f, alCambiar) {
    const lienzo = h('div', { class: 'lienzo' });
    const acciones = h('div', { class: 'acciones-ficha' });
    const censo = conCensoReportes(f) && !f.anulado;
    const revisar = porRevisar(f);
    const boton = function (texto, clase, fn) { return h('button', { type: 'button', class: 'btn chico ' + (clase || ''), onclick: function (ev) { fn(ev.currentTarget); } }, texto); };
    const buscar = censo ? boton(f.reporte ? 'Elegir otro del censo' : 'Buscar en el censo de reportes', '', function () { elegirDelCenso(f, alCambiar); }) : null;
    const tit = h('div', { class: 'tit' }, h('span', null, 'Reporte del estudio',
      h('span', { class: 'linea-rep' }, chipReporte(f), f.reporte_detalle ? h('span', { class: 'tenue' }, f.reporte_detalle) : null)), acciones);
    const caja = h('div', { class: 'archivo' + (revisar ? ' revisar' : '') }, tit);
    if (revisar) {
      caja.appendChild(h('div', { class: 'aviso alerta', style: 'margin:10px 12px' }, h('b', null, '¿Este reporte es de ' + (f.nombre || 'este paciente') + '?'),
        ' Exp. ' + (f.expediente || 's/d') + ' · nacimiento ' + (f.fecha_nacimiento || 's/d') + ' · estudio del ' + fechaCorta(f.fecha_estudio) + '. Compare con los datos del reporte antes de confirmar.'));
    }
    caja.appendChild(lienzo);
    if (!f.reporte) {
      lienzo.classList.add('vacio-rep');
      lienzo.textContent = 'Aún no se ha cargado el reporte.' + (censo ? ' El reporte del ecógrafo se busca automáticamente cada hora (7:00 a. m. a 3:59 p. m.); también puede buscarlo en el censo o subir una foto o un PDF.' : '');
      if (!f.anulado) agregar(acciones, [boton('+ Subir reporte', 'primario', function () { subirReporte(f).then(alCambiar); }), buscar]);
      return caja;
    }
    if (revisar) {
      agregar(acciones, [
        boton('Sí, corresponde', 'primario', function (b) { accionReporte(f, 'reporte.confirmar', b, 'Reporte confirmado.', alCambiar); }),
        boton('No corresponde', 'peligro', function (b) { accionReporte(f, 'reporte.quitar', b, 'Se quitó el reporte propuesto; no se volverá a proponer.', alCambiar); }),
        buscar]);
    }
    lienzo.appendChild(h('div', null, h('div', { class: 'giro' }), h('div', { style: 'margin-top:8px' }, 'Cargando…')));
    obtenerReporte(f).then(function (a) {
      lienzo.textContent = '';
      agregar(acciones, [h('a', { class: 'btn chico', href: a.url, target: '_blank', rel: 'noopener' }, 'Abrir'),
        h('a', { class: 'btn chico', href: a.url, download: a.nombre }, 'Descargar')]);
      if (!f.anulado && !revisar) {
        if (/^image\//.test(a.tipo)) {
          acciones.appendChild(boton('Editar imagen', '', async function () {
            const r = await abrirEditor({ blob: a.blob, original: a.blob, nombre: a.nombre }, 'Editar reporte · ' + (f.nombre || f.id));
            if (r) { await subirReporte(f, { blob: r.blob, nombre: a.nombre.replace(/\.\w+$/, '') + '.jpg' }); alCambiar(); }
          }));
        }
        agregar(acciones, [buscar, boton('Reemplazar', '', function () { subirReporte(f).then(alCambiar); }),
          boton('Quitar', 'peligro', async function (b) {
            const texto = esDelCenso(f) ? ['El registro quedará sin reporte. El archivo del ecógrafo no se toca, y no se le volverá a proponer a este registro.']
              : ['El archivo irá a la papelera de Google Drive de la cuenta del sistema (se puede recuperar durante 30 días).'];
            if (!(await preguntar('Quitar el reporte', texto, 'Quitar reporte', 'Volver', 'peligro'))) return;
            accionReporte(f, 'reporte.quitar', b, 'Reporte quitado.', alCambiar);
          })]);
      }
      if (a.tipo === 'application/pdf') {
        if (navigator.pdfViewerEnabled) lienzo.appendChild(h('iframe', { src: a.url, title: 'Reporte PDF' }));
        else lienzo.textContent = 'Documento PDF. Use "Abrir" para verlo.';
      } else {
        lienzo.appendChild(h('img', { src: a.url, alt: 'Reporte del estudio', title: 'Clic para ampliar', onclick: function () { visor(a.url); } }));
      }
    }).catch(function (e) { lienzo.textContent = 'No se pudo cargar: ' + e.message; });
    return caja;
  }
  function verReporte(f) {
    abrirModal(function (cerrar) {
      const cuerpo = h('div', { class: 'modal-cuerpo formulario' });
      const pintarR = function () {
        const x = S.filas.get(f.id) || f;
        cuerpo.textContent = '';
        cuerpo.appendChild(panelReporte(x, function () { pintarR(); }));
      };
      pintarR();
      return h('div', { class: 'modal' },
        h('div', { class: 'modal-cab' }, h('div', { style: 'min-width:0' }, h('h2', null, f.nombre || 'Paciente sin nombre'),
          h('div', { class: 'meta' }, h('span', null, f.estudio || 'Sin estudio'), h('span', null, '· ' + fechaLarga(f.fecha_estudio)),
            h('span', null, '· Exp. ' + (f.expediente || 's/d')), h('span', null, '· Nac. ' + (f.fecha_nacimiento || 's/d')), h('span', null, '· ' + f.id))),
        h('button', { class: 'btn chico x', onclick: cerrar, 'aria-label': 'Cerrar' }, '✕ Cerrar')), cuerpo);
    }, { alCerrar: function () { pintar(); } });
  }

  /** Busca en el censo de reportes (los más parecidos al paciente primero) y permite elegir el correcto. */
  function elegirDelCenso(f, alCambiar) {
    abrirModal(function (cerrar) {
      const lista = h('div', { class: 'lista-censo' }, h('div', { class: 'vacio' }, 'Buscando en el censo…'));
      const vista = h('div');
      const err = cajaError();
      const q = h('input', { type: 'search', id: 'censo-q', placeholder: 'Nombre, expediente o ID del paciente', autocomplete: 'off', 'data-foco': true });
      let pedido = 0;
      const marca = function (ok, texto) { return h('span', { class: 'chip ' + (ok ? 'ok' : 'gris') }, (ok ? '✓ ' : '✕ ') + texto); };
      const buscar = async function () {
        const n = ++pedido;
        err.textContent = '';
        try {
          const r = await api('reportes.buscar', { id: f.id, q: q.value.trim() });
          if (n === pedido) pintarLista(r);
        } catch (e) { if (n === pedido) { lista.textContent = ''; mostrarError(err, e); } }
      };
      q.addEventListener('input', function () { clearTimeout(q._t); q._t = setTimeout(buscar, 350); });
      const ver = async function (x, btn) {
        try {
          const a = await conBoton(btn, function () { return guardarEnMemoria('censo|' + x.archivo, function () { return api('reporte.archivo', { archivo: x.archivo }); }); });
          vista.textContent = '';
          vista.appendChild(h('div', { class: 'archivo', style: 'margin-bottom:12px' },
            h('div', { class: 'tit' }, h('span', null, (x.paciente || x.nombre_archivo) + ' · ' + fechaHora(x.fecha_hora)),
              h('span', { class: 'acciones-ficha' }, h('a', { class: 'btn chico', href: a.url, target: '_blank', rel: 'noopener' }, 'Abrir en otra pestaña'),
                h('button', { type: 'button', class: 'btn chico', onclick: function () { vista.textContent = ''; } }, 'Ocultar'))),
            h('div', { class: 'lienzo' }, navigator.pdfViewerEnabled ? h('iframe', { src: a.url, title: 'Reporte del censo' }) : 'Documento PDF. Use "Abrir en otra pestaña" para verlo.')));
          vista.scrollIntoView({ block: 'start' });
        } catch (e) { mostrarError(err, e); }
      };
      const elegir = async function (x, btn) {
        let mover = false, otra = null;
        for (;;) {
          try {
            const r = await conBoton(btn, function () { return api('reporte.vincular', { id: f.id, archivo: x.archivo, mover: mover }); });
            olvidarReporte(f.id);
            aplicarFila(r);
            break;
          } catch (e) {
            if (e.code === 'VINCULADO_A_OTRA' && !mover) {
              const idOtra = e.datos;
              otra = S.filas.get(idOtra) || null;
              const quien = otra ? ' (' + (otra.nombre || 'sin nombre') + ', ' + (otra.estudio || 'sin estudio') + ' del ' + fechaCorta(otra.fecha_estudio) + ')' : '';
              if (!(await preguntar('Ese reporte está en otro registro', 'Está vinculado al registro ' + idOtra + quien + '. ¿Moverlo a este registro? El otro quedará sin reporte.', 'Sí, moverlo aquí', 'Cancelar'))) return;
              mover = true;
              continue;
            }
            mostrarError(err, e);
            return;
          }
        }
        if (otra) { // el otro registro quedó sin reporte
          Object.assign(otra, { reporte: '', repTipo: '', reporte_estado: '', reporte_detalle: 'El reporte se movió al registro ' + f.id + '.' });
          olvidarReporte(otra.id);
        }
        cerrar();
        tostada('Reporte vinculado a ' + (f.nombre || f.id) + '.');
        refrescarDetalle(f.id);
        if (alCambiar) alCambiar();
      };
      const pintarLista = function (r) {
        lista.textContent = '';
        if (!r.reportes.length) {
          lista.appendChild(h('div', { class: 'vacio' }, q.value.trim() ? 'Ningún reporte del censo coincide con la búsqueda.' :
            'Ningún reporte del censo coincide con el expediente, el nombre o la fecha de nacimiento. Busque por nombre o ID.'));
        }
        r.reportes.forEach(function (x) {
          const actual = x.registro === f.id;
          lista.appendChild(h('div', { class: 'item-censo' + (actual ? ' actual' : '') },
            h('div', { class: 'crece' }, h('b', null, x.paciente || x.nombre_archivo),
              h('div', { class: 'tenue' }, 'ID: ' + (x.id_paciente || '—') + ' · nacimiento: ' + (x.fnac || '—') + ' · estudio: ' + (fechaHora(x.fecha_hora) || '—')),
              h('div', { class: 'chips' }, marca(x.coincide.expediente, 'Expediente'), marca(x.coincide.nombre, 'Nombre'), marca(x.coincide.fnac, 'Nacimiento'),
                x.registro ? h('span', { class: 'chip ' + (actual ? 'azul' : 'alerta') }, actual ? 'Es el reporte actual' : 'En el registro ' + x.registro) : null)),
            h('div', { class: 'acciones-ficha' },
              h('button', { type: 'button', class: 'btn chico', onclick: function (ev) { ver(x, ev.currentTarget); } }, 'Ver'),
              actual ? null : h('button', { type: 'button', class: 'btn chico primario', onclick: function (ev) { elegir(x, ev.currentTarget); } }, 'Elegir este'))));
        });
        lista.appendChild(h('p', { class: 'tenue', style: 'margin:10px 0 0;font-size:13px' }, 'Reportes en el censo: ' + r.total_censo + '. Se muestran hasta 40, primero los que más coinciden y los más cercanos a la fecha del estudio.'));
      };
      buscar();
      return h('div', { class: 'modal' },
        h('div', { class: 'modal-cab' },
          h('div', { style: 'min-width:0' }, h('h2', null, 'Elegir reporte del censo'),
            h('div', { class: 'meta' }, h('span', null, f.nombre || 'Sin nombre'), h('span', null, '· Exp. ' + (f.expediente || 's/d')), h('span', null, '· Nac. ' + (f.fecha_nacimiento || 's/d')),
              h('span', null, '· Estudio del ' + fechaCorta(f.fecha_estudio)))),
          h('button', { class: 'btn chico x', onclick: cerrar, 'aria-label': 'Cerrar' }, '✕ Cerrar')),
        h('div', { class: 'modal-cuerpo formulario' }, vista,
          h('div', { class: 'campo' }, h('label', { for: 'censo-q' }, 'Buscar (vacío = los que coinciden con el paciente)'), q), err, lista));
    });
  }

  /* ---- comentario con plantillas ---- */
  function seccionComentario(f0) {
    let f = f0;
    let guardado = f.comentario || '';
    const txt = h('textarea', { id: 'comentario-txt', rows: '5', maxlength: '5000', placeholder: 'Comentario sobre el estudio o el paciente…', 'aria-label': 'Comentario' });
    txt.value = guardado;
    const info = h('span', { class: 'tenue' });
    const pintarInfo = function () {
      const cambios = txt.value !== guardado;
      info.textContent = (cambios ? 'Sin guardar · ' : f.comentario_por ? 'Guardado por ' + f.comentario_por + ' · ' : '') + txt.value.length + '/5000';
      info.classList.toggle('sin-guardar', cambios);
    };
    txt.addEventListener('input', pintarInfo);
    const plantillas = S.plantillas.filter(function (p) { return !p.estudio || p.estudio === f.estudio; });
    // Al elegir una plantilla se inserta donde está el cursor (o llena el cuadro si está vacío).
    const sel = plantillas.length ? selector([['', 'Insertar plantilla…']].concat(plantillas.map(function (p, i) { return [String(i), p.nombre]; })), '',
      { id: 'plantilla-sel', 'aria-label': 'Insertar plantilla', onchange: function () {
        if (sel.value === '') return;
        const p = plantillas[Number(sel.value)];
        sel.value = '';
        const v = txt.value;
        if (!v.trim()) txt.value = p.texto;
        else {
          const ini = typeof txt.selectionStart === 'number' ? txt.selectionStart : v.length, fin = typeof txt.selectionEnd === 'number' ? txt.selectionEnd : v.length;
          const antes = v.slice(0, ini), despues = v.slice(fin);
          txt.value = antes + (antes && !/\n$/.test(antes) ? '\n' : '') + p.texto + (despues && !/^\n/.test(despues) ? '\n' : '') + despues;
        }
        txt.focus();
        pintarInfo();
      } }) : null;
    const guardar = h('button', { type: 'button', class: 'btn primario', id: 'comentario-guardar', onclick: async function (ev) {
      try {
        const r = await conBoton(ev.currentTarget, function () { return api('comentario.guardar', { id: f.id, texto: txt.value }); });
        f = aplicarFila(r);
        txt.value = guardado = f.comentario || '';
        pintarInfo();
        tostada(guardado ? 'Comentario guardado.' : 'Comentario borrado.');
      } catch (e) { tostada(e.message, { error: true }); }
    } }, 'Guardar comentario');
    pintarInfo();
    return {
      sinGuardar: function () { return txt.value !== guardado; },
      seccion: h('section', { class: 'ficha todo comentario' }, h('h3', null, 'Comentario'), txt,
        h('div', { class: 'barra-com' }, info, h('div', { class: 'acciones-ficha' }, sel ||
          (esAdmin() ? h('span', { class: 'tenue', style: 'font-size:13px' }, 'Puede crear plantillas en "Usuarios y médicos".') : null), guardar)))
    };
  }

  /* ---- ficha completa ---- */
  function dato(et, valor) { return h('div', null, h('dt', null, et), h('dd', null, valor || '—')); }
  function refrescarDetalle(id) { if (S.detalleAbierto && S.detalleAbierto.id === id) S.detalleAbierto.fn(S.filas.get(id)); }
  function abrirDetalle(f0) {
    let f = f0;
    const cuerpo = h('div', { class: 'modal-cuerpo' });
    const cab = h('div', { style: 'min-width:0' });
    // El comentario se crea una sola vez: lo escrito no se pierde cuando la ficha se vuelve a dibujar.
    const comentario = seccionComentario(f);
    const pintarFicha = function () {
      cab.textContent = '';
      cuerpo.textContent = '';
      const m = imcSc(f.peso, f.talla);
      agregar(cab, [h('h2', null, f.nombre || 'Paciente sin nombre'),
        h('div', { class: 'meta' }, h('span', null, f.estudio || 'Sin estudio'), h('span', null, '·'), h('span', null, fechaLarga(f.fecha_estudio)),
          h('span', null, '·'), h('span', null, f.id),
          f.origen === 'HISTÓRICO' ? h('span', { class: 'chip gris' }, 'Hoja anterior') : null,
          f.anulado ? h('span', { class: 'chip urg' }, 'Anulado') : null,
          S.repetidos.has(f.id) ? h('span', { class: 'chip rep' }, 'Posible repetido') : null)]);
      agregar(cuerpo, [
        f.anulado ? h('div', { class: 'aviso alerta todo', style: 'margin:0' }, 'Registro anulado el ' + fechaHora(f.anulado.split(' · ')[0]) + ' por ' + (f.anulado.split(' · ')[1] || '') + '. No cuenta en el censo ni en las estadísticas.') : null,
        h('section', { class: 'ficha' }, h('h3', null, 'Paciente'), h('dl', { class: 'datos' },
          dato('Expediente', f.expediente), dato('Fecha de nacimiento', f.fecha_nacimiento),
          dato('Edad', f.edad === '' ? '' : f.edad === '0' ? edadCorta(f).replace(' m', ' meses').replace(' d', ' días') : f.edad + ' años'),
          dato('Sexo', f.sexo), h('div', { style: 'grid-column:1/-1' }, h('dt', null, 'Proviene de'), h('dd', null, f.procedencia || '—')))),
        h('section', { class: 'ficha' }, h('h3', null, 'Signos vitales y medidas'), h('dl', { class: 'datos' },
          dato('Presión arterial', f.pa ? f.pa + ' mmHg' : ''), dato('Frec. cardiaca', f.fc ? f.fc + ' lpm' : ''), dato('Frec. respiratoria', f.fr ? f.fr + ' rpm' : ''),
          dato('SatO2', f.sato2 ? f.sato2 + ' %' : ''), dato('Peso', f.peso ? f.peso + ' kg' : ''), dato('Talla', f.talla ? f.talla + ' cm' : ''),
          dato('IMC', m ? m.imc : ''), dato('Superficie corporal', m ? m.sc + ' m²' : ''))),
        h('section', { class: 'ficha todo' }, h('h3', null, 'Información clínica'),
          h('p', { class: 'texto-largo' }, h('b', null, 'Diagnósticos previos'), f.diagnostico || '—'),
          h('p', { class: 'texto-largo' }, h('b', null, 'Hallazgos'), f.hallazgos ? f.hallazgos.split(' | ').join(' · ') : '—'),
          f.observaciones ? h('p', { class: 'texto-largo' }, h('b', null, 'Observaciones'), f.observaciones) : null,
          f.notas ? h('p', { class: 'texto-largo' }, h('b', null, 'Otros datos (hoja anterior)'), f.notas) : null),
        h('section', { class: 'ficha todo' }, h('h3', null, 'Resultado'), h('div', { class: 'fila-form' },
          h('div', { class: 'campo', style: 'flex:0 1 280px' }, h('label', { for: 'fi-res' }, 'Realizado por'), (function () { const s = selectorMarcado(f); s.id = 'fi-res'; s.style.maxWidth = 'none'; return s; })()),
          h('div', { class: 'tenue', style: 'flex:1 1 200px;padding-bottom:10px' }, 'Registrado el ' + fechaHora(f.fecha_hora) + (f.registrado_por ? ' por ' + f.registrado_por : '') +
            (f.modificado ? ' · última modificación ' + fechaHora(f.modificado.split(' · ')[0]) + ' por ' + (f.modificado.split(' · ')[1] || '') : '')))),
        h('section', { class: 'todo' }, panelReporte(f, function () { f = S.filas.get(f.id) || f; pintarFicha(); })),
        comentario.seccion,
        h('section', { class: 'todo acciones-ficha' },
          !f.anulado ? h('button', { class: 'btn primario', onclick: function () { editarRegistro(f); } }, 'Editar datos') : null,
          !f.anulado ? h('button', { class: 'btn peligro', onclick: function (ev) { anular(f, true, ev.currentTarget); } }, 'Anular registro') : null,
          f.anulado && esAdmin() ? h('button', { class: 'btn', onclick: function (ev) { anular(f, false, ev.currentTarget); } }, 'Restaurar registro') : null)
      ]);
    };
    pintarFicha();
    S.detalleAbierto = { id: f.id, fn: function (x) { if (x) f = x; pintarFicha(); } };
    abrirModal(function (cerrar, intentarCerrar) {
      return h('div', { class: 'modal' }, h('div', { class: 'modal-cab' }, cab, h('button', { class: 'btn chico x', onclick: intentarCerrar, 'aria-label': 'Cerrar' }, '✕ Cerrar')), cuerpo);
    }, { alCerrar: function () { S.detalleAbierto = null; pintar(); },
      antesDeCerrar: function () {
        return !comentario.sinGuardar() || preguntar('Comentario sin guardar', 'Escribió un comentario que todavía no se ha guardado.', 'Cerrar sin guardar', 'Seguir editando', 'peligro');
      } });
  }
  async function anular(f, valor, btn) {
    if (valor && !(await preguntar('Anular registro', ['El registro de ' + (f.nombre || f.id) + ' (' + (f.estudio || 'sin estudio') + ') dejará de contar en el censo y en las estadísticas.',
      'No se borra: queda en la hoja, marcado como anulado, y un administrador puede restaurarlo.'], 'Anular', 'Volver', 'peligro'))) return;
    try {
      const r = await conBoton(btn, function () { return api('registros.anular', { id: f.id, valor: valor }); });
      f = aplicarFila(r);
      tostada(valor ? 'Registro anulado.' : 'Registro restaurado.', valor ? { accion: { texto: esAdmin() ? 'Deshacer' : 'Entendido', fn: function () { if (esAdmin()) anular(f, false, h('button')); } } } : null);
      refrescarDetalle(f.id);
    } catch (e) { tostada(e.message, { error: true }); }
  }
  function editarRegistro(f) {
    const F = formularioDe(f);
    abrirModal(function (cerrar) {
      const raiz = h('div');
      F.raiz = raiz;
      F.alGuardar = function (x, sinCambios) { cerrar(); tostada(sinCambios ? 'No había cambios que guardar.' : 'Cambios guardados.'); refrescarDetalle(x.id); };
      raiz.appendChild(construirFormulario(F));
      return h('div', { class: 'modal' }, h('div', { class: 'modal-cab' }, h('div', null, h('h2', null, 'Editar registro'),
        h('div', { class: 'meta' }, f.id + ' · ' + (f.nombre || 'sin nombre'))), h('button', { class: 'btn chico x', onclick: function () {
        if (F.sucio && !confirm('¿Salir sin guardar los cambios?')) return;
        cerrar();
      }, 'aria-label': 'Cerrar' }, '✕')), h('div', { class: 'modal-cuerpo formulario' }, raiz));
    }, { antesDeCerrar: function () { return !F.sucio || confirm('¿Salir sin guardar los cambios?'); } });
  }

  /* ---- tabla ---- */
  const COLS = {
    marcar: { t: 'Realizado por', clase: 'c-marcar', celda: selectorMarcado },
    reporte: { t: 'Reporte del estudio', clase: 'c-rep', celda: celdaReporte },
    fecha: { t: 'Fecha', orden: 'fecha', clase: 'nowrap', e: 'Fecha', celda: function (f) {
      return [fechaCorta(f.fecha_estudio), h('div', { class: 'tenue' }, 'reg. ' + String(f.fecha_hora).slice(11, 16) + (f.fecha_hora.slice(0, 10) !== f.fecha_estudio ? ' del ' + fechaCorta(f.fecha_hora).slice(0, 5) : ''))];
    } },
    paciente: { t: 'Paciente', orden: 'nombre', clase: 'c-pac pac', celda: function (f) {
      return [h('b', null, f.nombre || 'Sin nombre'), h('span', { class: 'tenue' }, 'Exp. ' + (f.expediente || 's/d') + ' · ' + f.id),
        f.anulado ? h('span', { class: 'chip urg', style: 'margin-left:6px' }, 'Anulado') : null,
        S.repetidos.has(f.id) ? h('span', { class: 'chip rep', style: 'margin-left:6px', title: 'Mismo expediente y estudio con menos de 8 días de diferencia' }, 'Posible repetido') : null];
    } },
    edad: { t: 'Edad · sexo', orden: 'edad', clase: 'nowrap', e: 'Edad', celda: function (f) { return edadCorta(f) + (f.sexo ? ' · ' + f.sexo.charAt(0) : ''); } },
    procedencia: { t: 'Proviene de', orden: 'procedencia', clase: 'c-proc', e: 'Proviene de', celda: function (f) { return f.procedencia ? procCorta(f.procedencia) : h('span', { class: 'tenue' }, '—'); } },
    estudio: { t: 'Estudio · hallazgos', orden: 'estudio', clase: 'c-est', celda: function (f) {
      const hs = f.hallazgos ? f.hallazgos.split(' | ') : [];
      return [h('span', null, f.estudio || h('span', { class: 'tenue' }, 'Sin estudio')), hs.length ? h('span', { class: 'hall' }, hs.slice(0, 2).join(' · ') + (hs.length > 2 ? ' +' + (hs.length - 2) : '')) : null];
    } }
  };
  function tabla(filas, u, op) {
    const o = op || {};
    if (!filas.length) return h('div', { class: 'tabla-caja' }, h('div', { class: 'vacio' }, S.sincronizado ? (o.vacio || 'No hay registros.') : 'Cargando registros…'));
    const visibles = filas.slice(0, u.limite);
    const cuerpo = h('tbody');
    visibles.forEach(function (f) {
      cuerpo.appendChild(h('tr', { class: f.anulado ? 'anulada' : '', tabindex: '0', 'data-id': f.id,
        onclick: function () { abrirDetalle(f); },
        onkeydown: function (ev) { if (ev.key === 'Enter' && ev.target.tagName === 'TR') abrirDetalle(f); } },
      o.columnas.map(function (k) { const c = COLS[k]; return h('td', { class: c.clase || null, 'data-e': c.e || null }, c.celda(f)); })));
    });
    const col = function (k) {
      const c = COLS[k];
      const ord = c.orden || (k === 'marcar' ? 'medico' : null);
      return h('th', null, ord ? h('button', { title: 'Ordenar por ' + c.t.toLowerCase(), onclick: function () { if (u.orden === ord) u.dir = -u.dir; else { u.orden = ord; u.dir = 1; } pintar(); } },
        c.t + (u.orden === ord ? (u.dir > 0 ? ' ↑' : ' ↓') : '')) : c.t);
    };
    return h('div', { class: 'tabla-caja' },
      h('div', { class: 'tabla-scroll' }, h('table', { class: 'censo' }, h('thead', null, h('tr', null, o.columnas.map(col))), cuerpo)),
      h('div', { class: 'pie-tabla' }, h('span', null, 'Mostrando ' + visibles.length + ' de ' + plural(filas.length, 'registro', 'registros')),
        filas.length > visibles.length ? h('button', { class: 'btn chico', onclick: function () { u.limite += 150; pintar(); } }, 'Mostrar más') : null));
  }

  function rangoRapido(clave) {
    const d = hoy();
    if (clave === 'hoy') return [d, d];
    if (clave === 'ayer') return [sumarDias(d, -1), sumarDias(d, -1)];
    if (clave === 'semana') return [sumarDias(d, -(diaSemana(d) - 1)), d];
    if (clave === 'mes') return [d.slice(0, 8) + '01', d];
    if (clave === '30') return [sumarDias(d, -30), d];
    return ['', ''];
  }
  function uiCenso() {
    const r30 = rangoRapido('30');
    return ui('censo', { orden: 'fecha', dir: -1, desde: r30[0], hasta: r30[1], rapido: '30', estudio: '', proc: '', medico: '', reporte: '', anulados: false, falta: '' });
  }
  function vistaCenso(main) {
    const u = uiCenso();
    const err = cajaError();
    const enRango = filasArr().filter(function (f) { return (!u.desde || f.fecha_estudio >= u.desde) && (!u.hasta || f.fecha_estudio <= u.hasta); });
    const base = enRango.filter(function (f) {
      if (f.anulado && !u.anulados) return false;
      if (u.estudio && f.estudio !== u.estudio && !(u.estudio === OTRO && /^Otro: /.test(f.estudio))) return false;
      if (u.proc && f.procedencia !== u.proc && !(u.proc === OTRO && /^Otro: /.test(f.procedencia))) return false;
      if (u.medico === '-' ? f.estado !== 'PENDIENTE' : u.medico === 'NO' ? f.estado !== 'NO REALIZADO' : u.medico && f.realizado_por !== u.medico) return false;
      if (u.reporte === 'con' ? !conReporte(f) : u.reporte === 'sin' ? !!f.reporte : u.reporte === 'revisar' ? !porRevisar(f) : false) return false;
      return true;
    });
    const activos = base.filter(function (f) { return !f.anulado; });
    const nSinMedico = activos.filter(function (f) { return f.estado === 'PENDIENTE'; }).length;
    const nSinReporte = activos.filter(function (f) { return f.estado === 'REALIZADO' && !f.reporte; }).length;
    const nRevisar = activos.filter(porRevisar).length;
    const filas = base.filter(function (f) {
      if (u.falta === 'medico') return f.estado === 'PENDIENTE' && !f.anulado;
      if (u.falta === 'reporte') return f.estado === 'REALIZADO' && !f.reporte && !f.anulado;
      if (u.falta === 'revisar') return porRevisar(f);
      return true;
    });
    const q = norm(u.q.trim());
    const palabras = q ? q.split(/\s+/) : [];
    const visibles = (palabras.length ? filas.filter(function (f) { return palabras.every(function (p) { return f.busca.indexOf(p) >= 0; }); }) : filas.slice())
      .sort(ORDENES[u.orden][1]);
    if (u.dir < 0) visibles.reverse();

    const pedir = async function (desde, btn) {
      try {
        await conBoton(btn, function () { return cargarAntiguos(desde); });
        u.desde = desde === '0000-01-01' ? '' : desde;
        if (desde === '0000-01-01') { u.hasta = ''; u.rapido = 'todo'; }
        pintar();
      } catch (e) { mostrarError(err, e); }
    };
    const fijar = function (desde, hasta, rapido) {
      u.rapido = rapido || '';
      u.hasta = hasta;
      u.limite = 150;
      if (desde && S.desde && desde < S.desde) { cargarAntiguos(desde).then(function () { u.desde = desde; pintar(); }).catch(function (e) { tostada(e.message, { error: true }); }); return; }
      u.desde = desde;
      pintar();
    };
    const usados = function (campo, lista) {
      const vistos = {};
      enRango.forEach(function (f) { if (f[campo]) vistos[/^Otro: /.test(f[campo]) ? OTRO : f[campo]] = true; });
      return lista.filter(function (x) { return vistos[x]; }).concat(vistos[OTRO] ? [OTRO] : []).concat(Object.keys(vistos).filter(function (x) { return lista.indexOf(x) < 0 && x !== OTRO; }).sort());
    };
    const filtro = function (id, etiqueta, control) { return h('div', { class: 'campo chico' }, h('label', { for: id }, etiqueta), control); };
    const sel = function (id, etiqueta, opciones, valor, fn) { return filtro(id, etiqueta, selector(opciones, valor, { id: id, onchange: function (ev) { fn(ev.target.value); u.limite = 150; pintar(); } })); };
    const nFiltros = [u.estudio, u.proc, u.medico, u.reporte, u.anulados].filter(Boolean).length + (u.rapido ? 0 : 1);
    const medicosOp = S.medicos.map(function (m) { return [m.nombre, m.nombre]; });
    enRango.forEach(function (f) { if (f.realizado_por && !medicosOp.some(function (m) { return m[0] === f.realizado_por; })) medicosOp.push([f.realizado_por, f.realizado_por]); });
    const buscar = h('input', { type: 'search', id: 'buscar', placeholder: 'Nombre, expediente, estudio, hallazgo…', value: u.q,
      oninput: function (ev) { u.q = ev.target.value; u.limite = 150; clearTimeout(buscar._t); buscar._t = setTimeout(function () { pintar(); }, 180); } });

    agregar(main, [
      h('div', { class: 'cab' }, h('h2', null, 'Censo de estudios ambulatorios'),
        h('a', { class: 'btn primario no-imprimir', href: '#/registro' }, '+ Nuevo registro'),
        h('button', { class: 'btn no-imprimir', onclick: function () { window.print(); } }, 'Imprimir'),
        h('button', { class: 'btn oscuro no-imprimir', onclick: function () { exportarCsv(visibles); } }, 'Descargar (CSV)')),
      err,
      h('div', { class: 'rapidos', role: 'group', 'aria-label': 'Periodo' }, [['hoy', 'Hoy'], ['ayer', 'Ayer'], ['semana', 'Esta semana'], ['mes', 'Este mes'], ['30', 'Últimos 30 días']].map(function (x) {
        return h('button', { type: 'button', class: 'rapido', 'aria-pressed': String(u.rapido === x[0]), onclick: function () { const r = rangoRapido(x[0]); fijar(r[0], r[1], x[0]); } }, x[1]);
      }).concat([h('button', { type: 'button', class: 'rapido', 'aria-pressed': String(u.rapido === 'todo'), onclick: function (ev) { pedir('0000-01-01', ev.currentTarget); } }, 'Todo el historial')])),
      h('div', { class: 'filtros' }, h('div', { class: 'campo buscar' }, h('label', { for: 'buscar' }, 'Buscar'), buscar),
        h('button', { type: 'button', class: 'btn solo-tel', id: 'ver-filtros', 'aria-expanded': String(!!u.verFiltros), onclick: function () { u.verFiltros = !u.verFiltros; pintar(); } },
          (u.verFiltros ? 'Ocultar filtros' : 'Filtros') + (nFiltros ? ' (' + nFiltros + ')' : ''))),
      h('div', { class: 'filtros' + (u.verFiltros ? '' : ' plegados') },
        filtro('f-desde', 'Desde', h('input', { type: 'date', id: 'f-desde', value: u.desde, onchange: function (ev) { fijar(ev.target.value, u.hasta, ''); } })),
        filtro('f-hasta', 'Hasta', h('input', { type: 'date', id: 'f-hasta', value: u.hasta, onchange: function (ev) { u.hasta = ev.target.value; u.rapido = ''; pintar(); } })),
        sel('f-estudio', 'Estudio', [['', 'Todos']].concat(usados('estudio', ESTUDIOS).map(function (x) { return [x, x === OTRO ? 'Otros' : x]; })), u.estudio, function (v) { u.estudio = v; }),
        sel('f-proc', 'Proviene de', [['', 'Todos']].concat(usados('procedencia', PROCEDENCIAS).map(function (x) { return [x, x === OTRO ? 'Otros' : procCorta(x)]; })), u.proc, function (v) { u.proc = v; }),
        sel('f-medico', 'Realizado por', [['', 'Todos'], ['-', 'Sin indicar'], ['NO', 'No se realizó']].concat(medicosOp), u.medico, function (v) { u.medico = v; }),
        sel('f-rep', 'Reporte', [['', 'Todos'], ['con', 'Con reporte'], ['sin', 'Sin reporte'], ['revisar', 'Por revisar']], u.reporte, function (v) { u.reporte = v; }),
        h('label', { class: 'interruptor', style: 'min-height:42px' }, h('input', { type: 'checkbox', id: 'f-anulados', checked: u.anulados, onchange: function (ev) { u.anulados = ev.target.checked; pintar(); } }), 'Mostrar anulados')),
      h('div', { class: 'resumen-censo' },
        h('button', { type: 'button', 'aria-pressed': String(!u.falta), onclick: function () { u.falta = ''; pintar(); } }, h('b', null, activos.length), ' ', activos.length === 1 ? 'registro' : 'registros'),
        h('button', { type: 'button', id: 'falta-medico', 'aria-pressed': String(u.falta === 'medico'), onclick: function () { u.falta = u.falta === 'medico' ? '' : 'medico'; pintar(); } }, h('b', null, nSinMedico), ' sin indicar quién lo realizó'),
        h('button', { type: 'button', id: 'falta-reporte', 'aria-pressed': String(u.falta === 'reporte'), onclick: function () { u.falta = u.falta === 'reporte' ? '' : 'reporte'; pintar(); } }, h('b', null, nSinReporte), ' realizados sin reporte'),
        nRevisar || u.falta === 'revisar' ? h('button', { type: 'button', id: 'falta-revisar', class: 'revisar', 'aria-pressed': String(u.falta === 'revisar'), onclick: function () { u.falta = u.falta === 'revisar' ? '' : 'revisar'; pintar(); } }, h('b', null, nRevisar), ' reportes por revisar') : null),
      tabla(visibles, u, { columnas: ['marcar', 'reporte', 'fecha', 'paciente', 'edad', 'procedencia', 'estudio'], vacio: 'No hay registros con estos filtros.' }),
      h('p', { class: 'no-imprimir tenue', style: 'font-size:13.5px' }, (S.desde > '0000-01-01' ? 'Datos cargados desde el ' + fechaCorta(S.desde) + '. Para fechas anteriores cambie "Desde" o use "Todo el historial". ' : 'Historial completo cargado. ') +
        'Toque un paciente para ver la ficha completa, editar sus datos o anular el registro.')
    ]);
  }

  function descargar(nombre, contenido) {
    const url = URL.createObjectURL(new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' }));
    const a = h('a', { href: url, download: nombre });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function celdaCsv(v) {
    let s = String(v === undefined || v === null ? '' : v);
    if (/^[=+\-@\t]/.test(s)) s = "'" + s; // evita que Excel lo interprete como fórmula
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function exportarCsv(filas) {
    if (!filas.length) { tostada('No hay filas para descargar.'); return; }
    if (!confirm('El archivo contendrá datos de ' + plural(filas.length, 'paciente', 'pacientes') + '. Guárdelo solo en un equipo institucional. ¿Descargar?')) return;
    const cols = [['id', 'Registro'], ['fecha_estudio', 'Fecha del estudio'], ['fecha_hora', 'Registrado'], ['estudio', 'Estudio'], ['procedencia', 'Proviene de'],
      ['expediente', 'Expediente'], ['nombre', 'Paciente'], ['fecha_nacimiento', 'Fecha de nacimiento'], ['edad', 'Edad'], ['sexo', 'Sexo'],
      ['diagnostico', 'Diagnósticos previos'], ['pa', 'Presión arterial'], ['fc', 'FC'], ['fr', 'FR'], ['sato2', 'SatO2'], ['peso', 'Peso (kg)'], ['talla', 'Talla (cm)'],
      ['estado', 'Estado'], ['realizado_por', 'Realizado por'], ['motivo_no', 'Motivo de no realización'], ['hallazgos', 'Hallazgos'], ['repTipo', 'Reporte'], ['reporte_estado', 'Estado del reporte'],
      ['observaciones', 'Observaciones'], ['comentario', 'Comentario'], ['comentario_por', 'Comentario guardado por'], ['registrado_por', 'Registrado por'], ['anulado', 'Anulado'], ['origen', 'Origen']];
    const lineas = [cols.map(function (c) { return celdaCsv(c[1]); }).join(',')];
    filas.forEach(function (f) { lineas.push(cols.map(function (c) { return celdaCsv(f[c[0]]); }).join(',')); });
    descargar('censo_ambulatorio_' + hoy() + '.csv', lineas.join('\r\n'));
  }

  /* ============================== estadísticas ============================== */
  function contar(filas, fn, orden) {
    const m = {};
    filas.forEach(function (f) { const ks = [].concat(fn(f)); ks.forEach(function (k0) { const k = k0 || 'Sin dato'; m[k] = (m[k] || 0) + 1; }); });
    let pares = Object.keys(m).map(function (k) { return [k, m[k]]; });
    if (orden) pares = orden.map(function (k) { return [k, m[k] || 0]; }).concat(pares.filter(function (p) { return orden.indexOf(p[0]) < 0; }).sort(function (a, b) { return b[1] - a[1]; }));
    else pares.sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0], 'es'); });
    return pares;
  }
  function grupoEdad(f) {
    if (f.edad === '') return 'Sin dato';
    const n = Number(f.edad);
    const g = GRUPOS_EDAD.filter(function (x) { return n >= x[1] && n <= x[2]; })[0];
    return g ? g[0] : 'Sin dato';
  }
  function estudioBase(f) { return /^Otro: /.test(f.estudio) ? f.estudio.slice(6) + ' (otro)' : f.estudio || 'Sin estudio'; }
  function procBase(f) { return f.procedencia ? (/^Otro: /.test(f.procedencia) ? f.procedencia.slice(6) + ' (otro)' : f.procedencia) : 'Sin dato'; }
  function barras(pares, nombres, vacio) {
    const total = pares.reduce(function (s, p) { return s + p[1]; }, 0);
    const max = Math.max.apply(null, pares.map(function (p) { return p[1]; }).concat([1]));
    if (!total) return h('p', { class: 'tenue', style: 'margin:0' }, vacio || 'Sin datos en este periodo.');
    return h('div', { class: 'barras' }, pares.map(function (p) {
      const et = nombres ? nombres(p[0]) : p[0];
      return h('div', { class: 'barra-f' }, h('span', { class: 'et', title: p[0] }, et),
        h('span', { class: 'pista' }, p[1] ? h('span', { class: 'relleno', style: 'display:block;width:' + (p[1] / max * 100).toFixed(1) + '%' }) : null),
        h('span', { class: 'val' }, p[1], h('small', null, Math.round(p[1] / total * 100) + '%')));
    }));
  }
  function periodoStats(u) {
    if (u.tipo === 'anio') return [u.anio + '-01-01', u.anio + '-12-31', 'del año ' + u.anio];
    if (u.tipo === 'rango') return [u.desde, u.hasta, 'del ' + fechaCorta(u.desde) + ' al ' + fechaCorta(u.hasta)];
    const p = u.mes.split('-').map(Number);
    return [u.mes + '-01', new Date(Date.UTC(p[0], p[1], 0)).toISOString().slice(0, 10), 'de ' + MESES[p[1] - 1] + ' de ' + p[0]];
  }
  function vistaEstadisticas(main) {
    const d = hoy();
    const u = ui('stats', { tipo: 'mes', mes: d.slice(0, 7), anio: d.slice(0, 4), desde: d.slice(0, 8) + '01', hasta: d });
    const per = periodoStats(u);
    const cambiar = function () { S.stats = null; pintar(); };
    const anios = [];
    for (let a = Number(d.slice(0, 4)); a >= 2025; a--) anios.push([String(a), String(a)]);
    agregar(main, [h('div', { class: 'cab' }, h('h2', null, 'Estadísticas ' + per[2]),
      h('div', { class: 'periodo no-imprimir' },
        h('div', { class: 'campo' }, h('label', { for: 'st-tipo' }, 'Periodo'), selector([['mes', 'Mes'], ['anio', 'Año'], ['rango', 'Entre fechas']], u.tipo, { id: 'st-tipo', onchange: function (ev) { u.tipo = ev.target.value; cambiar(); } })),
        u.tipo === 'mes' ? h('div', { class: 'campo' }, h('label', { for: 'st-mes' }, 'Mes'), h('input', { type: 'month', id: 'st-mes', value: u.mes, max: d.slice(0, 7), onchange: function (ev) { if (ev.target.value) { u.mes = ev.target.value; cambiar(); } } })) : null,
        u.tipo === 'anio' ? h('div', { class: 'campo' }, h('label', { for: 'st-anio' }, 'Año'), selector(anios, u.anio, { id: 'st-anio', onchange: function (ev) { u.anio = ev.target.value; cambiar(); } })) : null,
        u.tipo === 'rango' ? [h('div', { class: 'campo' }, h('label', { for: 'st-desde' }, 'Desde'), h('input', { type: 'date', id: 'st-desde', value: u.desde, onchange: function (ev) { if (ev.target.value) { u.desde = ev.target.value; cambiar(); } } })),
          h('div', { class: 'campo' }, h('label', { for: 'st-hasta' }, 'Hasta'), h('input', { type: 'date', id: 'st-hasta', value: u.hasta, onchange: function (ev) { if (ev.target.value) { u.hasta = ev.target.value; cambiar(); } } }))] : null,
        h('button', { class: 'btn', onclick: function () { window.print(); } }, 'Imprimir')))]);
    const llave = per[0] + '|' + per[1];
    if (!S.stats || S.stats.llave !== llave) {
      const cargando = h('div', { class: 'vacio' }, 'Calculando…');
      main.appendChild(cargando);
      if (per[0] > per[1]) { cargando.textContent = 'La fecha "Desde" es posterior a "Hasta".'; return; }
      api('estadisticas', { desde: per[0], hasta: per[1] }).then(function (r) {
        S.stats = { llave: llave, filas: r.filas.map(function (arr) { const o = {}; r.columnas.forEach(function (c, i) { o[c] = arr[i]; }); return o; }) };
        if (ruta()[0] === 'estadisticas') pintar();
      }).catch(function (e) { cargando.textContent = e.message; });
      return;
    }
    const filas = S.stats.filas;
    const real = filas.filter(function (f) { return f.estado === 'REALIZADO'; });
    const noReal = filas.filter(function (f) { return f.estado === 'NO REALIZADO'; });
    const pend = filas.filter(function (f) { return f.estado === 'PENDIENTE'; });
    const conRep = real.filter(function (f) { return f.reporte; });
    const kpi = function (clase, v, t) { return h('div', { class: 'kpi ' + clase }, h('div', { class: 'v' }, v), h('div', { class: 't' }, t)); };
    const panel = function (titulo, contenido, clase, sub) { return h('section', { class: 'panel ' + (clase || '') }, h('h3', null, titulo), sub ? h('p', { class: 'sub' }, sub) : null, contenido); };

    // Tabla resumen: estudio × médico, sexo y grupo de edad (como las hojas mensuales anteriores).
    const estudios = contar(real, estudioBase, ESTUDIOS).filter(function (p) { return p[1]; }).map(function (p) { return p[0]; });
    const medicos = contar(real, function (f) { return f.realizado_por; }, S.medicos.map(function (m) { return m.nombre; })).filter(function (p) { return p[1]; }).map(function (p) { return p[0]; });
    const edades = GRUPOS_EDAD.map(function (g) { return g[0]; }).concat(real.some(function (f) { return f.edad === ''; }) ? ['Sin dato'] : []);
    const cuenta = function (lista, fn) { return lista.filter(fn).length; };
    const filaResumen = function (nombre, lista, clase) {
      return h('tr', { class: clase || null }, h('td', null, nombre),
        medicos.map(function (m, i) { return h('td', { class: i === 0 ? 'sep' : null }, cuenta(lista, function (f) { return f.realizado_por === m; }) || '·'); }),
        h('td', { class: 'tot' }, lista.length),
        SEXOS.map(function (s, i) { return h('td', { class: i === 0 ? 'sep' : null }, cuenta(lista, function (f) { return f.sexo === s; }) || '·'); }),
        edades.map(function (g, i) { return h('td', { class: i === 0 ? 'sep' : null }, cuenta(lista, function (f) { return grupoEdad(f) === g; }) || '·'); }));
    };
    const resumen = h('table', { class: 'cruce' },
      h('thead', null,
        h('tr', { class: 'grupo' }, h('th', null, ''), h('th', { colspan: String(medicos.length + 1), class: 'sep' }, 'Médico que realiza'), h('th', { colspan: '2', class: 'sep' }, 'Sexo'), h('th', { colspan: String(edades.length), class: 'sep' }, 'Edad (años)')),
        h('tr', null, h('th', null, 'Estudio'), medicos.map(function (m, i) { return h('th', { class: i === 0 ? 'sep' : null }, m); }), h('th', { class: 'tot' }, 'Total'),
          h('th', { class: 'sep' }, 'F'), h('th', null, 'M'), edades.map(function (g, i) { return h('th', { class: i === 0 ? 'sep' : null }, g.replace(' año', '').replace('Menos de 1', '< 1')); }))),
      h('tbody', null, estudios.map(function (e) { return filaResumen(e, real.filter(function (f) { return estudioBase(f) === e; })); })),
      h('tfoot', null, filaResumen('Total realizados', real)));

    // Por mes (solo si el periodo abarca más de un mes)
    const meses = Array.from(new Set(filas.map(function (f) { return f.fecha_estudio.slice(0, 7); }))).sort();
    const porMes = meses.length > 1 ? h('table', { class: 'cruce' },
      h('thead', null, h('tr', null, h('th', null, 'Mes'), estudios.map(function (e) { return h('th', null, CORTO[e] || e); }), h('th', { class: 'tot' }, 'Realizados'), h('th', null, 'Registros'))),
      h('tbody', null, meses.map(function (m) {
        const rm = real.filter(function (f) { return f.fecha_estudio.slice(0, 7) === m; });
        return h('tr', null, h('td', null, MESES[Number(m.slice(5)) - 1] + ' ' + m.slice(0, 4)), estudios.map(function (e) { return h('td', null, cuenta(rm, function (f) { return estudioBase(f) === e; }) || '·'); }),
          h('td', { class: 'tot' }, rm.length), h('td', null, cuenta(filas, function (f) { return f.fecha_estudio.slice(0, 7) === m; })));
      }))) : null;

    const hallazgos = function (f) { return f.hallazgos ? f.hallazgos.split(' | ') : []; };
    const conHall = real.filter(function (f) { return f.hallazgos; });
    const R = 'Estudios realizados';
    agregar(main, [
      h('div', { class: 'kpis' }, kpi('a', real.length, 'Estudios realizados'), kpi('b', filas.length, 'Registros en el periodo'),
        kpi('d', pend.length, 'Sin indicar quién lo realizó'), kpi('c', noReal.length, 'No se realizaron'),
        kpi('b', real.length ? Math.round(conRep.length / real.length * 100) + '%' : '–', 'Realizados con reporte cargado')),
      filas.length ? null : h('div', { class: 'aviso info' }, 'No hay registros en este periodo.'),
      h('div', { class: 'graficas' },
        real.length ? panel('Resumen por estudio', h('div', { class: 'tabla-scroll' }, resumen), 'todo', R + ' por médico, sexo y grupo de edad.') : null,
        porMes ? panel('Por mes', h('div', { class: 'tabla-scroll' }, porMes), 'todo', R + ' por mes y tipo de estudio.') : null,
        panel('Estudios realizados por tipo', barras(contar(real, estudioBase, ESTUDIOS).filter(function (p) { return p[1]; }))),
        panel('Estudios realizados por médico', barras(contar(real, function (f) { return f.realizado_por; }))),
        panel('Por grupo de edad', barras(contar(real, grupoEdad, GRUPOS_EDAD.map(function (g) { return g[0]; }))), '', R),
        panel('Por sexo', barras(contar(real, function (f) { return f.sexo; }, SEXOS)), '', R),
        panel('Por procedencia', barras(contar(real, procBase), procCorta), 'todo', R),
        panel('Hallazgos más frecuentes', barras(contar(conHall, hallazgos).slice(0, 15), null, 'No se anotaron hallazgos en este periodo.'), '',
          plural(conHall.length, 'estudio realizado', 'estudios realizados') + ' con hallazgos anotados. Un estudio puede tener varios.'),
        panel('Hallazgos por grupo', barras(contar(conHall, function (f) {
          return Array.from(new Set(hallazgos(f).map(function (x) { return GRUPO_DE_HALLAZGO[x] || 'Otros hallazgos'; })));
        }, HALLAZGOS.map(function (g) { return g[0]; })).filter(function (p) { return p[1]; }), null, 'No se anotaron hallazgos en este periodo.'), '', 'Estudios con al menos un hallazgo de cada grupo.'),
        noReal.length ? panel('Estudios que no se realizaron', barras(contar(noReal, function (f) { return f.motivo_no; }, S.motivos)), '', 'Por motivo') : null),
      h('p', { class: 'tenue', style: 'font-size:13px' }, 'Se cuentan por la fecha del estudio. Los registros anulados no se cuentan. "Realizados" son los que tienen indicado el médico que realizó el estudio.')
    ]);
  }

  /* ============================== usuarios y médicos ============================== */
  function vistaAdmin(main) {
    if (!S.usuarios) {
      main.appendChild(h('div', { class: 'vacio' }, 'Cargando…'));
      api('usuarios.listar').then(function (r) { S.usuarios = r.usuarios; if (ruta()[0] === 'admin') pintar(); })
        .catch(function (e) { if (ruta()[0] === 'admin') { main.textContent = ''; main.appendChild(h('div', { class: 'aviso error' }, e.message)); } });
      return;
    }
    const guardarMedicos = async function (lista, mensaje) {
      try { const r = await api('medicos.guardar', { medicos: lista }); S.medicos = r.medicos; pintar(); tostada(mensaje); } catch (e) { tostada(e.message, { error: true }); }
    };
    const nuevoMedico = h('input', { type: 'text', id: 'nm', maxlength: 60, placeholder: 'Ej. Dra. Apellido' });
    const actualizar = async function (cambio, mensaje) {
      try { const r = await api('usuarios.actualizar', cambio); S.usuarios = r.usuarios; pintar(); tostada(mensaje); } catch (e) { tostada(e.message, { error: true }); pintar(); }
    };
    const nu = { usuario: h('input', { type: 'text', id: 'nu-u', autocapitalize: 'none', autocomplete: 'off', placeholder: 'ej. lsalguero' }),
      nombre: h('input', { type: 'text', id: 'nu-n', autocomplete: 'off', placeholder: 'Nombre completo' }),
      rol: selector([['medico', 'Usuario'], ['admin', 'Administrador']], 'medico', { id: 'nu-r' }),
      clave: h('input', { type: 'text', id: 'nu-c', autocomplete: 'off', placeholder: 'Mínimo 8 caracteres' }) };
    const errU = cajaError();
    agregar(main, [
      h('section', { class: 'panel' }, h('h3', null, 'Médicos que realizan estudios'),
        h('p', { class: 'sub' }, 'Esta lista aparece en "Realizado por", al registrar y en el censo. Si un médico ya no está, desactívelo: sus estudios anteriores se conservan.'),
        h('ul', { class: 'lista-simple' }, S.medicos.map(function (m, i) {
          return h('li', null, h('span', { class: 'crece' }, h('b', null, m.nombre), m.activo ? '' : ' (inactivo)'),
            h('button', { class: 'btn chico', onclick: function () {
              guardarMedicos(S.medicos.map(function (x, j) { return { nombre: x.nombre, activo: j === i ? !x.activo : x.activo }; }), m.activo ? 'Médico desactivado.' : 'Médico activado.');
            } }, m.activo ? 'Desactivar' : 'Activar'));
        })),
        h('form', { class: 'fila-form', style: 'margin-top:10px', onsubmit: function (ev) {
          ev.preventDefault();
          if (nuevoMedico.value.trim().length < 3) { tostada('Escriba el nombre del médico.', { error: true }); return; }
          guardarMedicos(S.medicos.concat([{ nombre: nuevoMedico.value, activo: true }]), 'Médico agregado.');
        } }, h('div', { class: 'campo' }, h('label', { for: 'nm' }, 'Agregar médico'), nuevoMedico), h('button', { class: 'btn oscuro', type: 'submit' }, 'Agregar'))),
      h('section', { class: 'panel' }, h('h3', null, 'Usuarios de la app'),
        h('p', { class: 'sub' }, 'Cada persona debe tener su propio usuario. Todos pueden registrar, completar el censo y ver estadísticas; los administradores además gestionan usuarios y médicos y pueden restaurar registros anulados.'),
        h('ul', { class: 'lista-simple' }, S.usuarios.map(function (x) {
          const propio = x.usuario === S.usuario.usuario;
          return h('li', null, h('span', { class: 'crece' }, h('b', null, x.nombre), ' · ' + x.usuario + (x.activo ? '' : ' (inactivo)') + (x.debe_cambiar ? ' · clave temporal' : '')),
            selector([['medico', 'Usuario'], ['admin', 'Administrador']], x.rol, { style: 'width:auto', disabled: propio, 'aria-label': 'Rol de ' + x.usuario,
              onchange: function (ev) { actualizar({ usuario: x.usuario, rol: ev.target.value }, 'Rol actualizado.'); } }),
            h('button', { class: 'btn chico', onclick: function () { restablecer(x); } }, 'Nueva contraseña'),
            propio ? null : h('button', { class: 'btn chico' + (x.activo ? ' peligro' : ''), onclick: function () { actualizar({ usuario: x.usuario, activo: !x.activo }, x.activo ? 'Usuario desactivado.' : 'Usuario activado.'); } }, x.activo ? 'Desactivar' : 'Activar'));
        })),
        h('h3', { style: 'margin-top:18px' }, 'Crear usuario'),
        h('form', { class: 'fila-form', onsubmit: async function (ev) {
          ev.preventDefault();
          errU.textContent = '';
          try {
            const r = await api('usuarios.crear', { usuario: nu.usuario.value, nombre: nu.nombre.value, rol: nu.rol.value, clave: nu.clave.value });
            S.usuarios = r.usuarios;
            pintar();
            tostada('Usuario creado. Entréguele su contraseña temporal en persona.');
          } catch (e) { mostrarError(errU, e); }
        } },
          h('div', { class: 'campo' }, h('label', { for: 'nu-u' }, 'Usuario'), nu.usuario),
          h('div', { class: 'campo' }, h('label', { for: 'nu-n' }, 'Nombre'), nu.nombre),
          h('div', { class: 'campo' }, h('label', { for: 'nu-r' }, 'Rol'), nu.rol),
          h('div', { class: 'campo' }, h('label', { for: 'nu-c' }, 'Contraseña temporal'), nu.clave),
          h('button', { class: 'btn oscuro', type: 'submit' }, 'Crear usuario')),
        errU),
      panelPlantillas(),
      panelReportes()
    ]);
  }
  function restablecer(x) {
    modalChico('Nueva contraseña para ' + x.usuario, function (cerrar) {
      const err = cajaError();
      const clave = h('input', { type: 'text', id: 'rs-c', autocomplete: 'off', 'data-foco': true });
      return h('form', { onsubmit: async function (ev) {
        ev.preventDefault();
        try { const r = await api('usuarios.restablecer', { usuario: x.usuario, clave: clave.value }); S.usuarios = r.usuarios; cerrar(); pintar(); tostada('Contraseña temporal asignada.'); } catch (e) { mostrarError(err, e); }
      } }, h('p', { style: 'margin-top:0' }, 'Se le pedirá cambiarla la próxima vez que ingrese.'),
        h('div', { class: 'campo' }, h('label', { for: 'rs-c' }, 'Contraseña temporal (mínimo 8 caracteres)'), clave), err,
        h('button', { class: 'btn primario ancho', type: 'submit' }, 'Asignar'));
    });
  }

  /* ---------- plantillas de comentario ---------- */
  function panelPlantillas() {
    const guardar = async function (lista, mensaje) {
      const r = await api('plantillas.guardar', { plantillas: lista });
      S.plantillas = r.plantillas;
      pintar();
      tostada(mensaje);
    };
    const editar = function (i) {
      const p = i >= 0 ? S.plantillas[i] : { nombre: '', estudio: '', texto: '' };
      modalChico(i >= 0 ? 'Editar plantilla' : 'Nueva plantilla', function (cerrar) {
        const err = cajaError();
        const nombre = h('input', { type: 'text', id: 'pl-n', maxlength: '60', value: p.nombre, 'data-foco': true, placeholder: 'Ej. Ecocardiograma normal' });
        const estudio = selector([['', 'Todos los estudios']].concat(ESTUDIOS.map(function (e) { return [e, e]; })), p.estudio, { id: 'pl-e' });
        const texto = h('textarea', { id: 'pl-t', rows: '9', maxlength: '5000' });
        texto.value = p.texto;
        const btn = h('button', { class: 'btn primario ancho', type: 'submit' }, 'Guardar plantilla');
        return h('form', { onsubmit: async function (ev) {
          ev.preventDefault();
          const lista = S.plantillas.slice();
          const nueva = { nombre: nombre.value, estudio: estudio.value, texto: texto.value };
          if (i >= 0) lista[i] = nueva; else lista.push(nueva);
          try { await conBoton(btn, function () { return guardar(lista, i >= 0 ? 'Plantilla actualizada.' : 'Plantilla agregada.'); }); cerrar(); } catch (e) { mostrarError(err, e); }
        } },
        h('div', { class: 'campo' }, h('label', { for: 'pl-n' }, 'Nombre'), nombre),
        h('div', { class: 'campo' }, h('label', { for: 'pl-e' }, 'Aparece en'), estudio),
        h('div', { class: 'campo' }, h('label', { for: 'pl-t' }, 'Texto'), texto), err, btn);
      });
    };
    return h('section', { class: 'panel' }, h('h3', null, 'Plantillas de comentario'),
      h('p', { class: 'sub' }, 'Textos prehechos que se insertan en el comentario de cada registro (en la ficha del Censo). Si elige un estudio, la plantilla solo aparece en los registros de ese estudio.'),
      S.plantillas.length ? h('ul', { class: 'lista-simple' }, S.plantillas.map(function (p, i) {
        return h('li', null, h('span', { class: 'crece' }, h('b', null, p.nombre), ' · ' + (p.estudio || 'Todos los estudios'), h('div', { class: 'tenue recorte' }, p.texto)),
          h('button', { class: 'btn chico', onclick: function () { editar(i); } }, 'Editar'),
          h('button', { class: 'btn chico peligro', onclick: async function () {
            if (!(await preguntar('¿Eliminar la plantilla?', '"' + p.nombre + '" dejará de aparecer. Los comentarios ya guardados no cambian.', 'Sí, eliminar', 'Cancelar', 'peligro'))) return;
            try { await guardar(S.plantillas.filter(function (x, j) { return j !== i; }), 'Plantilla eliminada.'); } catch (e) { tostada(e.message, { error: true }); }
          } }, 'Eliminar'));
      })) : h('p', { class: 'tenue', style: 'margin:0' }, 'Aún no hay plantillas.'),
      h('button', { class: 'btn oscuro', id: 'pl-nueva', style: 'margin-top:12px', onclick: function () { editar(-1); } }, 'Nueva plantilla'));
  }

  /* ---------- censo automático de reportes ---------- */
  function panelReportes() {
    const titulo = h('h3', null, 'Censo automático de reportes de ecocardiograma');
    const e = S.estadoReportes;
    if (!e || e.cargando) {
      if (!e) {
        S.estadoReportes = { cargando: true };
        api('reportes.estado').then(function (r) { S.estadoReportes = r; }).catch(function (x) { S.estadoReportes = { error: x.message }; })
          .then(function () { if (ruta()[0] === 'admin' && !modalesAbiertos()) pintar(); });
      }
      return h('section', { class: 'panel' }, titulo, h('div', { class: 'vacio' }, 'Cargando…'));
    }
    if (e.error) return h('section', { class: 'panel' }, titulo, h('div', { class: 'aviso error' }, e.error));
    const ejecutar = async function (btn, completo) {
      if (completo && !(await preguntar('¿Revisar toda la carpeta?', 'Se revisan todos los PDF de la carpeta de reportes, no solo los nuevos. Los que ya están en el censo no se duplican. Puede tardar unos minutos.', 'Sí, revisar todo', 'Cancelar'))) return;
      try {
        const r = await conBoton(btn, function () { return api('reportes.ejecutar', { completo: !!completo }); });
        S.estadoReportes = r;
        const x = r.resultado;
        tostada(plural(x.nuevos, 'reporte nuevo', 'reportes nuevos') + ' en el censo · ' + plural(x.automaticos, 'vinculado', 'vinculados') + ' · ' + x.revisar + ' por revisar');
        await sincronizar(true);
      } catch (err) { tostada(err.message, { error: true }); }
      pintar();
    };
    return h('section', { class: 'panel', id: 'panel-reportes' }, titulo,
      h('p', { class: 'sub' }, 'Cada hora, de ' + e.horario + ', los PDF nuevos de la carpeta del ecógrafo se agregan a la pestaña "Reportes" de la hoja. Quince minutos después se busca el reporte de cada ecocardiograma (transtorácico y transesofágico) registrado sin reporte: si coinciden expediente, nombre y fecha de nacimiento se vincula solo; si coinciden dos datos (siempre el nombre), queda "por revisar". El sistema solo lee esa carpeta: nunca mueve ni borra sus archivos.'),
      !e.drive_api ? h('div', { class: 'aviso error' }, 'Falta activar el servicio "Drive API" en el editor de Apps Script. Vea la guía de instalación, sección 11.') : null,
      e.drive_api && !e.activo ? h('div', { class: 'aviso alerta' }, 'La revisión automática no está activada. En el editor de Apps Script ejecute una vez la función "activarReportes" (guía de instalación, sección 11).') : null,
      h('dl', { class: 'datos' }, dato('Revisión automática', e.activo ? 'Activa' : 'Inactiva'), dato('Estudios desde', fechaCorta(e.desde)),
        dato('Último censo', e.ultimo_censo), dato('Última vinculación', e.ultima_vinculacion),
        dato('Reportes en el censo', String(e.censados)), dato('Vinculados', String(e.vinculados)), dato('Por revisar', String(e.por_revisar))),
      h('div', { class: 'acciones-ficha', style: 'margin-top:14px' },
        h('button', { class: 'btn oscuro', id: 'censar-ahora', disabled: !e.drive_api, onclick: function (ev) { ejecutar(ev.currentTarget, false); } }, 'Censar y vincular ahora'),
        h('button', { class: 'btn', disabled: !e.drive_api, onclick: function (ev) { ejecutar(ev.currentTarget, true); } }, 'Revisar toda la carpeta'),
        h('a', { class: 'btn', href: 'https://drive.google.com/drive/folders/' + e.carpeta, target: '_blank', rel: 'noopener' }, 'Abrir la carpeta de reportes')));
  }

  /* ============================== arranque ============================== */
  window.addEventListener('hashchange', function () {
    if (ruta()[0] !== 'admin') S.usuarios = S.estadoReportes = null;
    $capas.textContent = '';
    document.body.style.overflow = '';
    S.detalleAbierto = null;
    window.scrollTo(0, 0);
    pintar();
    window.scrollTo(0, 0);
  });
  window.addEventListener('beforeunload', function (ev) { if (S.form && S.form.sucio && !S.form.enviado) { ev.preventDefault(); ev.returnValue = ''; } });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.token && S.sincronizado) sincronizar(true); });
  setInterval(function () { if (!document.hidden && S.token && S.sincronizado && !modalesAbiertos()) sincronizar(true); }, 120000);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* sin modo offline */ }); });
  }

  S.token = leerToken();
  if (S.token) { $app.textContent = ''; $app.appendChild(h('p', { class: 'cargando-inicial' }, 'Cargando…')); iniciar(); } else pintarAcceso();
})();
