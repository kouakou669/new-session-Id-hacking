const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pino = require("pino");
const NodeCache = require('node-cache');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers,
} = require("ovl_wa_baileys");

const app = express.Router();
const msgRetryCounterCache = new NodeCache();
const PORT = process.env.PORT || 3000;

let sock;
const sessionDir = path.join(__dirname, '../session');

app.get('/', async (req, res) => {
  const num = req.query.number;
  if (!num) return res.json({ error: 'Veuillez fournir un numéro de téléphone' });
  await ovl(num, res);
});

async function ovl(num, res, disconnect = false) {

  if (!disconnect && !fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir);
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' }))
    },
    printQRInTerminal: false,
    logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
    browser: Browsers.macOS("Safari"),
    markOnlineOnConnect: true,
    msgRetryCounterCache
  });

  sock.ev.on('creds.update', saveCreds);

  const isFirstLogin = !sock.authState.creds.registered;

  if (isFirstLogin && !disconnect) {
    await delay(1500);
    const numero = num.replace(/[^0-9]/g, '');
    const code = await sock.requestPairingCode(numero);
    if (!res.headersSent) res.send({ code });
  }

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log('Connecté aux serveurs WhatsApp');

      await delay(5000);
      try {
        const CREDS = fs.readFileSync(`${sessionDir}/creds.json`, 'utf-8');
        const response = await axios.post('https://pastebin.com/api/api_post.php', new URLSearchParams({
          api_dev_key: '64TBS-HKyH1n5OL2ddx7DwtpOKMsRDXl',
          api_option: 'paste',
          api_paste_code: CREDS,
          api_paste_expire_date: 'N'
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const lienPastebin = response.data.split('/')[3];
        // --- MISE À JOUR: session ID
        const msg = await sock.sendMessage(sock.user.id, { text: `HACKING-MD;;;=>${lienPastebin}` });

        // --- MISE À JOUR: message session (en français)
        await sock.sendMessage(sock.user.id, {
          image: { url: 'https://iili.io/2QXEZ7I.jpg' },
          caption:
`*✅sᴇssɪᴏɴ ᴄᴏɴɴᴇᴄᴛᴇᴅ✅*
Utilisez l'identifiant de session ci-dessus pour
déployer votre bot.
╔════◇
║『 *VOUS AVEZ CHOISI HACKING-MD* 』
║ Vous avez terminé la première étape
║ pour déployer un bot WhatsApp.
╚════════════════╝
╔═════◇
║ 『••• 𝗩𝗶𝘀𝗶𝘁𝗲𝘇 𝗽𝗼𝘂𝗿 𝗹’𝗮𝗶𝗱𝗲 •••』
║❒ 𝐏𝐫𝐨𝐩𝐫𝐢é𝐭𝐚𝐢𝐫𝐞 : https://wa.me/2250705607226
║❒ 𝐑𝐞𝐩𝐨 : https://github.com/HACKING995/HACKING--MD9
║❒ 𝐓𝐞𝐥𝐞𝐠𝐫𝐚𝐦 : https://t.me/freeeherokucc
║❒ 𝐘𝐨𝐮𝐭𝐮𝐛𝐞 : https://youtube.com/@device.bot.thomas?si=1XTGwLjhIuk5XeNN
║❒ 𝐆𝐫𝐨𝐮𝐩𝐞 : https://chat.whatsapp.com/CmrAOrFSBMi4eXW8xL5UHZ
║❒ 𝐂𝐡𝐚𝐧𝐧𝐞𝐥 : https://whatsapp.com/channel/0029VaYrk3lIiRozw8zeoh00
║ 💜💜💜
╚════════════════╝
N'oubliez pas de mettre une étoile⭐ à mon repo !`
        }, { quoted: msg });

        await ovl.groupAcceptInvite("HzhikAmOuYhFXGLmcyMo62");
        await ovl.groupAcceptInvite("FLs6jEFusbtACzchum2aWK");

        fs.rmSync(sessionDir, { recursive: true, force: true });

      } catch (err) {
        console.error('Erreur d’upload :', err);
      }
    } else if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      reconnect(reason, num, res);
    }
  });
}

function reconnect(reason, num, res) {
  if ([DisconnectReason.connectionLost, DisconnectReason.connectionClosed, DisconnectReason.restartRequired].includes(reason)) {
    console.log('Connexion perdue, reconnexion en cours...');
    ovl(num, res, true);
  } else {
    console.log(`Déconnecté ! Motif : ${reason}`);
    if (sock) sock.end();
    if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
  }
}

module.exports = app;
