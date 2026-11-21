// Controllo dell'ordine dei file di js/ (CONTESTO_SVILUPPO.md, sezione 9). Uso:  node tools/check-js-order.mjs
// (prima volta: npm install, per acorn; solo strumento di sviluppo, non va sul sito)
//
// I file di js/ sono script classici eseguiti uno dopo l'altro nell'ordine dell'elenco FILES di script.js. Dentro un
// solo file le funzioni sono "sollevate" (si possono chiamare prima della loro riga); tra file diversi no, e const,
// let e class danno errore se usate prima della loro dichiarazione. Questo script legge i file nell'ordine del
// caricatore e segnala ogni nome globale (funzione, const, let, class) usato da codice eseguito AL CARICAMENTO di un
// file prima di essere dichiarato in quel file (const/let/class: più in alto; funzioni: ovunque nel file) o in uno
// precedente.
//
// Codice eseguito al caricamento: le istruzioni fuori dalle funzioni, le funzioni chiamate da lì (anche di altri
// file, seguite a catena), le funzioni scritte sul posto ed eseguite subito ((() => {...})(), forEach, map...).
// Non conta il codice delle callback (addEventListener, setTimeout, then, osservatori...): parte dopo. Le callback
// asincrone avviate al caricamento possono però scattare tra un file e l'altro: sono elencate a parte, da controllare
// a mano (non sono errori).
//
// Opzioni: --dir <cartella>  legge i file da un'altra cartella (stessi nomi), per provare una divisione diversa.
// Esce con codice 1 se ci sono segnalazioni.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argDir = process.argv.indexOf('--dir');
const JS_DIR = argDir > 0 ? process.argv[argDir + 1] : join(ROOT, 'js');

// Elenco dei file dal caricatore (script.js, array FILES)
const loader = readFileSync(join(ROOT, 'script.js'), 'utf8');
const listMatch = /var FILES = \[([\s\S]*?)\];/.exec(loader);
if (!listMatch) { console.error('script.js: elenco FILES non trovato'); process.exit(2); }
const FILES = [...listMatch[1].matchAll(/'([^']+\.js)'/g)].map(m => m[1]);

const SYNC_CALLBACK_METHODS = new Set(['forEach', 'map', 'filter', 'some', 'every', 'find', 'findIndex', 'findLast',
  'findLastIndex', 'reduce', 'reduceRight', 'flatMap', 'sort', 'from']);
const ASYNC_STARTERS = new Set(['setTimeout', 'setInterval', 'requestAnimationFrame', 'queueMicrotask', 'then', 'catch',
  'finally', 'observe']);

// --- Lettura dei file e dichiarazioni globali (livello più esterno) ---
const files = FILES.map((name, index) => {
  const code = readFileSync(join(JS_DIR, name), 'utf8');
  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  } catch (err) {
    console.error(`${name}: errore di sintassi: ${err.message}`);
    process.exit(2);
  }
  return { name, index, code, ast };
});

function patternNames(p, out = []) {
  if (!p) return out;
  if (p.type === 'Identifier') out.push(p.name);
  else if (p.type === 'ObjectPattern') p.properties.forEach(q => patternNames(q.type === 'RestElement' ? q.argument : q.value, out));
  else if (p.type === 'ArrayPattern') p.elements.forEach(e => patternNames(e, out));
  else if (p.type === 'RestElement') patternNames(p.argument, out);
  else if (p.type === 'AssignmentPattern') patternNames(p.left, out);
  return out;
}

const globals = new Map(); // nome -> { file, kind, stmtStart, line, node }
for (const f of files) {
  for (const st of f.ast.body) {
    const add = (name, kind, node) => {
      if (globals.has(name)) {
        const g = globals.get(name);
        console.warn(`avviso: ${name} dichiarato due volte (${files[g.file].name}:${g.line} e ${f.name}:${st.loc.start.line})`);
      }
      globals.set(name, { file: f.index, kind, stmtStart: st.start, line: st.loc.start.line, node });
    };
    if (st.type === 'FunctionDeclaration') add(st.id.name, 'function', st);
    else if (st.type === 'ClassDeclaration') add(st.id.name, 'class', st);
    else if (st.type === 'VariableDeclaration') st.declarations.forEach(d => patternNames(d.id).forEach(n => add(n, st.kind, d)));
  }
}

