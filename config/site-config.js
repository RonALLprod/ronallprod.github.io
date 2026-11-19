window.SITE = {
  brand: { name: "RONALL PROD", short: "RonALL", tagline: "Instrumentales con identidad. Producción hecha a mano." },

  url: "https://ronallprod.github.io",

  currency: "USD",

  paypal: { me: "https://www.paypal.com/paypalme/Ronallprod" },

  whatsapp: { number: "573042831505", confirmed: false },

  supabase: {
    url: "https://kwmofbiiwvpojtkvlmxz.supabase.co",
    key: "sb_publishable_HL_vNXAUhonkIgq7RRaPmQ_ojk54lmW"
  },

  privateSupabase: {
    url: "https://kwmofbiiwvpojtkvlmxz.supabase.co",
    key: "sb_publishable_HL_vNXAUhonkIgq7RRaPmQ_ojk54lmW"
  },

  producer: { name: "RONALL PROD", legalName: "[Nombre legal del productor — por definir]", country: "[por definir]", email: "[por definir]" },

  previewKey: "hamy+oo+h/A5eYbjiP9iTI1WVi7md/vzcE5DfJd1Zk4=",

  youtubeTemplate:
"RONALL PROD\n\n🎧 Listen / Purchase: {URL}\n\nLicenses available: Basic / Premium / Unlimited / Exclusive.\n\nContact: {WHATSAPP}\n{WA_LINK}",

  bundle: { tiers: [[2, 10], [3, 15], [4, 20]] },

  catalog: {
    genres: ["Detroit", "Trap", "Drill", "Reggaeton", "Boom Bap", "R&B"],
    types: ["YN Jay Type Beat"]
  },

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
