import { useState, type ChangeEvent } from "react";

interface LegendProps{
    defaultSymbol: string;
    symbols: string[];
    price: string;
    onChange: (symbol: string) => void;
}

const Legend : React.FC<LegendProps> = ({defaultSymbol, symbols, price, onChange}) =>{

    const [selectedValue, setSelectedValue] = useState<number>(symbols.findIndex(f => f == defaultSymbol));

  // Tipando o evento corretamente
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const index : number = Number(event.target.value);
    const newSymbol : string = symbols[index];
    setSelectedValue(index);
    console.log("Click change", newSymbol)
    onChange(newSymbol);
  };

    return(
        <div
            style={{
                position: "absolute",
                left: 12,
                top: 12,
                zIndex: 10,
                color: "black",
            }}
        >
             <select value={selectedValue} onChange={handleChange}>
                {symbols.map(( s, index) => 

                    (<option key={`${s}_${index}`} value={index}>{s}</option>)
                )}
            </select>
            {/* {symbol} */}
            {" "}
            <strong>{price}</strong>
        </div>
    );
 }

 export { Legend }