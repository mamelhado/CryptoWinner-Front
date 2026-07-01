
import { useEffect, useState, useRef, useCallback } from "react";
import * as signalR from "@microsoft/signalr";

export function useSignalR(hubUrl : string, options = {}) {
  const [connectionState, setConnectionState] = useState<signalR.HubConnectionState>(signalR.HubConnectionState.Disconnected);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const on = useCallback((eventName :  string, callback : any) => {
    connectionRef.current?.on(eventName, callback);
  }, []);

  const send = useCallback(async (methodName :  string, ...args : any) => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      await connectionRef.current.send(methodName, ...args);
    } else {
      console.warn("⚠️ Não é possível enviar, conexão não está ativa.");
    }
  }, []);

  const invoke = useCallback(async (methodName :  string, param1: string, param2:string) => {
    console.log("invoke", methodName, param1, param2);

    console.log("Estado:", connectionRef.current?.state);

    if (connectionRef.current?.state !== signalR.HubConnectionState.Connected) {
        console.log("Não conectado");
        return;
    }

    try {
        const r = await connectionRef.current.invoke(methodName,  param1, param2);
        console.log("invoke OK");
        return r;
    } catch (e) {
        console.error("invoke erro", e);
    }
  }, []);

  const subscribeToGroup = useCallback(async (chartSymbol: string, chartInterval: string) => {
    //if (!groupName) return;

    console.log("Entrou subscribeToGroup");

    console.log("Estado:", connectionRef.current?.state);

    await invoke("Subscribe", chartSymbol, chartInterval);

    console.log("Terminou subscribe");

    //await invoke("Subscribe", `${chartSymbol}`, `${chartInterval}`);
    //console.log(`📌 Inscrito no grupo: ${chartSymbol}_${chartInterval}`);
  }, [invoke]);

  const unsubscribeFromGroup = useCallback(async (chartSymbol: string, chartInterval: string) => {
    //if (!groupName) return;

    if (connectionRef.current?.state !== signalR.HubConnectionState.Connected)
        return;

    await connectionRef.current.invoke("Unsubscribe", chartSymbol, chartInterval);

    console.log("Saiu");
  }, [invoke]);

  const changeSubscribeFromGroup = useCallback(async (chartSymbol: string, chartInterval: string) => {
   // if (!groupName) return;
    await invoke("ChangeSubscription", chartSymbol, chartInterval);
    console.log(`🚪 Saiu do grupo: ${chartSymbol}_${chartInterval}`);
  }, [invoke]);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, options)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connectionRef.current = connection;

    connection.onreconnecting(() => {
        console.log("Reconectando...");
        setConnectionState(connection.state);
    });

    connection.onreconnected(() => {
        console.log("Reconectado");
        setConnectionState(connection.state);
    });

    connection.onclose(() => {
        console.log("Fechou");
        setConnectionState(signalR.HubConnectionState.Disconnected);
    });

    const startConnection = async () => {
      try {
          await connection.start();
          
          connectionRef.current = connection;
          
          setConnectionState(connection.state);
          
          console.log("✅ Conectado ao SignalR Hub");
    
      } catch (err) {
        console.error("❌ Erro ao conectar:", err);
        setTimeout(startConnection, 5000); // tenta reconectar
      }
    };

    startConnection();

    return () => {
      connection.stop();
    };
  }, [hubUrl]);

  return { 
    connectionState, 
    on, 
    send, 
    subscribeToGroup, 
    unsubscribeFromGroup,
    changeSubscribeFromGroup
  };
}