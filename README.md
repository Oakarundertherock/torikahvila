# OstoBot

Discord-botti:
- `/setup` lähettää viestin, jossa on kaksi nappia: **Täytä lomake** ja **Näytä omat ostoni**.
- **Täytä lomake** avaa lomakkeen (Discord modal) kysymyksillä *Mitä Ostit* ja *Paljonko Se Maksoi*.
- Kun lomake lähetetään, botti lähettää tiedon (käyttäjänimi, ostos, hinta, kaikkien aikojen yhteissumma) määriteltyyn kanavaan. Jokainen täyttö tulee omana uutena viestinä kanavan alle, samassa järjestyksessä kuin ne täytetään.
- **Näytä omat ostoni** näyttää käyttäjälle itselleen (vain hän näkee sen, "ephemeral"-viesti) listan kaikesta mitä hän on ikinä laittanut "Mitä Ostit" -kenttään, sekä yhteissumman.

Data tallennetaan tiedostoon `data/data.json` botin omalla levyllä (Wispbyte antaa botille pysyvän levytilan, toisin kuin Vercelin serverless-funktiot).

## 1. Luo Discord-sovellus ja botti

1. Mene osoitteeseen https://discord.com/developers/applications ja luo "New Application".
2. Vasemmalta **Bot** -> **Reset Token** -> kopioi token talteen (tämä on `DISCORD_TOKEN`).
3. Samalta Bot-sivulta varmista, ettei mitään ylimääräisiä "Privileged Gateway Intents" -asetuksia tarvitse päälle (botti ei tarvitse niitä, koska kaikki toimii nappien/lomakkeiden kautta).
4. **General Information** -sivulta kopioi **Application ID** (tämä on `CLIENT_ID`).
5. **OAuth2 -> URL Generator**:
   - Scopes: `bot` ja `applications.commands`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Use Application Commands`, `View Channel`
   - Kopioi generoitu linkki selaimeen ja lisää botti omalle Discord-palvelimellesi.
6. Ota Discordissa käyttäjäasetuksista **Developer Mode** päälle (Settings -> Advanced), jotta voit oikealla klikkauksella kopioida ID:t.
   - Klikkaa palvelimen nimeä oikealla -> **Copy Server ID** -> tämä on `GUILD_ID`.
   - Klikkaa sitä kanavaa oikealla, johon täytetyt lomakkeet lähetetään -> **Copy Channel ID** -> tämä on `LOG_CHANNEL_ID`.

## 2. Täytä ympäristömuuttujat

Kopioi `.env.example` nimelle `.env` ja täytä arvot:

```
DISCORD_TOKEN=botin_tokeni
CLIENT_ID=sovelluksen_id
GUILD_ID=palvelimen_id
LOG_CHANNEL_ID=kanavan_id
```

**Älä koskaan** jaa `.env`-tiedostoa tai laita sitä GitHubiin — `.gitignore` jättää sen automaattisesti pois.

## 3. Asenna riippuvuudet

Paikallisesti (tai Wispbyten konsolissa):

```bash
npm install
```

`/setup`-komento rekisteröidään **automaattisesti aina kun botti käynnistyy** (koodi tekee tämän itse `index.js`:ssä), joten erillistä `npm run deploy-commands`-vaihetta ei enää tarvitse ajaa käsin. (Tiedosto `deploy-commands.js` on silti mukana jos haluat joskus rekisteröidä komentoja erikseen ilman botin käynnistämistä.)

## 4. Aja botti

```bash
npm start
```

Kun botti on käynnissä, aja Discordissa haluamassasi kanavassa `/setup` — botti postaa lomake-viestin sinne.

## 5. Julkaisu Wispbytelle

1. Luo Wispbytelle uusi **Node.js**-palvelu / sovellus.
2. Lataa/pushaa tämän kansion tiedostot palveluun (esim. sen omalla Git-integraatiolla, tai lataamalla tiedostot suoraan paneelin kautta).
3. Aseta Wispbyten paneelissa ympäristömuuttujat (`DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `LOG_CHANNEL_ID`) — älä lataa `.env`-tiedostoa itse palveluun, käytä paneelin "Environment Variables" -osiota jos sellainen on tarjolla, tai lataa `.env` erikseen suoraan palvelimelle (ei GitHubiin).
4. Käynnistyskomentoa ei tarvitse muuttaa monimutkaiseksi — pelkkä `node index.js` (tai paneelin oma vakiokäynnistys, esim. Wispbyten `${JS_FILE}`-malli jossa `JS_FILE=index.js`) riittää, koska `/setup`-komento rekisteröityy automaattisesti joka käynnistyksellä.
5. Varmista, että palvelu pysyy jatkuvasti käynnissä (Wispbyte pitää Node-prosessin päällä koko ajan — tämä on tärkeää, koska botti käyttää pysyvää yhteyttä Discordiin, ei kertaluontoisia web-pyyntöjä).

## 6. GitHubiin vieminen

En pysty työkalujeni kanssa pushaamaan suoraan sinun GitHub-tilillesi (minulla ei ole sinun kirjautumistietojasi eikä verkkoyhteyttä ulospäin tässä ympäristössä). Tein kuitenkin kansiosta valmiin git-repositorion paikallisesti, joten sinun tarvitsee vain:

1. Luo tyhjä repositorio GitHubissa (ilman README/.gitignorea, koska niitä on jo täällä).
2. Aja tässä kansiossa:

```bash
git remote add origin https://github.com/KAYTTAJANIMESI/REPO-NIMI.git
git branch -M main
git push -u origin main
```

Tämän jälkeen koodi on GitHubissa, ja voit jatkossa pushata muutokset normaalisti `git add . && git commit -m "viesti" && git push`. Monilla hosting-palveluilla (myös Wispbytellä, jos sillä on Git-deploy-ominaisuus) voi yhdistää suoraan tämän GitHub-repon, jolloin päivitykset menevät automaattisesti palvelimelle kun pushaat.

## Huomioita

- Hintakenttä hyväksyy sekä pilkun että pisteen desimaalierottimena (esim. `4,50` tai `4.50`).
- "Näytä omat ostoni" -lista katkaistaan, jos ostoshistoria kasvaa erittäin pitkäksi (Discordin viestirajoitusten takia).
- `/setup` on oletuksena rajattu ylläpitäjille (voit muuttaa tätä palvelimen Asetukset -> Integraatiot -kohdasta).

### Admin-komennot

- **`/aseta-summa kayttaja:@Käyttäjä summa:42.50`** — asettaa kyseisen käyttäjän "Käytetty yhteensä" -summan suoraan haluttuun arvoon (ylikirjoittaa, ei vaikuta ostoshistoriaan). Vain Administrator-oikeuden omaavat näkevät/voivat käyttää tätä komentoa oletuksena.
- **`/katso-summa kayttaja:@Käyttäjä`** — näyttää (vain komennon käyttäjälle) kyseisen käyttäjän kokonaissumman ja ostosten määrän ilman, että tarvitsee selata lokikanavaa läpi.

Kummankin komennon näkyvyyttä voi säätää palvelimen Asetukset -> Integraatiot -kohdasta, jos haluat antaa oikeuden myös muille kuin Administrator-roolille.
