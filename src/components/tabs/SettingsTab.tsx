'use client';

import React, { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { settingsApi } from '@/services/api';

const TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d'];
const LOG_LEVELS = ['error', 'warn', 'info', 'debug', 'verbose'];

const ALL_ASSETS = [
  'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT',
  'ADA/USDT', 'AVAX/USDT', 'DOGE/USDT', 'LINK/USDT', 'POL/USDT',
  'DOT/USDT', 'UNI/USDT', 'ATOM/USDT', 'LTC/USDT', 'ETC/USDT',
  'FIL/USDT', 'APT/USDT', 'ARB/USDT', 'OP/USDT', 'INJ/USDT',
  'SUI/USDT', 'TIA/USDT', 'TON/USDT', 'ENA/USDT', 'STORJ/USDT',
  'TAO/USDT', 'WIF/USDT', 'PEPE/USDT', 'BONK/USDT', 'JTO/USDT',
  'JUP/USDT', 'PYTH/USDT', 'W/USDT', 'STRK/USDT', 'MANTA/USDT',
];

export const SettingsTab: React.FC = () => {
  const { data: rawSettings, isLoading: settingsLoading } = useSWR('/settings', () => settingsApi.get());
  const { data: assetsData, isLoading: assetsLoading } = useSWR('/settings/assets', () => settingsApi.getAssets());

  const [trading, setTrading] = useState<Record<string, any>>({});
  const [conn, setConn] = useState<Record<string, any>>({});
  const [tradingSaving, setTradingSaving] = useState(false);
  const [connSaving, setConnSaving] = useState(false);
  const [tradingMsg, setTradingMsg] = useState<string | null>(null);
  const [connMsg, setConnMsg] = useState<string | null>(null);

  const [showAddAsset, setShowAddAsset] = useState(false);
  const [assetMsg, setAssetMsg] = useState<string | null>(null);
  const [cgRefreshing, setCgRefreshing] = useState(false);

  useEffect(() => {
    if (rawSettings) {
      setTrading({
        timeframe:           rawSettings.timeframe,
        lookbackCandles:     rawSettings.lookbackCandles,
        longThreshold:       rawSettings.longThreshold,
        shortThreshold:      rawSettings.shortThreshold,
        highConfidenceLong:  rawSettings.highConfidenceLong,
        highConfidenceShort: rawSettings.highConfidenceShort,
        stopLossMinPercent:  rawSettings.stopLossMinPercent,
        slReopenMinMinutes:    rawSettings.slReopenMinMinutes,
        checkIntervalSeconds:  rawSettings.checkIntervalSeconds ?? 60,
        notifyBlockedSignals:  rawSettings.notifyBlockedSignals ?? true,
        logLevel:              rawSettings.logLevel,
      });
      setConn({
        binanceApiKey:    rawSettings.binanceApiKey || '',
        telegramBotToken: rawSettings.telegramBotToken || '',
        telegramChatId:   rawSettings.telegramChatId || '',
      });
    }
  }, [rawSettings]);

  const saveTradingSettings = async () => {
    setTradingSaving(true);
    setTradingMsg(null);
    try {
      await settingsApi.update(trading);
      setTradingMsg('Parametri salvati con successo');
    } catch {
      setTradingMsg('Errore durante il salvataggio');
    } finally {
      setTradingSaving(false);
      setTimeout(() => setTradingMsg(null), 3000);
    }
  };

  const saveConnSettings = async () => {
    setConnSaving(true);
    setConnMsg(null);
    try {
      await settingsApi.update(conn);
      setConnMsg('Connessioni salvate (riavvia il backend per applicare la chiave Binance)');
    } catch {
      setConnMsg('Errore durante il salvataggio');
    } finally {
      setConnSaving(false);
      setTimeout(() => setConnMsg(null), 5000);
    }
  };

  const handleToggleAsset = async (symbol: string, isActive: boolean) => {
    try {
      await settingsApi.toggleAsset(symbol, isActive);
      mutate('/settings/assets');
    } catch {
      setAssetMsg('Errore toggle asset');
    }
  };

  const handleAddAsset = async (symbol: string) => {
    try {
      await settingsApi.addAsset(symbol);
      mutate('/settings/assets');
      setShowAddAsset(false);
      setAssetMsg(`${symbol} aggiunto`);
      setTimeout(() => setAssetMsg(null), 3000);
    } catch {
      setAssetMsg('Errore aggiunta asset');
    }
  };

  const handleRefreshCoinGecko = async () => {
    setCgRefreshing(true);
    setAssetMsg(null);
    try {
      await settingsApi.refreshCoinGecko();
      mutate('/settings/assets');
      setAssetMsg('Metadata CoinGecko aggiornati per tutti gli asset');
      setTimeout(() => setAssetMsg(null), 4000);
    } catch {
      setAssetMsg('Errore refresh CoinGecko');
    } finally {
      setCgRefreshing(false);
    }
  };

  const handleRemoveAsset = async (symbol: string) => {
    if (!confirm(`Rimuovere ${symbol}? Verranno conservati i segnali storici.`)) return;
    try {
      await settingsApi.removeAsset(symbol);
      mutate('/settings/assets');
      setAssetMsg(`${symbol} rimosso`);
      setTimeout(() => setAssetMsg(null), 3000);
    } catch {
      setAssetMsg('Errore rimozione asset');
    }
  };

  const existingSymbols = new Set((assetsData || []).map((a: any) => a.symbol));
  const availableToAdd = ALL_ASSETS.filter(s => !existingSymbols.has(s));

  const InputRow = ({
    label,
    children,
    hint,
  }: {
    label: string;
    children: React.ReactNode;
    hint?: string;
  }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b border-dark-border/40 last:border-0">
      <div className="sm:w-56 flex-shrink-0">
        <span className="text-sm text-gray-300">{label}</span>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );

  const inputClass =
    'w-full bg-dark-border text-white px-3 py-1.5 rounded border border-dark-border focus:border-blue-500 outline-none transition text-sm';

  if (settingsLoading) {
    return <div className="text-gray-400 text-sm">Caricamento impostazioni...</div>;
  }

  return (
    <div className="max-w-4xl space-y-8">

      {/* PARAMETRI TRADING */}
      <div className="card">
        <h3 className="text-xl font-bold mb-6">Parametri Trading</h3>

        <InputRow label="Timeframe" hint="Candele usate per gli indicatori">
          <select
            value={trading.timeframe || '15m'}
            onChange={e => setTrading(p => ({ ...p, timeframe: e.target.value }))}
            className={inputClass}
          >
            {TIMEFRAMES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </InputRow>

        <InputRow label="Lookback candles" hint="Numero candele caricate per il calcolo">
          <input
            type="number"
            value={trading.lookbackCandles || 250}
            min={60}
            max={500}
            onChange={e => setTrading(p => ({ ...p, lookbackCandles: Number(e.target.value) }))}
            className={inputClass}
          />
        </InputRow>

        <InputRow label="Long threshold" hint="Score minimo per aprire LONG (0–100)">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={50}
              max={80}
              step={1}
              value={trading.longThreshold || 60}
              onChange={e => setTrading(p => ({ ...p, longThreshold: Number(e.target.value) }))}
              className="flex-1 accent-green-500"
            />
            <span className="font-mono text-green-400 w-8 text-right">
              {trading.longThreshold ?? 60}
            </span>
          </div>
        </InputRow>

        <InputRow label="Short threshold" hint="Score massimo per aprire SHORT (0–100)">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={20}
              max={50}
              step={1}
              value={trading.shortThreshold || 40}
              onChange={e => setTrading(p => ({ ...p, shortThreshold: Number(e.target.value) }))}
              className="flex-1 accent-red-500"
            />
            <span className="font-mono text-red-400 w-8 text-right">
              {trading.shortThreshold ?? 40}
            </span>
          </div>
        </InputRow>

        <InputRow label="High confidence LONG" hint="Score minimo per confidence HIGH su LONG">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={60}
              max={95}
              step={1}
              value={trading.highConfidenceLong || 75}
              onChange={e => setTrading(p => ({ ...p, highConfidenceLong: Number(e.target.value) }))}
              className="flex-1 accent-blue-500"
            />
            <span className="font-mono text-blue-400 w-8 text-right">
              {trading.highConfidenceLong ?? 75}
            </span>
          </div>
        </InputRow>

        <InputRow label="High confidence SHORT" hint="Score massimo per confidence HIGH su SHORT">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={40}
              step={1}
              value={trading.highConfidenceShort || 25}
              onChange={e => setTrading(p => ({ ...p, highConfidenceShort: Number(e.target.value) }))}
              className="flex-1 accent-blue-500"
            />
            <span className="font-mono text-blue-400 w-8 text-right">
              {trading.highConfidenceShort ?? 25}
            </span>
          </div>
        </InputRow>

        <InputRow label="Stop Loss min %" hint="Distanza minima SL dall'entry price">
          <input
            type="number"
            value={trading.stopLossMinPercent || 1}
            min={0.1}
            max={10}
            step={0.1}
            onChange={e => setTrading(p => ({ ...p, stopLossMinPercent: Number(e.target.value) }))}
            className={inputClass}
          />
        </InputRow>

        <InputRow label="SL cooldown (minuti)" hint="Attesa minima prima di riaprire dopo uno Stop Loss">
          <input
            type="number"
            value={trading.slReopenMinMinutes || 60}
            min={0}
            max={1440}
            step={5}
            onChange={e => setTrading(p => ({ ...p, slReopenMinMinutes: Number(e.target.value) }))}
            className={inputClass}
          />
        </InputRow>

        <InputRow label="Intervallo check (secondi)" hint="Frequenza del loop di aggiornamento segnali — applicato subito senza riavvio (default: 60s)">
          <input
            type="number"
            value={trading.checkIntervalSeconds ?? 60}
            min={10}
            max={3600}
            step={5}
            onChange={e => setTrading(p => ({ ...p, checkIntervalSeconds: Number(e.target.value) }))}
            className={inputClass}
          />
        </InputRow>

        <InputRow label="Notifica segnale bloccato" hint="Invia notifica Telegram quando un segnale viene bloccato da cooldown SL o score non migliorato">
          <button
            type="button"
            onClick={() => setTrading(p => ({ ...p, notifyBlockedSignals: !p.notifyBlockedSignals }))}
            className={`relative w-10 h-5 rounded-full transition-colors ${trading.notifyBlockedSignals ? 'bg-green-600' : 'bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${trading.notifyBlockedSignals ? 'left-5' : 'left-0.5'}`} />
          </button>
        </InputRow>

        <InputRow label="Log level">
          <select
            value={trading.logLevel || 'info'}
            onChange={e => setTrading(p => ({ ...p, logLevel: e.target.value }))}
            className={inputClass}
          >
            {LOG_LEVELS.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </InputRow>

        {tradingMsg && (
          <div
            className={`mt-4 text-sm px-3 py-2 rounded ${
              tradingMsg.startsWith('Errore')
                ? 'bg-red-900/30 text-red-400'
                : 'bg-green-900/30 text-green-400'
            }`}
          >
            {tradingMsg}
          </div>
        )}
        <div className="mt-6">
          <button
            onClick={saveTradingSettings}
            disabled={tradingSaving}
            className="btn-primary disabled:opacity-50"
          >
            {tradingSaving ? 'Salvataggio...' : 'Salva parametri trading'}
          </button>
        </div>
      </div>

      {/* CONNESSIONI */}
      <div className="card">
        <h3 className="text-xl font-bold mb-2">Connessioni</h3>
        <p className="text-yellow-500 text-xs mb-6 bg-yellow-900/20 border border-yellow-700/30 px-3 py-2 rounded">
          La modifica di <strong>BINANCE_API_KEY</strong> richiede il riavvio del backend per essere
          applicata. Telegram è attivo immediatamente.
        </p>

        <InputRow label="Binance API Key">
          <input
            type="password"
            value={conn.binanceApiKey || ''}
            placeholder="Lascia vuoto per non modificare"
            onChange={e => setConn(p => ({ ...p, binanceApiKey: e.target.value }))}
            className={inputClass}
            autoComplete="off"
          />
        </InputRow>

        <InputRow label="Telegram Bot Token">
          <input
            type="password"
            value={conn.telegramBotToken || ''}
            placeholder="123456:ABC-DEF..."
            onChange={e => setConn(p => ({ ...p, telegramBotToken: e.target.value }))}
            className={inputClass}
            autoComplete="off"
          />
        </InputRow>

        <InputRow label="Telegram Chat ID">
          <input
            type="text"
            value={conn.telegramChatId || ''}
            placeholder="-100123456789"
            onChange={e => setConn(p => ({ ...p, telegramChatId: e.target.value }))}
            className={inputClass}
          />
        </InputRow>

        {connMsg && (
          <div
            className={`mt-4 text-sm px-3 py-2 rounded ${
              connMsg.startsWith('Errore')
                ? 'bg-red-900/30 text-red-400'
                : 'bg-green-900/30 text-green-400'
            }`}
          >
            {connMsg}
          </div>
        )}
        <div className="mt-6">
          <button
            onClick={saveConnSettings}
            disabled={connSaving}
            className="btn-primary disabled:opacity-50"
          >
            {connSaving ? 'Salvataggio...' : 'Salva connessioni'}
          </button>
        </div>
      </div>

      {/* GESTIONE ASSET */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Gestione Asset</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshCoinGecko}
              disabled={cgRefreshing}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-semibold transition disabled:opacity-50"
              title="Aggiorna id, nome, immagine e homepage da CoinGecko per tutti gli asset"
            >
              {cgRefreshing ? '⏳ Aggiornamento...' : '🔄 Refresh Dati'}
            </button>
            <button
              onClick={() => setShowAddAsset(v => !v)}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm font-semibold transition"
            >
              {showAddAsset ? 'Annulla' : '+ Aggiungi asset'}
            </button>
          </div>
        </div>

        {showAddAsset && (
          <div className="mb-6 p-4 bg-dark-border/40 rounded-lg border border-dark-border">
            <p className="text-sm text-gray-400 mb-3">Seleziona un asset da aggiungere:</p>
            <div className="flex flex-wrap gap-2">
              {availableToAdd.length === 0 ? (
                <span className="text-sm text-gray-500">
                  Tutti gli asset disponibili sono già aggiunti.
                </span>
              ) : (
                availableToAdd.map(s => (
                  <button
                    key={s}
                    onClick={() => handleAddAsset(s)}
                    className="px-3 py-1 bg-dark-card border border-dark-border hover:border-blue-500 text-sm rounded transition"
                  >
                    {s}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {assetMsg && (
          <div
            className={`mb-4 text-sm px-3 py-2 rounded ${
              assetMsg.startsWith('Errore')
                ? 'bg-red-900/30 text-red-400'
                : 'bg-green-900/30 text-green-400'
            }`}
          >
            {assetMsg}
          </div>
        )}

        {assetsLoading ? (
          <div className="text-gray-400 text-sm">Caricamento asset...</div>
        ) : (
          <div className="space-y-1">
            {(assetsData || []).map((asset: any) => (
              <div
                key={asset.symbol}
                className="flex items-center justify-between py-2.5 px-3 rounded hover:bg-dark-border/30 transition"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      asset.isActive ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  />
                  <span className="font-mono text-sm font-semibold">{asset.symbol}</span>
                  {asset.bestParams && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-900/40 text-blue-400 rounded border border-blue-800/50">
                      ottimizzato
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleAsset(asset.symbol, !asset.isActive)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      asset.isActive ? 'bg-green-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        asset.isActive ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => handleRemoveAsset(asset.symbol)}
                    className="text-gray-600 hover:text-red-400 transition text-xs px-2 py-1 rounded hover:bg-red-900/20"
                  >
                    rimuovi
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
