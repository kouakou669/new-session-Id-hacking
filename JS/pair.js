const express = require('express');
const axios = require('axios');
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
const { insertSession } = require('./session'); // Importer la fonction pour interagir avec la base de données

const app = express.Router();
const msgRetryCounterCache = new NodeCache();

let sock;

app.get('/', async (req, res) => {
  const num = req.query.number;
  if (!num) return res.json({ error: 'Veuillez fournir un numéro de téléphone' });
  await ovl(num, res);
});

async function ovl(num, res, disconnect = false) {
  const { state, saveCreds } = await useMultiFileAuthState(); // Supprimez le chemin du répertoire

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
    },
    printQRInTerminal: false,
    logger: pino({ level: 'fatal' }),
    browser: Browsers.macOS("Safari"),
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
        const CREDS = JSON.stringify(sock.authState.creds);
        await insertSession(CREDS); // Enregistrer la session dans la base de données

        const response = await axios.post('https://pastebin.com/api/api_post.php', new URLSearchParams({
          api_dev_key: '64TBS-HKyH1n5OL2ddx7DwtpOKMsRDXl',
          api_option: 'paste',
          api_paste_code: CREDS,
          api_paste_expire_date: 'N'
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const lienPastebin = response.data.split('/')[3];
        const msg = await sock.sendMessage(sock.user.id, { text: `HACKING-MD;;;=>${lienPastebin}` });

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
║ 💜💜💜`
        }, { quoted: msg });

        // Autres actions de groupe...
        // Exemples à supprimer ou modifier selon votre logique

        // Fin de la session
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
  }
}

module.exports = app;
