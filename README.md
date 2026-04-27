# Literaturas Bíblicas — Lanzador de App

Página de bienvenida que detecta el dispositivo/navegador del usuario y le guía para **Añadir a pantalla de inicio**, creando un icono que abre la plataforma como si fuera una app nativa.

## ¿Cómo funciona?

1. El usuario abre la URL de esta página (tu GitHub Pages).
2. Aparece el modal "Añadir a pantalla de inicio" con instrucciones exactas según su dispositivo:
   - **Android (Chrome/Edge)**: botón directo que lanza el diálogo nativo del sistema.
   - **Android (Samsung/Firefox/otros)**: instrucciones paso a paso.
   - **iOS (Safari)**: instrucciones con ícono de compartir.
   - **iOS (Chrome/Firefox)**: redirige a Safari (único navegador que permite esto en iOS).
   - **Windows/macOS/Linux (Chrome/Edge)**: botón directo o instrucciones del menú.
3. Si el usuario abre la página **desde la app ya instalada** (modo standalone), el modal NO aparece y va directo a la plataforma.
4. Si ya instaló antes (marcado en `localStorage`), tampoco ve el modal.

## Estructura de archivos

```
/
├── index.html       ← Página principal (modal + lógica)
├── manifest.json    ← Necesario para Android/Desktop
├── icon-192.png     ← Icono 192×192
├── icon-512.png     ← Icono 512×512
└── README.md
```

## Despliegue en GitHub Pages

### Opción A — Repositorio nuevo (más sencillo)

1. Crea un repositorio en GitHub, por ejemplo: `literaturas-biblicas-launcher`
2. Sube todos los archivos de esta carpeta.
3. Ve a **Settings → Pages → Source** y selecciona la rama `main`, carpeta `/ (root)`.
4. GitHub te dará una URL del tipo: `https://tu-usuario.github.io/literaturas-biblicas-launcher/`
5. Comparte esa URL con tus usuarios.

### Opción B — En un repositorio existente

Si ya tienes un repositorio con tu proyecto:
1. Copia estos archivos a la raíz (o a una subcarpeta, ajustando `start_url` en `manifest.json`).
2. Activa GitHub Pages como se describe arriba.

### Verificar que funciona

- Abre la URL en Chrome (móvil o escritorio) → debe aparecer el modal con botón "AÑADIR A INICIO AHORA".
- Abre la URL en Safari iOS → debe mostrar las instrucciones del ícono compartir.
- Una vez añadida, toca el icono → debe ir directamente a la plataforma sin mostrar el modal.

## Actualizar la URL de destino

Si la URL de tu Apps Script cambia, edita la línea en `index.html`:

```js
const APP_URL = 'https://script.google.com/macros/s/TU_NUEVO_ID/exec';
```

---
*Plataforma Oficial de Distribución Ministerial*
