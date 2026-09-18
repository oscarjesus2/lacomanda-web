
export interface AnularProductoYComplementoDTO {
     IdEspacio: number;
     NroCuenta: number;
     MotivoAnula: string;
     IdPedido: number;
     IdProducto: number;
     Item: number;
     Ip: string;
}

export interface AnularPedidoEspacioRequest {
     IdEspacio: number;
     MotivoAnula: string;
     Ip: string | null;
}
