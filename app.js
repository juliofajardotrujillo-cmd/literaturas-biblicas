/**
 * app.js — Lógica principal de la PWA
 *
 * Responsabilidades:
 *  1. Detectar si la app está en modo standalone (ya instalada).
 *  2. Detectar si el dispositivo es iOS / Safari.
 *  3. Gestionar el evento `beforeinstallprompt` (Android / Chrome / Edge).
 *  4. Mostrar el modal adecuado según la plataforma.
 *  5. Redirigir al enlace de Google Apps Script cuando corresponde.
 *  6. Registrar el Service Worker.
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

/** URL destino: Google Apps Script */
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxErZpzjxX4OtfdjcHgr7zdVkTiATpbH0q8MA35F3gv9asJ4lAZv3z_hXBvRh4623ho/exec';

/**
 * Claves de localStorage para recordar el estado del usuario.
 * Esto evita molestar al usuario con el modal en cada visita.
 */
const LS_KEYS = {
  PROMPT_DISMISSED:  'pwa_prompt_dismissed',  // el usuario cerró el modal sin instalar
  PROMPT_DISMISSED_AT: 'pwa_dismissed_at',    // timestamp del último rechazo
  INSTALLED:         'pwa_installed',          // usuario aceptó la instalación
};

/**
 * Cuántos días esperar antes de volver a mostrar el prompt
 * si el usuario lo rechazó previamente.
 */
const DAYS_BEFORE_REPROMPT = 3;

// ─────────────────────────────────────────────────────────────────────────────
// VARIABLES DE ESTADO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Guarda el evento `beforeinstallprompt` para usarlo más tarde.
 * El navegador lo dispara antes de mostrar el banner nativo;
 * lo interceptamos para mostrar nuestro propio modal.
 */
let deferredInstallPrompt = null;

// ─────────────────────────────────────────────────────────────────────────────
// DETECCIÓN DE ENTORNO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detecta si la app está corriendo en modo standalone (PWA instalada).
 *
 * Funcionamiento:
 * - `window.matchMedia('(display-mode: standalone)').matches`:
 *     funciona en Chrome, Edge, Samsung Internet y otros navegadores Chromium.
 * - `navigator.standalone`:
 *     propiedad propietaria de Safari en iOS, es `true` cuando la app
 *     se abrió desde la pantalla de inicio.
 * - `document.referrer.includes('android-app://')`:
 *     cubre TWA (Trusted Web Activities) en Android.
 *
 * @returns {boolean}
 */
function isRunningAsStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches  ||
    window.matchMedia('(display-mode: minimal-ui)').matches  ||
    navigator.standalone === true ||                          // iOS Safari
    document.referrer.includes('android-app://')              // TWA Android
  );
}

/**
 * Detecta si el dispositivo es iOS (iPhone, iPad, iPod).
 *
 * En iOS no existe el evento `beforeinstallprompt`, así que
 * debemos mostrar instrucciones manuales al usuario.
 *
 * @returns {boolean}
 */
function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad con iPadOS 13+ se identifica como Mac; comprobamos también el touch
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Detecta si el navegador actual es Safari (excluye Chrome en iOS,
 * que usa el motor de Safari pero tiene su propio UA).
 *
 * @returns {boolean}
 */
function isSafari() {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua);
}

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA DE REDIRECCIÓN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Muestra el overlay de carga y redirige al enlace de Apps Script.
 *
 * Se usa `window.location.href` en lugar de `window.open` para
 * mantener la navegación dentro de la misma ventana / app.
 *
 * @param {number} [delay=800] - Milisegundos de espera antes de redirigir
 *                               (da tiempo a que el usuario vea el spinner).
 */
function redirectToAppsScript(delay = 800) {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.removeAttribute('aria-hidden');
  }

  setTimeout(() => {
    window.location.href = APPS_SCRIPT_URL;
  }, delay);
}

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA DE LOCALSTORAGE (flags de sesión)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Comprueba si el usuario ya rechazó el prompt recientemente.
 * Devuelve true si el flag existe Y aún no han pasado DAYS_BEFORE_REPROMPT días.
 *
 * @returns {boolean}
 */
function promptWasDismissedRecently() {
  const dismissed = localStorage.getItem(LS_KEYS.PROMPT_DISMISSED);
  if (!dismissed) return false;

  const dismissedAt = parseInt(localStorage.getItem(LS_KEYS.PROMPT_DISMISSED_AT) || '0', 10);
  const msElapsed = Date.now() - dismissedAt;
  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);

  return daysElapsed < DAYS_BEFORE_REPROMPT;
}

/**
 * Guarda en localStorage que el usuario rechazó (o cerró) el prompt.
 */
