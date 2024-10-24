export class EntradaDet {
    IdEntrada: number;            // BIGINT(20)
    IdArticulo: number;           // BIGINT(20)
    Cantidad: number;             // DECIMAL(13,3)
    Precio: number;               // DECIMAL(13,3)
    IdUnidad: string;             // VARCHAR(3)
    ValorCompra: number;          // DECIMAL(13,2)
    PorcIsc: number;              // DECIMAL(3,1)
    Isc: number;                  // DECIMAL(13,2)
    PorcIgv: number;              // DECIMAL(3,1)
    Igv: number;                  // DECIMAL(13,2)
    Subtotal: number;             // DECIMAL(13,2)
    IdImpuesto?: number;          // INT(11) - opcional
    IdImpuesto2?: number;         // INT(11) - opcional
    IdArea?: string;              // VARCHAR(2) - opcional
}
