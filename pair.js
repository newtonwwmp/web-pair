const express = require("express");
const fs = require("fs");
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  jidNormalizedUser,
} = require("@whiskeysockets/baileys");
const { upload } = require("./mega");

function removeFile(FilePath) {
  if (!fs.existsSync(FilePath)) return false;
  fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get("/", async (req, res) => {
  let num = req.query.number;
  async function RobinPair() {
    const { state, saveCreds } = await useMultiFileAuthState(`./session`);
    try {
      let RobinPairWeb = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: "fatal" }).child({ level: "fatal" })
          ),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }).child({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
      });

      if (!RobinPairWeb.authState.creds.registered) {
        await delay(1500);
        num = num.replace(/[^0-9]/g, "");
        const code = await RobinPairWeb.requestPairingCode(num);
        if (!res.headersSent) {
          await res.send({ code });
        }
      }

      RobinPairWeb.ev.on("creds.update", saveCreds);
      RobinPairWeb.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;
        if (connection === "open") {
          try {
            await delay(10000);
            const sessionPrabath = fs.readFileSync("./session/creds.json");

            const auth_path = "./session/";
            const user_jid = jidNormalizedUser(RobinPairWeb.user.id);

            function randomMegaId(length = 6, numberLength = 4) {
              const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
              let result = "";
              for (let i = 0; i < length; i++) {
                result += characters.charAt(
                  Math.floor(Math.random() * characters.length)
                );
              }
              const number = Math.floor(
                Math.random() * Math.pow(10, numberLength)
              );
              return `${result}${number}`;
            }

            const mega_url = await upload(
              fs.createReadStream(auth_path + "creds.json"),
              `${randomMegaId()}.json`
            );

            const string_session = mega_url.replace(
              "https://mega.nz/file/",
              ""
            );

            const sid = `*MAHII-MD  [The powerful WA BOT]*\n\n👉 ${string_session} 👈\n\n*This is the your Session ID, copy this id and paste into config.js file*\n\n*You can ask any question using this link*\n\n*wa.me/message/WKGLBR2PCETWD1*`;
            const mg = `🛑 *Do not share this code to anyone* 🛑`;
            const dt = await RobinPairWeb.sendMessage(user_jid, {
              image: {
                url: "https://imagekit.io/tools/asset-public-link?detail=%7B%22name%22%3A%22ChatGPT%20Image%20Apr%2021%2C%202025%2C%2005_32_50%20PM.png%22%2C%22type%22%3A%22image%2Fpng%22%2C%22signedurl_expire%22%3A%222028-04-20T12%3A37%3A42.967Z%22%2C%22signedUrl%22%3A%22https%3A%2F%2Fmedia-hosting.imagekit.io%2F72930824fe274aa7%2FChatGPT%2520Image%2520Apr%252021%2C%25202025%2C%252005_32_50%2520PM.png%3FExpires%3D1839847063%26Key-Pair-Id%3DK2ZIVPTIP2VGHC%26Signature%3DlH5JAe1QRp6~b3l42HFUTJ4PUA1AtY3E-Z~g4s53BFsLIUjbNNUjFmuyq0ZoZKjJ-uC1Fkb~CUnn8tj61LB4v8rXU5IlmaS5Y6cxdzuTv2nf6DuAFvvd8R8ylHTGZ~Xu~kUVGe1Cnv8xCGR3U0mhIf-xiabH7JAzCGG8eFk8gL-SdkCusoZyU93B8lZPkpyNIzMGHjOKsjBbDqSZUdbC8HJajEDYnDxrbEuDe3yvkIrxfgyb67gVOnK4xvLpdhl8kWdaRmoexof9r~2GsRuW7vyLWDxlAkzdOlh0siBaURz9hhQwbvSHLdjs0GLYnZjpOFzAOhW09Vf7KHuueoUWzg__%22%7D",
              },
              caption: sid,
            });
            const msg = await RobinPairWeb.sendMessage(user_jid, {
              text: string_session,
            });
            const msg1 = await RobinPairWeb.sendMessage(user_jid, { text: mg });
          } catch (e) {
            exec("pm2 restart prabath");
          }

          await delay(100);
          return await removeFile("./session");
          process.exit(0);
        } else if (
          connection === "close" &&
          lastDisconnect &&
          lastDisconnect.error &&
          lastDisconnect.error.output.statusCode !== 401
        ) {
          await delay(10000);
          RobinPair();
        }
      });
    } catch (err) {
      exec("pm2 restart Robin-md");
      console.log("service restarted");
      RobinPair();
      await removeFile("./session");
      if (!res.headersSent) {
        await res.send({ code: "Service Unavailable" });
      }
    }
  }
  return await RobinPair();
});

process.on("uncaughtException", function (err) {
  console.log("Caught exception: " + err);
  exec("pm2 restart Robin");
});

module.exports = router;