function saveDismissed() {
  localStorage.setItem(LS_KEYS.PROMPT_DISMISSED, '1');
  localStorage.setItem(LS_KEYS.PROMPT_DISMISSED_AT, String(Date.now()));
}

/**
 * Guarda en localStorage que el usuario aceptó la instalación.
 */
function saveInstalled() {
  localStorage.setItem(LS_KEYS.INSTALLED, '1');
  // Limpiar el flag de rechazo si existía
  localStorage.removeItem(LS_KEYS.PROMPT_DISMISSED);
  localStorage.removeItem(LS_KEYS.PROMPT_DISMISSED_AT);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTACIÓN DEL MODAL PARA iOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Modifica el contenido del modal para mostrar instrucciones
 * específicas de iOS, ya que Safari no dispara `beforeinstallprompt`.
 *
 * Las instrucciones indican al usuario cómo añadir a pantalla de inicio
 * usando el menú "Compartir" de Safari.
 */
function setupIOSModal() {
  const cardTitle    = document.getElementById('cardTitle');
  const cardSubtitle = document.getElementById('cardSubtitle');
  const cardInfo     = document.getElementById('cardInfo');
  const btnAction    = document.getElementById('btnAction');

  if (cardTitle) {
    cardTitle.textContent = 'Añadir a pantalla de inicio';
  }

  if (cardSubtitle) {
    cardSubtitle.textContent =
      'Para instalar esta app en tu iPhone o iPad, sigue estos pasos rápidos:';
  }

  if (cardInfo) {
    // Reemplaza el texto genérico por instrucciones paso a paso con ícono de Compartir
    cardInfo.innerHTML = `
      <div class="ios-steps">
        <div class="ios-step-item">
          <span class="ios-step-num">1</span>
          <span>Pulsa el botón <strong>Compartir</strong>
            <!-- Ícono SVG del botón de compartir de iOS -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                 style="width:16px;height:16px;vertical-align:middle;margin:0 2px;color:#4caf87;">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            en la barra inferior de Safari.
          </span>
        </div>
        <div class="ios-step-item">
          <span class="ios-step-num">2</span>
          <span>Desplázate y pulsa <strong>"Añadir a pantalla de inicio"</strong>.</span>
        </div>
        <div class="ios-step-item">
          <span class="ios-step-num">3</span>
          <span>Pulsa <strong>"Añadir"</strong> en la esquina superior derecha.</span>
        </div>
      </div>
    `;
  }

  if (btnAction) {
    btnAction.textContent = 'ENTENDIDO';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FLUJO DE INSTALACIÓN PARA ANDROID / CHROMIUM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gestiona el clic en el botón principal cuando existe
 * el evento `beforeinstallprompt` (Android/Chrome/Edge/etc.).
 *
 * Proceso:
 *  1. Llama a `deferredInstallPrompt.prompt()` — muestra el diálogo nativo.
 *  2. Espera la respuesta del usuario en `userChoice`.
 *  3. Si aceptó → guarda flag, redirige.
 *  4. Si rechazó → guarda flag, cierra modal y continúa de todos modos
 *     (redirigimos para no bloquear al usuario).
 */
async function handleInstallClick() {
  const btn = document.getElementById('btnAction');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Instalando…';
  }

  if (!deferredInstallPrompt) {
    // No hay prompt disponible (p.ej.: Firefox, ya instalado, o timing raro)
    // Redirigimos directamente sin instalar
    saveInstalled();
    redirectToAppsScript();
    return;
  }

  try {
    // Muestra el diálogo nativo de instalación del navegador
    await deferredInstallPrompt.prompt();

    // Espera la decisión del usuario
    const { outcome } = await deferredInstallPrompt.userChoice;

    if (outcome === 'accepted') {
      // ✅ Usuario aceptó instalar la PWA
      console.log('[PWA] Usuario aceptó la instalación.');
      saveInstalled();
      redirectToAppsScript();
    } else {
      // ❌ Usuario rechazó la instalación
      console.log('[PWA] Usuario rechazó la instalación.');
      saveDismissed();
      // Redirigimos igualmente para no bloquearle
      redirectToAppsScript(500);
    }
  } catch (err) {
    // Error inesperado al llamar a prompt() — redirigimos de todas formas
    console.error('[PWA] Error en el prompt de instalación:', err);
    redirectToAppsScript(500);
  } finally {
    // El prompt solo se puede usar una vez; lo descartamos
    deferredInstallPrompt = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FLUJO PARA iOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maneja el clic en "ENTENDIDO" en iOS.
 * No podemos instalar programáticamente; simplemente guardamos
 * el flag para no mostrar el modal de nuevo y redirigimos.
 */
function handleIOSActionClick() {
  saveDismissed(); // Evita mostrar instrucciones de nuevo en breve
  redirectToAppsScript();
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTÓN "CONTINUAR SIN INSTALAR"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Si el usuario pulsa "Continuar sin instalar":
 * - Guardamos que lo descartó.
 * - Redirigimos igualmente al Apps Script.
 */
function handleSkipClick() {
  saveDismissed();
  redirectToAppsScript();
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO DEL SERVICE WORKER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registra el service worker si el navegador lo soporta.
 *
 * El service worker es necesario para que la app sea instalable
 * como PWA y para que funcione offline.
 *
 * Notas:
 * - Solo funciona en HTTPS (o localhost en desarrollo).
 * - Se registra de forma diferida para no bloquear el render inicial.
 */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service Workers no están soportados en este navegador.');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('./service-worker.js', {
      scope: './',
    });
    console.log('[SW] Service Worker registrado correctamente. Scope:', registration.scope);

    // Opcional: detectar actualizaciones del SW
    registration.addEventListener('updatefound', () => {
      console.log('[SW] Nueva versión del Service Worker disponible.');
    });
  } catch (err) {
    console.error('[SW] Error al registrar el Service Worker:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZACIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Punto de entrada de la aplicación.
 * Se ejecuta cuando el DOM está listo.
 */
function init() {
  // ── 1. Registrar el Service Worker (asíncrono, no bloquea) ────────────────
  // Usamos requestIdleCallback si está disponible para diferirlo aún más
  if ('requestIdleCallback' in window) {
    requestIdleCallback(registerServiceWorker);
  } else {
    window.addEventListener('load', registerServiceWorker);
  }

  // ── 2. Comprobar si la app ya está en modo standalone ────────────────────
  //
  // Si el usuario ya instaló la PWA y la está abriendo desde el icono
  // de su pantalla de inicio, `isRunningAsStandalone()` devuelve true.
  // En ese caso, NO mostramos el modal y vamos directo al Apps Script.
  if (isRunningAsStandalone()) {
    console.log('[PWA] App ejecutándose en modo standalone → redirigiendo…');
    redirectToAppsScript(300);
    return; // Fin del flujo
  }

  // ── 3. Determinar la plataforma y configurar el modal ────────────────────
  const onIOS = isIOS();

  if (onIOS) {
    // ── 3a. iOS: mostrar instrucciones manuales ────────────────────────────
    console.log('[PWA] Dispositivo iOS detectado → mostrando instrucciones manuales.');
    setupIOSModal();

    // Asignar manejador del botón principal
    const btnAction = document.getElementById('btnAction');
    if (btnAction) {
      btnAction.addEventListener('click', handleIOSActionClick);
    }

  } else {
    // ── 3b. Android / Chrome / Edge: esperar el evento beforeinstallprompt ──
    //
    // Este evento lo dispara el navegador cuando la app cumple los criterios
    // de instalación (HTTPS, manifest válido, SW registrado, etc.).
    // Lo interceptamos para mostrar nuestro propio botón en lugar del banner nativo.
    window.addEventListener('beforeinstallprompt', (event) => {
      // Evitamos que el navegador muestre el mini-banner automático
      event.preventDefault();

      // Guardamos el evento para usarlo cuando el usuario pulse "Instalar"
      deferredInstallPrompt = event;
      console.log('[PWA] Evento beforeinstallprompt capturado → el modal está listo.');
    });

    // Asignar manejador del botón principal
    const btnAction = document.getElementById('btnAction');
    if (btnAction) {
      btnAction.addEventListener('click', handleInstallClick);
    }

    // Detectar si la instalación se completó (el navegador lo notifica)
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App instalada exitosamente.');
      saveInstalled();
      deferredInstallPrompt = null;
      // Redirigimos si no se ha hecho ya
      redirectToAppsScript(400);
    });
  }

  // ── 4. Botón "Continuar sin instalar" (igual para todas las plataformas) ──
  const btnSkip = document.getElementById('btnSkip');
  if (btnSkip) {
    btnSkip.addEventListener('click', handleSkipClick);
  }

  // ── 5. Lógica de "no molestar" ────────────────────────────────────────────
  //
  // Si el usuario ya rechazó el prompt recientemente, lo mandamos
  // directo al Apps Script para no ser intrusivos.
  //
  // Nota: este check se hace DESPUÉS de configurar los listeners porque
  // en Android necesitamos que `beforeinstallprompt` ya esté asignado
  // antes de hacer la redirección (si la hacemos aquí, el listener se pierde
  // pero no importa porque ya no lo necesitamos).
  if (promptWasDismissedRecently()) {
    console.log('[PWA] El usuario ya rechazó el prompt recientemente → redirigiendo directamente.');
    redirectToAppsScript(200);
  }
}

// Esperamos a que el DOM esté listo antes de inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // El DOM ya está listo (script cargado con defer o al final del body)
  init();
}
