import * as signalR from "@microsoft/signalr";
import "../trading/styles.css";
import type { HubConnection } from "@microsoft/signalr";
import { useState, useEffect } from "react";
import { LightChart } from "../../components/charts";
import { CandleStickInterval } from "../../domain/enum/ECandleStickInterval";
import type { ECandleStickInterval } from "../../domain/enum/ECandleStickInterval";

const user = new Date().getTime().toString();

interface ChatProps {
  message: string;
  userName: string;
}

const ChartPage = () => {

  const INTERVAL: ECandleStickInterval = CandleStickInterval.M1;
  const [intervals, setIntervals] = useState<string[]>(["1m","1D","1W","1M","1Y"]);


  return (
    <>
      <LightChart
        interval={INTERVAL}
        intervals={intervals}
      />
    </>
  );
}


const TradingPage = () => {
  const divMessages: HTMLDivElement = document.querySelector("#divMessages")!;

  const [connection, setConnection] = useState<HubConnection>();
  const [chatMessages, setChatMessages] = useState<ChatProps[]>([]);
  const [message, setMessage] = useState<string>("");

  const handleSend = async () => {
    console.log("clicou")

    try {
      await connection!.invoke("SendMessage", user, message);
      setMessage("")
    } catch (err) {
      console.error("Erro ao enviar:", err);
    }
  };

  useEffect(() => {
    // Cria a conexão
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5043/candleStickHub") // ajuste para sua URL real
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
  }, []);

  useEffect(() => {
    if (!connection) return;

    // Receber mensagens do hub
    connection.on("CandleClosed", (message: string) => {

      const conversation: ChatProps = {
        message: message,
        userName: ""
      }

      console.log("conversation", conversation);

      setChatMessages((msgs) => [...msgs, conversation]);

      // const m = document.createElement("div");

      // const author = document.createElement("div");
      // author.className = "message-author";
      // author.textContent = username;

      // const content = document.createElement("div");
      // content.textContent = message;

      // m.append(author, content);

      // divMessages.appendChild(m);
      divMessages.scrollTop = divMessages.scrollHeight;
    });

    // Cleanup quando desmontar
    return () => {
      connection.off("ReceiveMessage");
    };
  }, [connection]);

  return (
    <>
      <div id="divMessages"
        className="messages"
      >
        {chatMessages.map((m, index) => (
          <p key={index}><strong>{m.userName}:</strong> {m.message}</p>
        ))}
      </div>
      <div className="input-zone">
        <label id="lblMessage" className="tbMessage">Message:</label>
        <input id="tbMessage" className="input-zone-input" type="text" onChange={(e) => setMessage(e.target.value)} />
        <button id="btnSend" onClick={() => handleSend()}>Send</button>
      </div>
    </>
  );
}

export { TradingPage, ChartPage };