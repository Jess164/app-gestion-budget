// Parcours complet sur deux « téléphones » qui partagent un faux script Google (le vrai Code.gs, exécuté en local).
// Lancer : npm run build && npx vite preview --port 4173 &  puis  node test/e2e.mjs [dossier-captures]
import { readFileSync, mkdirSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
const { chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright');

const BASE = process.env.BASE || 'http://localhost:4173/';
const SHOTS = process.argv[2] || 'e2e-shots';
mkdirSync(SHOTS, { recursive: true });
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbTEST_e2e-123/exec';

function fakeScript() {
  const props = new Map();
  const grid = [];
  let created = false;
  const sheet = {
    getLastRow: () => grid.length,
    getRange: (row, _c, n, m) => ({
      getValues: () => grid.slice(row - 1, row - 1 + n).map((r) => r.slice(0, m)),
      setValues: (vals) => vals.forEach((v, i) => { grid[row - 1 + i] = [...v]; })
    }),
    setFrozenRows: () => {}
  };
  const ctx = createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v), deleteProperty: (k) => props.delete(k) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => (created ? sheet : null), insertSheet: () => { created = true; return sheet; } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ setMimeType: () => ({ body: s }) }) }
  });
  runInContext(readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), ctx);
  return { ctx, grid };
}

const server = fakeScript();
let failures = 0;
const ok = (cond, label) => { console.log((cond ? 'OK   ' : 'FAIL ') + label); if (!cond) failures++; };

async function phone(browser, scheme = 'light') {
  const net = { down: false };
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme, serviceWorkers: 'block', hasTouch: true, isMobile: true });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  await context.route('https://script.google.com/**', async (route) => {
    if (net.down) return route.abort('internetdisconnected');
    const req = route.request();
    const out = req.method() === 'GET' ? server.ctx.doGet() : server.ctx.doPost({ postData: { contents: req.postData() } });
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: out.body });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('ERR_INTERNET_DISCONNECTED') && errors.push(m.text()));
  return { page, errors, context, net };
}
const text = (page) => page.locator('#root').innerText();
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });

