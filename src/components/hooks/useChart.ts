import {
  AreaSeries,
  BaselineSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BinanceWsMessage } from "../../domain/model/interface";

const intervalColors = {
  "1m": "rgb(124, 157, 249)",
  "1D": "#2962FF",
  "1W": "rgb(225, 87, 90)",
  "1M": "rgb(242, 142, 44)",
  "1Y": "rgb(164, 89, 209)",
};

const seriesData = new Map([
  ["1m", { time: "2026-06-21", value: 24.89 }],
  ["1D", { time: "2026-06-21", value: 24.89 }],
  ["1W", { time: "2026-06-21", value: 24.89 }],
  ["1M", { time: "2026-06-21", value: 24.89 }],
  ["1Y", { time: "2026-06-21", value: 24.89 }],
]);

export function useChart(
  historyData: CandlestickData[],
  chartSymbol: string,
  chartInterval: string,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [legendData, setLegendData] = useState({
    symbol: "",
    price: "0.00",
  });


  
  const handleChartInterval = (interval: keyof typeof intervalColors) => {
    const colorInterval = intervalColors[interval];

    // lineSeries.applyOptions({
    //     color: colorInterval,
    // });

    const localInterval = seriesData.get(interval);

    //lineSeries.setData([localInterval!]);
    chartRef.current!.timeScale().fitContent();
  };

  //handleChartInterval(chartInterval as keyof typeof intervalColors);

  

  const calculateMovingAverageSeriesData = (
    candleData: CandlestickData[],
    maLength: number,
  ) => {
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
  };

  const ReceiveCandles = useCallback((message: string) =>{
    console.log("message signalR", message);
    const msg: BinanceWsMessage = JSON.parse(message);
    const k = msg.k;

    // Update chart with latest candle data
    candleSeriesRef.current!.update({
      time: (k.t / 1000) as UTCTimestamp, // Convert ms to seconds!
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
    });

    chartRef.current!.timeScale().fitContent();
    chartRef.current!.timeScale().scrollToPosition(5, true);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

   // ============================================
   // 1. CREATE THE CHART
   // ============================================
  const chart = createChart(containerRef.current!, {
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: "white" },
      textColor: "#d1d4dc",
      panes: {
        separatorColor: "#f22c3d",
        separatorHoverColor: "rgba(255, 0, 0, 0.1)",
        // setting this to false will disable the resize of the panes by the user
        enableResize: false,
      },
    },
    grid: {
      vertLines: { color: "#1f2943" },
      horzLines: { color: "#1f2943" },
    },
    crosshair: {
      mode: 0, // Normal mode - no snapping to prices
      vertLine: { color: "#758696", labelBackgroundColor: "#4c525e" },
      horzLine: { color: "#758696", labelBackgroundColor: "#4c525e" },
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 10,
    },
  });

  chartRef.current = chart;

  // ============================================
  // 4. ADD CANDLESTICK SERIES
  // ============================================
  const candleSeries = chart.addSeries(
    CandlestickSeries,
    {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    },
    1,
  );

  candleSeriesRef.current = candleSeries;

  const volumeSeries = chart.addSeries(HistogramSeries, {
    color: "#26a69a",
    priceFormat: {
      type: "volume",
    },
    priceScaleId: "", // set as an overlay by setting a blank priceScaleId
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
  const areaSeries = chart.addSeries(AreaSeries, {
    lineColor: "#2962FF",
    topColor: "#2962FF",
    bottomColor: "rgba(41, 98, 255, 0.28)",
  });

  //===================
  // 6. ADD BASELINE CHART
  //===================
  const baseLineSeries = chart.addSeries(BaselineSeries, {
    baseValue: { type: "price", price: 64200 },
    topLineColor: "rgba( 38, 166, 154, 1)",
    topFillColor1: "rgba( 38, 166, 154, 0.28)",
    topFillColor2: "rgba( 38, 166, 154, 0.05)",
    bottomLineColor: "rgba( 239, 83, 80, 1)",
    bottomFillColor1: "rgba( 239, 83, 80, 0.05)",
    bottomFillColor2: "rgba( 239, 83, 80, 0.28)",
  });

  const inverseBaseLineSeries = chart.addSeries(BaselineSeries, {
    baseValue: { type: "price", price: 64200 },
    topLineColor: "rgba( 38, 166, 154, 1)",
    topFillColor1: "rgba( 38, 166, 154, 0.28)",
    topFillColor2: "rgba( 38, 166, 154, 0.05)",
    bottomLineColor: "rgba( 239, 83, 80, 1)",
    bottomFillColor1: "rgba( 239, 83, 80, 0.05)",
    bottomFillColor2: "rgba( 239, 83, 80, 0.28)",
  });

  const maSeries = chart.addSeries(LineSeries, {
    color: "#2962FF",
    lineWidth: 1,
  });

  //const lineSeries = chart.addSeries(LineSeries, { color: intervalColors[props.interval as keyof typeof intervalColors] });

  //===================
  // 7. GET PRICE ON THE CURSOR
  //==================
  chart.subscribeCrosshairMove((param) => {
    let priceFormatted = "";
    if (param.time) {
      const data: any = param.seriesData.get(candleSeries);
      const priceFormatted = data?.close?.toFixed(2);
      setLegendData({
        price: priceFormatted,
        symbol: chartSymbol,
      });
    }
  });

    return () => {
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (historyData.length === 0) return;

    candleSeriesRef.current!.setData(historyData);
    setLegendData({
      symbol: chartSymbol,
      price: historyData.at(-1)!.close.toFixed(2),
    });
  }, [historyData, chartSymbol]);

  return { containerRef, ReceiveCandles, legendData };
}
