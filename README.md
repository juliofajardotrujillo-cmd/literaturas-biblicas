# Acceso Rápido — PWA

App web progresiva (PWA) que muestra un modal de instalación al usuario y redirige al enlace de Google Apps Script configurado.

## Estructura del proyecto

```
pwa-project/
├── index.html              # Página principal
├── styles.css              # Estilos visuales
├── app.js                  # Lógica de la app (detección, instalación, redirección)
├── manifest.webmanifest    # Manifest de la PWA
├── service-worker.js       # Service Worker (caché offline)
├── generate_icons.py       # Script para regenerar íconos
└── icons/
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-180.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

---

## Cómo probar localmente

El Service Worker **requiere HTTPS o localhost**. Opciones:

### Opción A — `npx serve` (Node.js)
```bash
npx serve .
# Abre http://localhost:3000
```

### Opción B — Python
```bash
python3 -m http.server 8080
# Abre http://localhost:8080
```

### Opción C — VS Code Live Server
Instala la extensión "Live Server" y haz clic en "Go Live".

---

## Despliegue en producción

### GitHub Pages (recomendado)
1. Sube la carpeta a un repositorio GitHub.
2. Ve a **Settings → Pages → Source: main branch / root**.
3. GitHub Pages sirve HTTPS automáticamente.
4. La URL será: `https://<usuario>.github.io/<repositorio>/`

### Netlify / Vercel
Arrastra la carpeta al dashboard o conecta el repositorio. Ambos sirven HTTPS por defecto.

---

## Compatibilidad

| Plataforma | Comportamiento |
|---|---|
| Android + Chrome/Edge | `beforeinstallprompt` → instalación nativa + redirección |
| iOS + Safari | Instrucciones manuales → "Compartir → Añadir a pantalla" |
| Windows + Chrome/Edge | `beforeinstallprompt` → instalación como app de escritorio |
| macOS + Chrome | `beforeinstallprompt` → instalación como app |
| Firefox (todas) | No soporta PWA install → redirige directamente |
| Samsung Internet | Compatible con `beforeinstallprompt` |

---

## Personalización

- **URL de destino**: edita `APPS_SCRIPT_URL` en `app.js`.
- **Días antes de repetir el prompt**: edita `DAYS_BEFORE_REPROMPT` en `app.js`.
- **Colores**: edita las variables CSS en el bloque `:root` de `styles.css`.
- **Versión de caché**: incrementa `CACHE_NAME` en `service-worker.js` al actualizar archivos.
- **Íconos**: edita `generate_icons.py` y ejecuta `python3 generate_icons.py`.
  O usa [Maskable.app](https://maskable.app/) para íconos maskable profesionales.

---

## Notas sobre iOS

- Safari en iOS **no soporta** el evento `beforeinstallprompt`.
- La detección de modo standalone en iOS usa `navigator.standalone`.
- El modal muestra instrucciones paso a paso para que el usuario añada la app manualmente.
- Una vez añadida, al abrirse desde el icono, `navigator.standalone === true` y se redirige directamente.