// --- Dichiarazioni locali di un blocco / di una funzione ---
function blockDecls(stmts, names = new Set()) {
  for (const s of stmts) {
    if (!s) continue;
    if (s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration') names.add(s.id.name);
    else if (s.type === 'VariableDeclaration') s.declarations.forEach(d => patternNames(d.id).forEach(n => names.add(n)));
  }
  return names;
}
// var di tutta la funzione (non quelle delle funzioni annidate)
function hoistedVars(node, names) {
  if (!node || typeof node.type !== 'string') return;
  if (/Function/.test(node.type)) return;
  if (node.type === 'VariableDeclaration' && node.kind === 'var') node.declarations.forEach(d => patternNames(d.id).forEach(n => names.add(n)));
  for (const key of Object.keys(node)) {
    const v = node[key];
    if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && hoistedVars(c, names));
    else if (v && typeof v.type === 'string') hoistedVars(v, names);
  }
}
function functionScope(fn) {
  const names = new Set();
  fn.params.forEach(p => patternNames(p).forEach(n => names.add(n)));
  if (fn.id && fn.type !== 'FunctionDeclaration') names.add(fn.id.name);
  names.add('arguments');
  if (fn.body.type === 'BlockStatement') { blockDecls(fn.body.body, names); hoistedVars(fn.body, names); }
  return names;
}

// --- Esecuzione simulata del caricamento ---
const problems = [];
const asyncStarts = [];

