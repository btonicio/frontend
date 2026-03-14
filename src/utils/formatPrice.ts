/**
 * Formatta il prezzo con il numero appropriato di decimali
 * @param price - Prezzo da formattare
 * @returns Prezzo formattato come stringa
 */
export function formatPrice(price: number): string {
  if (price >= 1) {
    // BTC, ETH, BNB, ecc. -> 2 decimali
    return price.toFixed(2);
  } else if (price >= 0.01) {
    // Prezzi medi -> 4 decimali
    return price.toFixed(4);
  } else {
    // Altcoin a basso prezzo (ARK, DOGE, etc.) -> 6 decimali
    return price.toFixed(6);
  }
}

/**
 * Ottiene il numero di decimali appropriato per un prezzo
 * @param price - Prezzo da analizzare
 * @returns Numero di decimali da usare
 */
export function getPriceDecimals(price: number): number {
  if (price >= 1) return 2;
  if (price >= 0.01) return 4;
  return 6;
}