const browser = await chromium.launch();
try {
  // --- Téléphone A : première configuration ---
  const A = await phone(browser);
  await A.page.goto(BASE);
  await shot(A.page, '01-accueil');
  await A.page.getByText("C'est moi qui ai installé le script Google").click();
  await A.page.fill('#s-url', 'https://exemple.fr/pas-un-script');
  await A.page.fill('#s-a', 'Jess');
  await A.page.fill('#s-b', 'Léa');
  await A.page.getByRole('button', { name: 'Relier mon téléphone' }).click();
  ok((await text(A.page)).includes('ne ressemble pas'), 'A : adresse invalide refusée');
  await A.page.fill('#s-url', SCRIPT_URL);
  await A.page.getByRole('button', { name: 'Relier mon téléphone' }).click();
  await A.page.getByText("C'est prêt").waitFor();
  const link = await A.page.locator('textarea').inputValue();
  ok(link.includes('#rejoindre='), 'A : lien d\'invitation créé');
  await shot(A.page, '02-invitation');
  await A.page.getByRole('button', { name: 'Retour' }).click();
  ok((await text(A.page)).toLowerCase().includes('dépensé ce mois'), 'A : budget sans plafond');

  // Paramètres : plafond du mois, plafond de Courses
  await A.page.getByRole('button', { name: 'Paramètres' }).click();
  await A.page.fill('#p-plafond', '600');
  await A.page.locator('#p-plafond').blur();
  await A.page.getByLabel('Plafond de Courses').fill('200');
  await A.page.getByLabel('Plafond de Courses').blur();
  await A.page.getByLabel('Couleur de Restos & sorties').click();
  await A.page.getByLabel('Couleur #9B7BF2').click();
  await shot(A.page, '03-parametres');
  await A.page.getByRole('button', { name: 'Retour' }).click();
  ok((await text(A.page)).includes('600,00'), 'A : plafond du mois appliqué');

  // Ajout d'une dépense avec calcul
  await A.page.getByRole('button', { name: 'Dépense' }).click();
  await A.page.fill('#f-amount', '12,40');
  await A.page.getByRole('button', { name: 'Plus' }).click();
  await A.page.keyboard.type('8,90');
  ok((await text(A.page)).includes('= 21,30'), 'A : calcul 12,40+8,90 = 21,30');
  await A.page.fill('#f-label', 'Carrefour');
  await A.page.getByRole('button', { name: 'Ajouter la dépense' }).click();
  let t = await text(A.page);
  ok(t.includes('578,70'), 'A : reste du mois 578,70');
  await A.page.getByRole('button', { name: 'Dépense' }).click();
  await A.page.fill('#f-amount', '190');
  await A.page.getByRole('button', { name: 'Ajouter la dépense' }).click();
  t = await text(A.page);
  ok(t.includes('Dépassé de 11,30'), 'A : Courses dépassé de 11,30');
  // Modifier puis supprimer
  await A.page.getByRole('button', { name: /^Courses.*190,00/ }).click();
  await A.page.fill('#f-amount', '150');
  await A.page.getByRole('button', { name: 'Enregistrer' }).click();
  t = await text(A.page);
  ok(t.includes('Plus que 28,70') || t.includes('PLUS QUE 28,70'), 'A : modification → plus que 28,70');
  await A.page.getByRole('button', { name: 'Dépense' }).click();
  await A.page.fill('#f-amount', '5');
  await A.page.getByRole('button', { name: 'Ajouter la dépense' }).click();
  await A.page.getByRole('button', { name: /^Courses.*5,00/ }).click();
  await A.page.getByRole('button', { name: 'Supprimer cette dépense' }).click();
  await A.page.getByRole('button', { name: 'Supprimer', exact: true }).click();
  ok(!(await text(A.page)).includes('5,00 €\n'), 'A : dépense supprimée');
  await A.page.getByRole('button', { name: 'Mettre à jour' }).click();
  await A.page.waitForTimeout(300);
  ok((await text(A.page)).includes('Synchronisé à'), 'A : synchronisé');
  await shot(A.page, '04-budget-A');

  // --- Téléphone B : rejoint avec le lien (mode sombre) ---
  const B = await phone(browser, 'dark');
  await B.page.goto(link);
  ok((await B.page.locator('#s-inv').inputValue()).includes('rejoindre='), 'B : lien prérempli');
  await B.page.getByRole('button', { name: 'Continuer' }).click();
  await B.page.getByText('Qui es-tu').first().waitFor();
  await shot(B.page, '05-qui-es-tu');
  await B.page.getByRole('button', { name: "C'est parti" }).click();
  t = await text(B.page);
  ok(t.includes('Jess'), 'B : voit le prénom de sa sœur');
  await B.page.getByRole('button', { name: 'Jess' }).click();
  t = await text(B.page);
  ok(t.includes('Carrefour') && t.includes('lecture seule'), 'B : voit les dépenses de Jess en lecture seule');
  ok((await B.page.locator('.fab').count()) === 0, 'B : pas de bouton Dépense sur le budget de Jess');
  await B.page.getByRole('button', { name: 'Toi' }).click();
  await B.page.getByRole('button', { name: 'Dépense' }).click();
  await B.page.fill('#f-amount', '42');
  await B.page.fill('#f-label', 'Cinéma');
  await B.page.getByRole('button', { name: /Loisirs/ }).click();
  await B.page.getByRole('button', { name: 'Ajouter la dépense' }).click();
  await B.page.waitForTimeout(2200); // synchro automatique après une modification
  await shot(B.page, '06-budget-B-sombre');

  // A récupère la dépense de B
  await A.page.getByRole('button', { name: 'Mettre à jour' }).click();
  await A.page.waitForTimeout(300);
  await A.page.getByRole('button', { name: 'Léa' }).click();
  ok((await text(A.page)).includes('Cinéma'), 'A : voit la dépense de Léa après synchro');

  // Calculatrice
  await A.page.getByRole('button', { name: 'Calculatrice' }).click();
  for (const k of ['1', '2', 'Virgule', '4', 'Plus', '8', 'Virgule', '9']) await A.page.getByRole('button', { name: k, exact: true }).click();
  ok((await text(A.page)).includes('21,3'), 'A : calculatrice 12,4+8,9');
  await shot(A.page, '07-calculatrice');

  // Mode sombre forcé puis automatique
  await A.page.getByRole('button', { name: 'Budget' }).click();
  await A.page.getByRole('button', { name: 'Paramètres' }).click();
  await A.page.getByRole('button', { name: 'Sombre' }).click();
  ok((await A.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--is-dark').trim())) === '1', 'A : mode sombre forcé');
  await shot(A.page, '08-parametres-sombre');
  await A.page.getByRole('button', { name: 'Automatique' }).click();
  ok((await A.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--is-dark').trim())) === '0', 'A : retour au mode du téléphone');

  // Hors ligne : le changement attend puis part
  A.net.down = true;
  await A.page.getByRole('button', { name: 'Retour' }).click();
  await A.page.getByRole('button', { name: 'Toi' }).click();
  await A.page.getByRole('button', { name: 'Dépense' }).click();
  await A.page.fill('#f-amount', '3');
  await A.page.getByRole('button', { name: 'Ajouter la dépense' }).click();
  await A.page.waitForTimeout(2200);
  ok((await text(A.page)).includes('1 changement en attente'), 'A : hors ligne, changement en attente');
  A.net.down = false;
  await A.page.getByRole('button', { name: 'Mettre à jour' }).click();
  await A.page.waitForTimeout(400);
  ok((await text(A.page)).includes('Synchronisé à'), 'A : de retour en ligne, synchronisé');

  // Rechargement : les données restent
  await B.page.reload();
  await B.page.waitForTimeout(500);
  ok((await text(B.page)).includes('Cinéma'), 'B : données gardées après rechargement');

  const width = await A.page.evaluate(() => document.documentElement.scrollWidth);
  ok(width <= 390, `pas de défilement horizontal (${width})`);
  ok(A.errors.length === 0 && B.errors.length === 0, 'aucune erreur JavaScript ' + JSON.stringify([...A.errors, ...B.errors].slice(0, 3)));
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} échec(s)` : '\nTout est bon');
process.exit(failures ? 1 : 0);
