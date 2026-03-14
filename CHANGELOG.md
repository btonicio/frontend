# CHANGELOG — frontend

Ogni sezione documenta le modifiche apportate al frontend, con data, file coinvolti e descrizione del comportamento.

---

## [2026-03-14] — Rinomina MATIC → POL

| File | Modifica |
|------|----------|
| `src/components/tabs/SettingsTab.tsx` | `MATIC/USDT` → `POL/USDT` nell'elenco `ALL_ASSETS` |

---

## [2026-03-13] — Full Sweep: persistenza stato + griglia storica

| File | Modifica |
|------|----------|
| `src/services/api.ts` | `optimizeFull()` ora ritorna `{ jobIds, sweepId }`; aggiunti `getFullSweeps()` (`GET /backtest/full-sweeps`) e `recommendForSweep(id)` (`POST /backtest/full-sweeps/:id/recommend`) |
| `src/components/tabs/OptimizeTab.tsx` | `sweepJobIds` e `recommendation` (già persistiti su localStorage) ora affiancati da `sweepId` anch'esso su localStorage; `handleFullSweep` salva il `sweepId` restituito dal backend; `handleRecommend` usa `recommendForSweep(sweepId)` se disponibile, altrimenti fallback su `recommend(jobIds)`; aggiunto `handleRecomputeSweep`; SWR `/backtest/full-sweeps` con polling 5s se RUNNING; nuova sezione **Full Sweep History** con griglia (symbol, periodo, combos, status, 4 dots job, data) — click riga espande la recommendation inline, tasto ↺ per ricalcolarla; aggiunto componente `FullSweepRow` |

**Motivazione**: lo stato del Full Sweep veniva perso al cambio tab/pagina. Ora sia lo sweep corrente (via localStorage) sia lo storico completo (via DB) sono sempre accessibili senza dover riavviare il sweep.

---

## [2026-03-11] — PerformanceTab: TP raggiunti e P&L parziale

| File | Modifica |
|------|----------|
| `src/types/index.ts` | Aggiunti campi `tp1HitCount`, `tp2HitCount`, `totalTpHits`, `partialPnlPct` all'interfaccia `PerformanceMetrics` |
| `src/components/tabs/PerformanceTab.tsx` | Aggiunta seconda riga di stat card nella sezione "Storico trade chiusi": TP1 Raggiunti, TP2 Raggiunti, Tot. TP Raggiunti (TP1+TP2+TP3), P&L Parziale (chiusi + open con TP1/TP2 hit) |

---

## [2026-03-11] — OptimizeTab: jobs queue asincrona con WebSocket live update

| File | Modifica |
|------|----------|
| `src/types/index.ts` | Aggiunto tipo `OptimizationJob`; aggiunto `'optimization:update'` al tipo `WebSocketMessage` |
| `src/store/appStore.ts` | Aggiunto stato `lastOptimizationEvent`; `handleWebSocketMessage` ora gestisce `optimization:update` |
| `src/services/api.ts` | `backtestApi.optimize` ora restituisce `Promise<{ jobId: number }>` (risposta immediata, senza timeout lungo) |
| `src/components/tabs/OptimizeTab.tsx` | **Completa riscrittura** — form submit istantaneo, griglia jobs RUNNING/COMPLETED/FAILED con polling SWR automatico ogni 3s, notifica WebSocket per refresh in tempo reale, pannello risultati inline, pulsante Apply params |

---

## [2026-03-11] — Fix OptimizeTab: errore "Optimization failed" e mismatch response

