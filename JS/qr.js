const express = require('express');
const axios = require('axios');
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
const { toDataURL } = require('qrcode');
const { insertSession } = require('./session'); // Importer la fonction pour interagir avec la base de données

const app = express.Router();
const msgRetryCounterCache = new NodeCache();

let sock;

app.get('/', async (req, res) => {
  await ovl(req, res);
});

async function ovl(req, res, disconnect = false) {
  const { state, saveCreds } = await useMultiFileAuthState(); // Supprimez le chemin du répertoire

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
    },
    printQRInTerminal: false,
    logger: pino({ level: 'fatal' }),
    browser: Browsers.macOS("Safari"),
    markOnlineOnConnect: true,
    msgRetryCounterCache
  });

  const qrOptions = {
    width: req.query.width || 270,
    height: req.query.height || 270,
    color: {
      dark: req.query.darkColor || '#000000',
      light: req.query.lightColor || '#ffffff'
    }
  };

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !disconnect) {
      try {
        const qrDataURL = await toDataURL(qr, qrOptions);
        const data = qrDataURL.split(',')[1];
        if (!res.headersSent) {
          res.send(data);
        }
      } catch (err) {
        console.error('Erreur lors de la génération du QR code :', err);
        if (!res.headersSent) {
          res.status(500).send('Erreur lors de la génération du QR code');
        }
      }
    }

    if (connection === 'open') {
      console.log('Connecté aux serveurs WhatsApp');
      await delay(5000);
      const CREDS = JSON.stringify(sock.authState.creds);

      try {
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
          caption: `*✅sᴇssɪᴏɴ ᴄᴏɴɴᴇᴄᴛᴇᴅ✅*
Utilisez l'identifiant de session ci-dessus pour
déployer votre bot.
╔════◇
║『 *VOUS AVEZ CHOISI HACKING-MD* 』
║ Vous avez terminé la première étape
║ pour déployer un bot WhatsApp.
╚════════════════╝
N'oubliez pas de mettre une étoile⭐ à mon repo !`
        });

      } catch (err) {
        console.error('Erreur d’upload :', err);
      } finally {
        await delay(1000);
        // Ici, nous n'utilisons plus de système de fichiers
      }
    } else if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      reconnect(reason, req, res);
    }
  });
}

function reconnect(reason, req, res) {
  if ([DisconnectReason.connectionLost, DisconnectReason.connectionClosed, DisconnectReason.restartRequired].includes(reason)) {
    console.log('Connexion perdue, reconnexion en cours...');
    ovl(req, res, true);
  } else {
    console.log(`Déconnecté ! Motif : ${reason}`);
    if (sock) sock.end();
  }
}

module.exports = app;
