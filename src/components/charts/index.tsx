import {
    createChart,
    CandlestickSeries,
    ColorType,
    type CandlestickData,
    type UTCTimestamp,
    AreaSeries,
    BaselineSeries,
    LineSeries,
    type IChartApi,
    HistogramSeries,
} from "lightweight-charts";
import * as signalR from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";

import "./styles.css";
import { CandleStickInterval, type ECandleStickInterval } from "../../domain/enum/ECandleStickInterval";
import { Legend } from "./legend";
import type { HubConnection } from "@microsoft/signalr";

// ============================================
// 1. BINANCE API CONFIGURATION
// ============================================

//const REST_URL_BASE = `https://api.binance.com/api/v3/klines`;
//const WS_URL_BASE = `wss://stream.binance.com:9443/ws`;
const REST_URL_BASE = `http://localhost:5043/Candle/symbol`;
const WS_URL_BASE = `http://localhost:5043/candleStickHub`;

// Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
type BinanceKline = [number, string, string, string, string, string, number, ...unknown[]];

interface CandleStickBinance{
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
    interval: ECandleStickInterval,
    intervals: string[]
}

const LightChart: React.FC<KlineProps> = (props: KlineProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [connection, setConnection] = useState<HubConnection>();
    const [historyData, setHistoryData] = useState<CandlestickData[]>();
    //const [intervals, setIntervals] = useState<string[]>(Object.values(CandleStickInterval));

    const [chartInterval, setChartInterval] = useState(props.interval);
    const intervalColors = {
        '1m': "rgb(124, 157, 249)",
        '1D': '#2962FF',
        '1W': 'rgb(225, 87, 90)',
        '1M': 'rgb(242, 142, 44)',
        '1Y': 'rgb(164, 89, 209)',
    };


const seriesData = new Map([
    ['1m', { time: '2026-06-21', value: 24.89 }],
    ['1D', { time: '2026-06-21', value: 24.89 }],
    ['1W', { time: '2026-06-21', value: 24.89 }],
    ['1M', { time: '2026-06-21', value: 24.89 }],
    ['1Y', { time: '2026-06-21', value: 24.89 }],
]);


    const [legendData, setLegendData] = useState({
        symbol: "",
        price: "0.00"
    });
    let destroyed = false;
    let ws : WebSocket | null = null;

    const calculateMovingAverageSeriesData = (candleData : CandlestickData[], maLength : number) =>{
    const maData = [];

    for (let i = 0; i < candleData.length; i++) {
        if (i < maLength) {
            // Provide whitespace data points until the MA can be calculated
            maData.push({ time: candleData[i].time });
        } else {
            // Calculate the moving average, slow but simple way
            let sum = 0;
            for (let j = 0; j < maLength; j++) {
                sum += candleData[i - j].close;
            }
            const maValue = sum / maLength;
            maData.push({ time: candleData[i].time, value: maValue });
        }
    }

    return maData;
}


    useEffect(() => {
        if (!containerRef.current) return;

        // ============================================
        // 3. CREATE THE CHART
        // ============================================
        const chart = createChart(containerRef.current!, {
            autoSize: true,
            layout: {
                background: { type: ColorType.Solid, color: "white" },
                textColor: '#d1d4dc',
                panes: {
                    separatorColor: '#f22c3d',
                    separatorHoverColor: 'rgba(255, 0, 0, 0.1)',
                    // setting this to false will disable the resize of the panes by the user
                    enableResize: false,
                },
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
        },1);

        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '', // set as an overlay by setting a blank priceScaleId
            // set the positioning of the volume series
        });
        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.7, // highest point of the series will be 70% away from the top
                bottom: 0,
            },
        });


        //===================
        // 5. ADD AREA CHART
        //===================
        // const areaSeries = chart.addSeries(AreaSeries, {
        //     lineColor: '#2962FF', topColor: '#2962FF',
        //     bottomColor: 'rgba(41, 98, 255, 0.28)',
        // });

        //===================
        // 6. ADD BASELINE CHART
        //===================
        const baseLineSeries = chart.addSeries(BaselineSeries, { 
            baseValue: { type: 'price', price: 64200 }, 
            topLineColor: 'rgba( 38, 166, 154, 1)', 
            topFillColor1: 'rgba( 38, 166, 154, 0.28)', 
            topFillColor2: 'rgba( 38, 166, 154, 0.05)', 
            bottomLineColor: 'rgba( 239, 83, 80, 1)', 
            bottomFillColor1: 'rgba( 239, 83, 80, 0.05)', 
            bottomFillColor2: 'rgba( 239, 83, 80, 0.28)' 
        });

        const inverseBaseLineSeries = chart.addSeries(BaselineSeries, { 
            baseValue: { type: 'price', price: 64200 }, 
            topLineColor: 'rgba( 38, 166, 154, 1)', 
            topFillColor1: 'rgba( 38, 166, 154, 0.28)', 
            topFillColor2: 'rgba( 38, 166, 154, 0.05)', 
            bottomLineColor: 'rgba( 239, 83, 80, 1)', 
            bottomFillColor1: 'rgba( 239, 83, 80, 0.05)', 
            bottomFillColor2: 'rgba( 239, 83, 80, 0.28)' 
        });

        
        const maSeries = chart.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1 });
        
        //const lineSeries = chart.addSeries(LineSeries, { color: intervalColors[props.interval as keyof typeof intervalColors] });

        const handleChartInterval = (interval:keyof typeof intervalColors) => {

            const colorInterval = intervalColors[interval];

            // lineSeries.applyOptions({
            //     color: colorInterval,
            // });

            const localInterval = seriesData.get(interval);

            //lineSeries.setData([localInterval!]);
            chart.timeScale().fitContent();
        }

        handleChartInterval(chartInterval as keyof typeof intervalColors);

        
        // ============================================
        // 6. FETCH HISTORICAL DATA
        // ============================================
        const fetchHistory = async (): Promise<void> => {
            const response = await fetch(`${REST_URL_BASE}?symbol=${props.symbol}&interval=${chartInterval}`);
            //const klines: BinanceKline[] = await response.json();
            const klines: CandleStickBinance[] = await response.json();

            const history = klines.map((k) => {
                // const item: CandlestickData = {
                //     time: (k[0] / 1000) as UTCTimestamp, // Convert ms to seconds!
                //     open: parseFloat(k[1]),
                //     high: parseFloat(k[2]),
                //     low: parseFloat(k[3]),
                //     close: parseFloat(k[4]),
                // };
                const item: CandlestickData = {
                    time: (k.openTime / 1000) as UTCTimestamp, // Convert ms to seconds!
                    open: k.open,
                    high: k.high,
                    low: k.low,
                    close: k.close,
                };

                return item;
            }
            );

            setHistoryData(history);

            // lineSeries.setData(
            //     history.map(item => ({
            //         time: item.time,
            //         value: item.close,
            //     }))
            // );

            candleSeries.setData(history);
            setLegendData({...legendData,
                price: history[history.length -1].close.toFixed(2)
            })

            volumeSeries.setData(klines.map((k) => {
                const item = {
                    time: (k.openTime / 1000) as UTCTimestamp, // Convert ms to seconds!
                    value: k.volume,
                    color: k.close >= k.open ? '#26a69a' : '#ef5350'
                };

                return item;
            }));

            const candlesPane = chart.panes()[1];
            if(candlesPane)
            {
                candlesPane.moveTo(0);
                candlesPane.setHeight(450);
                chart.timeScale().fitContent();
            }

            // const maData = calculateMovingAverageSeriesData(history, 20);
            // maSeries.setData(maData);
            
            // areaSeries.setData(history.map(as => (
            //     {
            //         time: as.time,
            //         value: as.close
            //     }))
            // );

            // baseLineSeries.setData(history.map(as => (
            //     {
            //         time: as.time,
            //         value: as.close + 200
            //     })));
            
            //     inverseBaseLineSeries.setData(history.map(as => (
            //     {
            //         time: as.time,
            //         value: as.close - 200
            //     })));

            console.log(`Loaded ${history.length} candles`);
        }

        //===================
        // 7. GET PRICE ON THE CURSOR
        //==================
        chart.subscribeCrosshairMove(param => {
            let priceFormatted = '';
            if (param.time) {
                const data : any = param.seriesData.get(candleSeries);
                const priceFormatted = data?.close?.toFixed(2);
                setLegendData({
                    price: priceFormatted,
                    symbol: props.symbol
                });
            }
        });


        //===================
        // 8.CONNECT WEBSOCKETS
        //===================
        {/*
        const connectWebSocket = () => {

            ws = new WebSocket(`${WS_URL_BASE}/${props.symbol.toLowerCase()}@kline_${chartInterval}`);
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

                chart.timeScale().fitContent();
                chart.timeScale().scrollToPosition(5, true);

                 // baseLineSeries.update({
                //     time: (k.t / 1000) as UTCTimestamp, // Convert ms to seconds!
                //     value: parseFloat(k.c) + 200,
                // });

                // inverseBaseLineSeries.update(
                // {
                //     time: (k.t / 1000) as UTCTimestamp,
                //     value: parseFloat(k.c) - 200
                // });
            };

            ws.onclose = () => {
                console.log('WebSocket closed, reconnecting...');
                if (!destroyed) {
                    setTimeout(connectWebSocket, 1000);
                }
            };

            ws.onerror = (error) => console.error('WebSocket error:', error);
        }
        */}

        const connectWebSocket = async () =>{
            const newConnection = new signalR.HubConnectionBuilder()
                  .withUrl(WS_URL_BASE) // ajuste para sua URL real
                  .withAutomaticReconnect()
                  .configureLogging(signalR.LogLevel.Information)
                  .build();
            
                // Tenta conectar
                async function start() {
                  try {
                    await newConnection.start();
                    console.log("Conectado ao SignalR");
                  } catch (err) {
                    console.error("Erro ao conectar:", err);
                    setTimeout(start, 3000); // tenta de novo regularmente
                  }
                }
            
                setConnection(newConnection);
                start();

        if (!newConnection){
            return;
        }
        else{
            //Inscrever num canal
            newConnection.invoke("Subscribe", `${props.symbol}`, `${chartInterval}`);


            // Receber mensagens do hub
            newConnection.on("CandleClosed", (message: string) => {
                console.log("message signaR", message)
            const msg: BinanceWsMessage = JSON.parse(message);
                    const k = msg.k;

                    // Update chart with latest candle data
                    candleSeries.update({
                        time: (k.t / 1000) as UTCTimestamp, // Convert ms to seconds!
                        open: parseFloat(k.o),
                        high: parseFloat(k.h),
                        low: parseFloat(k.l),
                        close: parseFloat(k.c),
                    });

                    chart.timeScale().fitContent();
                    chart.timeScale().scrollToPosition(5, true);
            });
        }
        }

        // Load historical data
        fetchHistory();
        connectWebSocket();

        

        return () => {
            destroyed = true;

            //ws?.close();
            connection?.off("ReceiveMessage");
            connection?.invoke("Unsubscribe", `${props.symbol}`, `${chartInterval}`);
            chart.remove();
        };
    }, [props.symbol, chartInterval]);

    { /*
    useEffect(() => {
        if (!connection) return;
    
        // Receber mensagens do hub
        connection.on("CandleClosed", (message: string) => {
        const msg: BinanceWsMessage = JSON.parse(message.data);
                const k = msg.k;

                // Update chart with latest candle data
                candleSeries.update({
                    time: (k.t / 1000) as UTCTimestamp, // Convert ms to seconds!
                    open: parseFloat(k.o),
                    high: parseFloat(k.h),
                    low: parseFloat(k.l),
                    close: parseFloat(k.c),
                });

                chart.timeScale().fitContent();
                chart.timeScale().scrollToPosition(5, true);
        });
    
        // Cleanup quando desmontar
        return () => {
          connection.off("ReceiveMessage");
        };
      }, [connection]);
*/ }

    return (
        <div 
            style={{
                position: "relative",
                width: "100%",
                height: "500px",
        }}>
            <Legend 
                price={legendData.price}
                symbol={props.symbol}
            />
            <div
                ref={containerRef}
                id={"chart"}
            >
            </div>
            <div id="buttons-container">
                {
                    props.intervals.map(intvl => {
                        return (
                            <button 
                            key={intvl}
                                onClick={(e) => setChartInterval(intvl as keyof typeof intervalColors)}
                            >{intvl}</button>
                        )
                    })
                }
            </div>
        </div>
    );
}

export { LightChart };