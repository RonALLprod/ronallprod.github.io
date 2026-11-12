/* ============================================================================
   RONALL PROD · CONFIGURACIÓN CENTRAL  (único sitio para editar datos de marca)
   Se usa en: marketplace, páginas de beat, private.html, panel.html y tools/build.mjs
   ============================================================================ */
window.SITE = {
  brand: { name: "RONALL PROD", short: "RonALL", tagline: "Instrumentales con identidad. Producción hecha a mano." },

  // URL pública definitiva (GitHub Pages). Sin barra final.
  url: "https://ronallprod.github.io",

  currency: "USD",

  paypal: { me: "https://www.paypal.com/paypalme/Ronallprod" },

  // ⚠️ CONFIRMAR ANTES DEL LANZAMIENTO: en el proyecto original el enlace de WhatsApp usaba 573042831505
  // y el texto visible mostraba +57 323 977 8898. Aquí se deja el del ENLACE original como valor de trabajo.
  // Cambia este número y TODO el sitio (público, privado, panel, YouTube) se actualiza.
  whatsapp: { number: "573042831505", confirmed: false },

  supabase: {
    url: "https://kwmofbiiwvpojtkvlmxz.supabase.co",
    key: "sb_publishable_HL_vNXAUhonkIgq7RRaPmQ_ojk54lmW"   // tienda, pedidos y analítica pública
  },

  // El catálogo privado conserva su backend original: allí vive la clave AES
  // con la que se cifraron los .bin. No mezclarlo con el backend de la tienda.
  privateSupabase: {
    url: "https://kwxbdckegbyivcrekevv.supabase.co",
    key: "sb_publishable_80B-AoZBWu7crLRcjANK_Q_jk7QTzwK"
  },

  producer: { name: "RONALL PROD", legalName: "[Nombre legal del productor — por definir]", country: "[por definir]", email: "[por definir]" },

  // Clave AES-GCM de los PREVIEWS públicos (inevitablemente pública: el navegador debe poder descifrar).
  // La genera tools/add-beat.py la primera vez. NO es la clave del catálogo privado.
  previewKey: "hamy+oo+h/A5eYbjiP9iTI1WVi7md/vzcE5DfJd1Zk4=",

  // Plantilla de descripción para YouTube. Variables: {URL} {NAME} {TYPE} {WHATSAPP} {WA_LINK}
  youtubeTemplate:
"RONALL PROD\n\n🎧 Listen / Purchase: {URL}\n\nLicenses available: Basic / Premium / Unlimited / Exclusive.\n\nContact: {WHATSAPP}\n{WA_LINK}",

  /* COMBO: descuento automático en el carrito según cuántos beats distintos lleve el cliente.
     [cantidad mínima de beats, % de descuento]. Las licencias EXCLUSIVE nunca se rebajan
     (cuentan para llegar al combo, pero conservan su precio). Pon tiers: [] para desactivarlo. */
  bundle: { tiers: [[2, 10], [3, 15], [4, 20]] },

  catalog: {
    genres: ["Detroit", "Trap", "Drill", "Reggaeton", "Boom Bap", "R&B"],
    types: ["YN Jay Type Beat"]
  },

  /* LICENCIAS — precios y condiciones EDITABLES.
     Precios en USD :
     BASIC 17 (antes 20, tachado) · PREMIUM 30 · UNLIMITED 60 · EXCLUSIVE 200.
     Campo opcional `was`: precio anterior que se muestra tachado junto al precio actual.
     ⚠️ Los campos que dicen "Por definir" NO se muestran al público; complétalos antes de vender para que aparezcan.
     Cada beat puede sobrescribir el precio (campo prices en data/catalog.json / panel). */
  licenses: {
    basic: {
      name: "BASIC", price: 17, was: 20, exclusive: false,
      desc: "Licencia no exclusiva para empezar.",
      formats: ["MP3"],
      distribution: "Por definir",
      monetization: "Por definir",
      permissions: ["Uso en 1 canción (proyecto) del comprador"],
      restrictions: ["No exclusiva: el beat puede licenciarse a otros artistas", "No se transfiere la titularidad de derechos de autor"]
    },
    premium: {
      name: "PREMIUM", price: 30, exclusive: false, tag: "Más elegida",
      desc: "Más formatos y más permisos que BASIC.",
      formats: ["MP3", "WAV"],
      distribution: "Por definir",
      monetization: "Por definir",
      permissions: ["Uso en 1 canción (proyecto) del comprador"],
      restrictions: ["No exclusiva: el beat puede licenciarse a otros artistas", "No se transfiere la titularidad de derechos de autor"]
    },
    unlimited: {
      name: "UNLIMITED", price: 60, exclusive: false,
      desc: "Permisos comerciales ampliados.",
      formats: ["MP3", "WAV"],
      distribution: "Por definir",
      monetization: "Por definir",
      permissions: ["Uso en 1 canción (proyecto) del comprador"],
      restrictions: ["No exclusiva: el beat puede licenciarse a otros artistas", "No se transfiere la titularidad de derechos de autor"]
    },
    exclusive: {
      name: "EXCLUSIVE", price: 200, exclusive: true,
      desc: "Solo para ti: el beat se retira de la venta.",
      formats: ["MP3", "WAV"],
      distribution: "Por definir",
      monetization: "Por definir",
      permissions: ["Uso en el proyecto del comprador según contrato"],
      restrictions: ["Se retira de la venta tras confirmarse el pago", "Las licencias no exclusivas anteriores conservan su validez", "Una licencia exclusiva de uso no es una cesión total de derechos de autor salvo pacto escrito expreso"]
    }
  }
};
