import { useEffect, useRef, useState } from "react";
import "./styles.css";
import { Legend } from "./legend";
import { useSignalR } from "../hooks/useSignalR";
import type { KlineProps } from "../../domain/model/interface";
import { useChart } from "../hooks/useChart";
import { useHistory } from "../hooks/useHistory";
import { HubConnectionState } from "@microsoft/signalr";

const REST_URL_BASE = `http://localhost:5043/Candle/symbol`;
const WS_URL_BASE = `http://localhost:5043/candleStickHub`;

// Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
type BinanceKline = [number, string, string, string, string, string, number, ...unknown[]];


const LightChart: React.FC<KlineProps> = (props: KlineProps) => {
    const [symbols, setSymbols] = useState<string[]>(["ETHBTC", "LTCBTC", "BNBBTC", "NEOBTC", "QTUMETH", "EOSETH", "SNTETH", "BNTETH", "BCCBTC", "GASBTC", "BNBETH", "BTCUSDT"]);
    const [chartInterval, setChartInterval] = useState(props.interval);
    const [chartSymbol, setChartSymbol] = useState("ETHBTC");

    const { historyData } = useHistory(REST_URL_BASE, chartSymbol, chartInterval);
    const { containerRef, ReceiveCandles, legendData } = useChart(historyData, chartSymbol, chartInterval);

    const { connectionState, on, send, changeSubscribeFromGroup,subscribeToGroup, unsubscribeFromGroup } = useSignalR(WS_URL_BASE);
    const subscriptionSymbolRef = useRef<string | null>(null);
    const subscriptionIntervalRef = useRef<string | null>(null);


    useEffect(() => {
        on("candleclosed", (message: string) => {
            console.log("candleclosed",message)
            ReceiveCandles(message);
        });
    }, [on]);

    useEffect(() => {
        const changeSubscription = async () => {
            console.log(
                "Effect",
                connectionState,
                chartSymbol,
                chartInterval
            );

            if (connectionState !== HubConnectionState.Connected) {
                console.log("Ainda não conectado");
                return;
            }

            console.log("Vai fazer subscribe");

            if (
                subscriptionSymbolRef.current === chartSymbol &&
                subscriptionIntervalRef.current === chartInterval
            ) {
                return;
            }

            /*if (subscriptionSymbolRef.current) {
                await unsubscribeFromGroup(
                    subscriptionSymbolRef.current,
                    subscriptionIntervalRef.current
                );
            }

            await subscribeToGroup(chartSymbol, chartInterval);
            */
           await changeSubscribeFromGroup(chartSymbol, chartInterval);

            subscriptionSymbolRef.current = chartSymbol;
            subscriptionIntervalRef.current = chartInterval;
        };

        changeSubscription();
    }, [
        chartSymbol,
        chartInterval,
        connectionState,
        subscribeToGroup,
        unsubscribeFromGroup,
    ]);

    useEffect(() => {
        return () => {
            if (
                subscriptionSymbolRef.current &&
                subscriptionIntervalRef.current
            ) {
                unsubscribeFromGroup(
                    subscriptionSymbolRef.current,
                    subscriptionIntervalRef.current
                );
            }
        };
    }, [unsubscribeFromGroup]);

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "500px",
            }}>
            <Legend
                price={legendData.price}
                defaultSymbol={chartSymbol}
                symbols={symbols}
                onChange={(e) => {
                    setChartSymbol(e);
                }}
            />
            <div
                ref={containerRef}
                id={"chart"}
            >
            </div>
            <div id="buttons-container">
                {
                    props.intervals.map((m: string) => {
                        return (
                            <button
                                key={m}
                                onClick={(e) => setChartInterval(m as keyof typeof intervalColors)}
                            >{m}</button>
                        )
                    })
                }
            </div>
        </div>
    );
}

export { LightChart };