function checkFile(f) {
  const entered = new Set(); // funzioni già seguite durante il caricamento di questo file
  for (const st of f.ast.body) {
    const ctx = { load: f.index, stmtStart: st.start, stmtLine: st.loc.start.line, path: [] };
    if (st.type === 'FunctionDeclaration') continue;
    if (st.type === 'ClassDeclaration') { visit(st.superClass, [], ctx, f); continue; }
    visit(st, [], ctx, f);
  }

  function isLocal(name, scopes) { return scopes.some(s => s.has(name)); }

  function ref(name, node, scopes, ctx, where) {
    if (isLocal(name, scopes)) return;
    const g = globals.get(name);
    if (!g) return; // nome del browser (window, document...) o non globale
    let bad = false;
    if (g.file > ctx.load) bad = true;
    else if (g.file === ctx.load && g.kind !== 'function' && g.kind !== 'var' && g.stmtStart >= ctx.stmtStart) bad = true;
    if (bad) {
      problems.push({ file: files[ctx.load].name, line: ctx.stmtLine, name, decl: `${files[g.file].name}:${g.line}`,
        kind: g.kind, via: ctx.path.length ? ctx.path.join(' -> ') : '(diretto)', at: `${where.name}:${node.loc.start.line}` });
      return;
    }
    // Funzione chiamata o passata: se è chiamata la si segue (una volta per file caricato)
  }

  function enter(name, ctx) {
    const g = globals.get(name);
    if (!g || g.kind !== 'function' || g.file > ctx.load) return;
    if (entered.has(name)) return;
    entered.add(name);
    const fn = g.node;
    const where = files[g.file];
    const c2 = Object.assign({}, ctx, { path: ctx.path.concat(name) });
    runFunction(fn, [], c2, where);
  }

  function runFunction(fn, scopes, ctx, where) {
    const sc = scopes.concat([functionScope(fn)]);
    fn.params.forEach(p => visitPatternDefaults(p, sc, ctx, where));
    visit(fn.body, sc, ctx, where);
  }
  function visitPatternDefaults(p, scopes, ctx, where) {
    if (!p) return;
    if (p.type === 'AssignmentPattern') { visit(p.right, scopes, ctx, where); visitPatternDefaults(p.left, scopes, ctx, where); }
    else if (p.type === 'ObjectPattern') p.properties.forEach(q => {
      if (q.type === 'RestElement') return;
      if (q.computed) visit(q.key, scopes, ctx, where);
      visitPatternDefaults(q.value, scopes, ctx, where);
    });
    else if (p.type === 'ArrayPattern') p.elements.forEach(e => visitPatternDefaults(e, scopes, ctx, where));
  }

  function isFn(n) { return n && (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression'); }

  function visit(node, scopes, ctx, where) {
    if (!node || typeof node.type !== 'string') return;
    switch (node.type) {
      case 'Identifier': ref(node.name, node, scopes, ctx, where); return;
      case 'FunctionDeclaration': return; // dichiarata, non eseguita
      case 'FunctionExpression': case 'ArrowFunctionExpression': return; // non eseguita (salvo i casi sotto)
      case 'ClassDeclaration': case 'ClassExpression': visit(node.superClass, scopes, ctx, where); return;
      case 'MemberExpression':
        visit(node.object, scopes, ctx, where);
        if (node.computed) visit(node.property, scopes, ctx, where);
        return;
      case 'Property':
        if (node.computed) visit(node.key, scopes, ctx, where);
        if (node.kind === 'init' && !isFn(node.value)) visit(node.value, scopes, ctx, where);
        else if (node.shorthand) visit(node.value, scopes, ctx, where);
        return;
      case 'PropertyDefinition': case 'MethodDefinition': return;
      case 'LabeledStatement': visit(node.body, scopes, ctx, where); return;
      case 'BreakStatement': case 'ContinueStatement': return;
      case 'VariableDeclaration':
        node.declarations.forEach(d => { visitPatternDefaults(d.id, scopes, ctx, where); visit(d.init, scopes, ctx, where); });
        return;
      case 'BlockStatement': case 'StaticBlock':
        visitList(node.body, scopes.concat([blockDecls(node.body)]), ctx, where); return;
      case 'Program': visitList(node.body, scopes, ctx, where); return;
      case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': {
        const head = node.init || node.left;
        const sc = scopes.concat([head && head.type === 'VariableDeclaration' ? blockDecls([head]) : new Set()]);
        ['init', 'left', 'test', 'update', 'right', 'body'].forEach(k => node[k] && visit(node[k], sc, ctx, where));
        return;
      }
      case 'CatchClause': {
        const sc = scopes.concat([new Set(patternNames(node.param))]);
        visit(node.body, sc, ctx, where); return;
      }
      case 'SwitchStatement': {
        visit(node.discriminant, scopes, ctx, where);
        const sc = scopes.concat([blockDecls(node.cases.flatMap(c => c.consequent))]);
        node.cases.forEach(c => { visit(c.test, sc, ctx, where); visitList(c.consequent, sc, ctx, where); });
        return;
      }
      case 'CallExpression': case 'NewExpression': {
        const callee = node.callee;
        // (function () {...})() e (() => {...})(): eseguita subito
        if (isFn(callee)) { node.arguments.forEach(a => visit(a, scopes, ctx, where)); runFunction(callee, scopes, ctx, where); return; }
        visit(callee, scopes, ctx, where);
        const method = callee.type === 'MemberExpression' && !callee.computed ? callee.property.name : null;
        const fname = callee.type === 'Identifier' ? callee.name : null;
        node.arguments.forEach(a => {
          if (isFn(a)) {
            if (method && SYNC_CALLBACK_METHODS.has(method)) runFunction(a, scopes, ctx, where);
            else if ((method && ASYNC_STARTERS.has(method)) || (fname && ASYNC_STARTERS.has(fname)) || node.type === 'NewExpression') {
              if (ctx.load < files.length - 1) asyncStarts.push(`${where.name}:${a.loc.start.line} (${method || fname || 'new ' + (callee.name || '')}, caricando ${files[ctx.load].name})`);
            }
          } else {
            visit(a, scopes, ctx, where);
            // Funzione globale passata a un metodo sincrono (arr.forEach(fn)): eseguita subito
            if (a.type === 'Identifier' && method && SYNC_CALLBACK_METHODS.has(method) && !isLocal(a.name, scopes)) enter(a.name, ctx);
          }
        });
        if (fname && !isLocal(fname, scopes)) enter(fname, ctx);
        return;
      }
      default:
        for (const key of Object.keys(node)) {
          if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
          const v = node[key];
          if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && visit(c, scopes, ctx, where));
          else if (v && typeof v.type === 'string') visit(v, scopes, ctx, where);
        }
    }
  }
  function visitList(list, scopes, ctx, where) { list.forEach(s => visit(s, scopes, ctx, where)); }
}

files.forEach(checkFile);

console.log(`File controllati (ordine di script.js): ${FILES.length}; nomi globali: ${globals.size}`);
const seen = new Set();
const unique = problems.filter(p => { const k = p.file + p.line + p.name; if (seen.has(k)) return false; seen.add(k); return true; });
if (asyncStarts.length) {
  console.log(`\nCallback asincrone avviate al caricamento prima dell'ultimo file (possono scattare tra un file e l'altro; da controllare a mano, non sono errori): ${asyncStarts.length}`);
  [...new Set(asyncStarts)].forEach(a => console.log('  ' + a));
}
if (!unique.length) {
  console.log('\nNessuna segnalazione: ogni nome usato al caricamento è dichiarato prima.');
} else {
  console.log(`\nSegnalazioni: ${unique.length}`);
  unique.forEach(p => console.log(`  ${p.file}:${p.line} usa ${p.name} (${p.kind}, dichiarato in ${p.decl}) a ${p.at}, via ${p.via}`));
  process.exitCode = 1;
}
