const fs = require("fs");
const { upload } = require("../mega"); // adjust path if needed
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const pino = require("pino");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Only GET requests are allowed" });
  }

  let num = req.query.number;
  if (!num) return res.status(400).json({ error: "Number is required" });

  const { state, saveCreds } = await useMultiFileAuthState(`./session`);

  try {
    let sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino().child({ level: "silent" })),
      },
      printQRInTerminal: false,
      browser: Browsers.macOS("Safari"),
      logger: pino().child({ level: "silent" }),
    });

    if (!sock.authState.creds.registered) {
      num = num.replace(/[^0-9]/g, "");
      const code = await sock.requestPairingCode(num);
      return res.status(200).json({ code });
    } else {
      return res.status(400).json({ error: "Already registered" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate code" });
  }
};