| File | Modifica |
|------|----------|
| `src/components/tabs/OptimizeTab.tsx` | Default `maxCombinations` ridotto da 200 a 80 per evitare timeout |
| `src/components/tabs/OptimizeTab.tsx` | Errore più descrittivo: `err.message` incluso come fallback (mostra "timeout of Xms exceeded" invece di generico "Optimization failed") |
| `src/components/tabs/OptimizeTab.tsx` | Risultati ottimizzazione: corretti i field name per matchare la risposta del backend (`totalTested` vs `totalCombinations`, `netProfit`/`netProfitPercent`/`sharpeRatio`/`winRate`/`totalTrades` direttamente sull'item vs annidati in `metrics`) |
| `src/components/tabs/OptimizeTab.tsx` | Tabella Top 20: colonne cambiate da RSI/MACD (non supportati) a LT/ST, RSI B/S, Stoch OS/OB (parametri reali del grid search backend) |
| `src/components/tabs/OptimizeTab.tsx` | Best Parameters detail: mostra longThreshold, shortThreshold, rsiBuyLevel, rsiSellLevel, stochOversold, stochOverbought invece di parametri MACD non esistenti |
| `src/components/tabs/OptimizeTab.tsx` | History table: `opt.bestMetricValue` + `opt.totalTested` al posto di field inesistenti (`bestProfitLoss`, `bestSharpeRatio`, `totalCombinations`) |

---

## [2026-03-11] — Logo asset nella HistoryTab

| File | Modifica |
|------|----------|
| `src/types/index.ts` | Aggiunti `cgImage?: string \| null` e `cgName?: string \| null` a `TradeEntry` |
| `src/components/tabs/HistoryTab.tsx` | Cella Asset nella `TradeRow`: aggiunta immagine logo 20×20px a sinistra del symbol (visibile solo se `cgImage` presente) |

---

## [2026-03-11] — Logo e nome asset nella SignalCard

| File | Modifica |
|------|----------|
| `src/types/index.ts` | Aggiunti `cgName?: string \| null` e `cgImage?: string \| null` all'interfaccia `Signal` |
| `src/components/SignalCard.tsx` | Header: aggiunta immagine logo (`<img>` 32×32px, visibile solo se `cgImage` presente) e nome (`cgName` inline come testo grigio accanto al symbol) |

---

## [2026-03-11] — Bottone Refresh CoinGecko in Gestione Asset

| File | Modifica |
|------|----------|
| `src/components/tabs/SettingsTab.tsx` | Aggiunto bottone "🔄 Refresh CoinGecko" nell'header della sezione Gestione Asset; chiama `POST /api/settings/assets/refresh-coingecko` e aggiorna la lista asset via SWR mutate |
| `src/services/api.ts` | Aggiunto `settingsApi.refreshCoinGecko()` |

**Comportamento**: il bottone è disabilitato durante l'aggiornamento (mostra "⏳ Aggiornamento..."). Al completamento mostra messaggio di conferma per 4s. Il refresh è sincrono lato backend (attende il completamento di tutti gli asset prima di rispondere).

---

## [2026-03-11] — Bottone notifica Telegram in SignalCard

| File | Modifica |
|------|----------|
| `src/components/SignalCard.tsx` | Decommentato e riscritto il bottone notifica: visibile solo per segnali con `id !== null` (non per segnali live senza DB record); disabilitato solo durante l'invio (`notifying`), non dopo; mostra "✅ Inviato!" per 3s poi torna a "🔔 Notifica Telegram" per permettere nuovi invii |

**Comportamento**: chiama `POST /api/signals/notify/{id}` al click. Riclicabile per inviare nuovamente la notifica Telegram.

---

## [2026-03-11] — Fix: chiave React e tipo Signal per segnali live senza DB record

| File | Modifica |
|------|----------|
| `src/types/index.ts` | `Signal.id` cambiato da `number` a `number \| null` per supportare segnali live generati al volo |
| `src/components/tabs/SignalsTab.tsx` | `key={signal.id}` → `key={signal.id ?? signal.symbol}` per evitare chiavi duplicate quando `id` è null |

---

## [2026-03-11] — checkIntervalSeconds aggiunto alla UI Settings

| File | Modifica |
|------|----------|
| `src/components/tabs/SettingsTab.tsx` | Aggiunto campo `checkIntervalSeconds` nel blocco `trading` del `useEffect` (lettura da `rawSettings`); aggiunto `InputRow` "Intervallo check (secondi)" con `<input type="number">` (min 10, max 3600, step 5) tra "SL cooldown" e "Notifica segnale bloccato" |

**Comportamento**: il valore viene letto dal backend al caricamento della pagina e salvato insieme agli altri parametri trading tramite `PATCH /api/settings`. Il cambio è applicato immediatamente senza riavvio del backend (hot-reload).

Aggiornato hint del campo: "applicato subito senza riavvio".

---
