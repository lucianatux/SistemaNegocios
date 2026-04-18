/**
 * activacion.js
 * Módulo de activación de licencia — SRP, sin dependencias externas
 * Colocar en: app/core/activacion.js
 */

const Activacion = (() => {

  const STORAGE_KEY = 'app_lic_v1';

  // ─── CLAVES VÁLIDAS (hasheadas con SHA-256) ───────────────────────────────
  // Para agregar una nueva clienta:
  //   1. Abrí generador-claves.html
  //   2. Ingresá la clave que querés (ej: MARA2024)
  //   3. Copiá el hash que aparece
  //   4. Agregalo aquí adentro del Set
  const HASHES_VALIDOS = new Set(['b5d4ac8ec26757cf55dad442373352134a7c9b7878de6fe88728a5d7b7c26691',
    // Ejemplo — reemplazá con los hashes reales de tus clientas:
    // 'a1b2c3d4e5f6...',
  ]);

  // ─── HASH SHA-256 ─────────────────────────────────────────────────────────
  async function hashear(texto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto.trim().toUpperCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ─── VERIFICAR SI YA ESTÁ ACTIVADA ───────────────────────────────────────
  function estaActivada() {
    return localStorage.getItem(STORAGE_KEY) === 'activada';
  }

  // ─── VALIDAR CLAVE INGRESADA ──────────────────────────────────────────────
  async function validarClave(claveIngresada) {
    const hash = await hashear(claveIngresada);
    return HASHES_VALIDOS.has(hash);
  }

  // ─── PANTALLA DE ACTIVACIÓN ───────────────────────────────────────────────
  function mostrarPantalla() {
    const overlay = document.createElement('div');
    overlay.id = 'activacion-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: #0f0f0f;
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="
        background: #1a1a1a;
        border: 1px solid #2a2a2a;
        border-radius: 16px;
        padding: 48px 40px;
        width: 100%;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 8px 40px rgba(0,0,0,0.6);
      ">
        <div style="font-size: 40px; margin-bottom: 16px;">🔒</div>
        <h2 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 8px;">
          Activación requerida
        </h2>
        <p style="color: #888; font-size: 14px; margin: 0 0 32px; line-height: 1.5;">
          Esta aplicación necesita ser activada.<br>Ingresá tu clave de licencia.
        </p>
        <div style="position: relative; margin-bottom: 12px;">
          <input
            id="act-input"
            type="password"
            placeholder="Ingresá tu clave"
            autocomplete="off"
            spellcheck="false"
            style="
              width: 100%;
              box-sizing: border-box;
              padding: 12px 48px 12px 16px;
              background: #111;
              border: 1px solid #333;
              border-radius: 8px;
              color: #fff;
              font-size: 15px;
              text-align: center;
              letter-spacing: 2px;
              outline: none;
              transition: border-color 0.2s;
            "
          />
          <button
            id="act-toggle"
            type="button"
            title="Mostrar/ocultar clave"
            style="
              position: absolute;
              right: 12px;
              top: 50%;
              transform: translateY(-50%);
              background: none;
              border: none;
              cursor: pointer;
              padding: 0;
              color: #555;
              font-size: 18px;
              line-height: 1;
              user-select: none;
            "
          >👁</button>
        </div>
        <p id="act-error" style="
          color: #e05555;
          font-size: 13px;
          margin: 0 0 16px;
          min-height: 18px;
          transition: opacity 0.2s;
          opacity: 0;
        ">Clave incorrecta. Contactá al desarrollador.</p>
        <button
          id="act-btn"
          style="
            width: 100%;
            padding: 13px;
            background: #ffffff;
            color: #000;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
          "
        >Activar</button>
        <p style="color: #444; font-size: 12px; margin: 24px 0 0; line-height: 1.5;">
          ¿Problemas con la activación?<br>Contactá al desarrollador.
        </p>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById('act-input');
    const btn = document.getElementById('act-btn');
    const error = document.getElementById('act-error');

    const toggle = document.getElementById('act-toggle');
    toggle.addEventListener('click', () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      toggle.textContent = visible ? '👁' : '🙈';
      input.focus();
    });

    input.addEventListener('focus', () => {
      input.style.borderColor = '#555';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#333';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    });

    btn.addEventListener('click', async () => {
      const clave = input.value;
      if (!clave.trim()) return;

      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.textContent = 'Verificando...';
      error.style.opacity = '0';

      const valida = await validarClave(clave);

      if (valida) {
        localStorage.setItem(STORAGE_KEY, 'activada');
        overlay.style.transition = 'opacity 0.5s';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 500);
      } else {
        error.style.opacity = '1';
        input.value = '';
        input.focus();
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.textContent = 'Activar';
      }
    });
  }

  // ─── INIT PÚBLICO ─────────────────────────────────────────────────────────
  async function init() {
    if (!estaActivada()) {
      mostrarPantalla();
    }
  }

  return { init };

})();

Activacion.init();