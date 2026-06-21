import {
    createChart,
    CandlestickSeries,
    ColorType,
    type CandlestickData,
    type UTCTimestamp,
} from "lightweight-charts";

import { useEffect, useRef, useState } from "react";

import "./styles.css";
import type { ECandleStickInterval } from "../../domain/enum/ECandleStickInterval";

// ============================================
// 1. BINANCE API CONFIGURATION
// ============================================

const REST_URL_BASE = `https://api.binance.com/api/v3/klines`;
const WS_URL_BASE = `wss://stream.binance.com:9443/ws`;

// Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
type BinanceKline = [number, string, string, string, string, string, number, ...unknown[]];
// Binance WebSocket kline message format
interface BinanceWsMessage {
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

//======================
// 2. COMPONENT PROPS
//======================
interface KlineProps {
    symbol: string;
    interval: ECandleStickInterval
}

const LightChart: React.FC<KlineProps> = (props: KlineProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // ============================================
        // 3. CREATE THE CHART
        // ============================================
        const chart = createChart(containerRef.current!, {
            autoSize: true,
            layout: {
                background: { type: ColorType.Solid, color: '#131722' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#1f2943' },
                horzLines: { color: '#1f2943' },
            },
            crosshair: {
                mode: 0, // Normal mode - no snapping to prices
                vertLine: { color: '#758696', labelBackgroundColor: '#4c525e' },
                horzLine: { color: '#758696', labelBackgroundColor: '#4c525e' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 10,
            },
        }
        );

        // ============================================
        // 4. ADD CANDLESTICK SERIES
        // ============================================
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderUpColor: '#26a69a',
            borderDownColor: '#ef5350',
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        }
        );


        // ============================================
        // 5. FETCH HISTORICAL DATA
        // ============================================
        const fetchHistory = async (): Promise<void> => {
            const response = await fetch(`${REST_URL_BASE}?symbol=${props.symbol}&interval=${props.interval}&limit=100`);
            const klines: BinanceKline[] = await response.json();

            const history = klines.map((k) => {
                const item: CandlestickData = {
                    time: (k[0] / 1000) as UTCTimestamp, // Convert ms to seconds!
                    open: parseFloat(k[1]),
                    high: parseFloat(k[2]),
                    low: parseFloat(k[3]),
                    close: parseFloat(k[4]),
                };

                return item;
            }
            );

            candleSeries.setData(history);

            console.log(`Loaded ${history.length} candles`);
        }

        //===================
        // 6.CONNECT WEBSOCKETS
        //===================
        const connectWebSocket = () => {

            const ws = new WebSocket(`${WS_URL_BASE}/${props.symbol.toLowerCase()}@kline_${props.interval}`);

            ws.onopen = () => console.log('WebSocket connected');

            ws.onmessage = (event) => {
                const msg: BinanceWsMessage = JSON.parse(event.data);
                const k = msg.k;

                // Update chart with latest candle data
                candleSeries.update({
                    time: (k.t / 1000) as UTCTimestamp, // Convert ms to seconds!
                    open: parseFloat(k.o),
                    high: parseFloat(k.h),
                    low: parseFloat(k.l),
                    close: parseFloat(k.c),
                });
            };

            ws.onclose = () => {
                console.log('WebSocket closed, reconnecting...');
                setTimeout(connectWebSocket, 1000);
            };

            ws.onerror = (error) => console.error('WebSocket error:', error);
        }


        // Load historical data
        console.log('Fetching historical data...');
        fetchHistory();
        connectWebSocket();
    }, [props]);


    return (
        <div
            ref={containerRef}
            id={"chart"}
        />
    );
}

export { LightChart };