import { Injectable } from '@angular/core';
import * as RSVP from 'rsvp';
declare var qz: any;

@Injectable({
  providedIn: 'root'
})
export class QzTrayService {

  constructor() {
    // Configuración para asegurar que las conexiones sean seguras
    qz.api.setSha256Type(data => {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)).then(hash => 
        Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
      );
    });

    // Asegurarse de que QZ Tray use RSVP para las promesas
    qz.api.setPromiseType((promise) => {
      return new RSVP.Promise(promise);
    });
  }
  
  async connect(): Promise<void> {
    if (!qz.websocket.isActive()) {
      try {
        await qz.websocket.connect();
      } catch (error) {
        console.error('Error al conectar con QZ Tray:', error);
      }
    }
  }

  async disconnect(): Promise<void> {
    if (qz.websocket.isActive()) {
      try {
        await qz.websocket.disconnect();
      } catch (error) {
        console.error('Error al desconectar de QZ Tray:', error);
      }
    }
  }

  async isQzTrayRunning(): Promise<boolean> {
    try {
      await this.connect();
      await qz.websocket.disconnect();
      return true;
    } catch (error) {
      console.error('QZ Tray no está corriendo:', error);
      return false;
    }
  }

  async isPrinterAvailable(printerName: string): Promise<boolean> {
    const printers = await qz.printers.find(); // Obtiene la lista de impresoras disponibles
    return printers.includes(printerName);
  }

  // async listPrinters(): Promise<void> {
  //   try {
  //     await this.connect();
  //     const printers = await qz.printers.find();
  //     console.log('Impresoras disponibles:', printers);
  //   } catch (error) {
  //     console.error('Error al listar impresoras:', error);
  //   }
  // }

  async printPDF(ByteTicket: any, printerName: string): Promise<void> {
    try {
      const byteCharacters = atob(ByteTicket);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
  
      await this.connect();

      let config;
      const isAvailable = await this.isPrinterAvailable(printerName);
      if (isAvailable) {
        config = qz.configs.create(printerName);
        console.log(`Imprimiendo en la impresora ${printerName}`);
      }else{
        const defaultPrinter = await qz.printers.getDefault(); // Obtener la impresora predeterminada
        config = qz.configs.create(defaultPrinter);
        console.log('Imprimiendo en la impresora predeterminada');
      }
      const data = [{
        type: 'pdf',
        format: 'base64',
        data: await blob.arrayBuffer().then(buffer => btoa(String.fromCharCode.apply(null, new Uint8Array(buffer))))
      }];
  
      await qz.print(config, data);
      console.log('Impresión exitosa');
    } catch (error) {
      console.error('Error al imprimir:', error);
    }
  }
  
}
