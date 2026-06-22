interface LegendProps{
    symbol: string;
    price: string;
}

const Legend : React.FC<LegendProps> = ({symbol, price}) =>{

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
            {symbol}
            {" "}
            <strong>{price}</strong>
        </div>
    );
 }

 export { Legend }