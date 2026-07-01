import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import type { CandleStickBinance } from "../../domain/model/interface";
import { useEffect, useState } from "react";


export function useHistory(baseUrl : string, chartSymbol: string, chartInterval: string){
    const [historyData, setHistoryData] = useState<CandlestickData[]>([]);
    
    const fetchHistory = async (abortSignal: AbortSignal): Promise<void> => {
        try{

        
        const response = await fetch(`${baseUrl}?symbol=${chartSymbol}&interval=${chartInterval}`,
        {
            signal: abortSignal,
        });

        const klines: CandleStickBinance[] = await response.json();

        const history = klines.map((k) => {

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
    }catch(err){
        if (err instanceof DOMException && err.name === "AbortError") {
            return; // cancelamento esperado
        }

        console.error(err);
    }
    }

    useEffect(() => {
        const controller = new AbortController();
        fetchHistory(controller.signal);

        return () =>{//Clean up para quando o componente é desmontado ou removido
            controller.abort();
        }

    }, [baseUrl, chartSymbol, chartInterval]);

    return { historyData }
}