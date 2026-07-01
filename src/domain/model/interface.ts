import type { ECandleStickInterval } from "../enum/ECandleStickInterval";

export interface CandleStickBinance{
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closeTime: number;
    quoteAssetVolume: number;
    numberOfTrades: number;
    takerBuyBaseAssetVolume: number;
    takerBuyQuoteAssetVolume: number;
}

// Binance WebSocket kline message format
export interface BinanceWsMessage {
    e: string; // Event type
    k: {
        t: number; // Kline start time (ms)
        o: string; // Open price
        h: string; // High price
        l: string; // Low price
        c: string; // Close price
        x: boolean; // Is this kline closed?
    };
}

export interface KlineProps {
    interval: ECandleStickInterval,
    intervals: string[]
}