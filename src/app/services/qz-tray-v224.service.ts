import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as RSVP from 'rsvp';
declare var qz: any;

@Injectable({
  providedIn: 'root'
})
export class QzTrayV224Service {

  private privateKeyPath: string = 'assets/signing/private-key.pem';
  private privateDigitalCertificatePath: string = 'assets/signing/certificate.pem';

  constructor(private http: HttpClient) {
    // Configuración para asegurar que las conexiones sean seguras
    qz.api.setSha256Type(data => {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)).then(hash =>
        Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
      );
    });

    // Asegurarse de que QZ Tray use RSVP para las promesas
    qz.api.setPromiseType(function (promise) {
      return new RSVP.Promise(function (resolve, reject) {
        if (typeof promise === 'function') {
          promise(resolve, reject);
        } else if (promise.then) {
          promise.then(resolve).catch(reject);
        } else {
          reject(new Error("El valor pasado no es una promesa válida"));
        }
      });
    });
  }

  // Función para verificar si el archivo existe
  private async fileExists(path: string): Promise<boolean> {
    try {
      await this.http.get(path, { responseType: 'text' }).toPromise();
      return true;
    } catch (error) {
      console.error(`Archivo no encontrado: ${path}`, error);
      return false;
    }
  }

  // Cargar el contenido de la clave privada si el archivo existe
  private async loadPrivateKey(): Promise<string> {
    const exists = await this.fileExists(this.privateKeyPath);
    if (exists) {
      return this.http.get(this.privateKeyPath, { responseType: 'text' }).toPromise();
    } else {
      throw new Error('La clave privada no se encuentra en el directorio especificado.');
    }
  }

  private async loadDigitalCertificateKey(): Promise<string> {
    const exists = await this.fileExists(this.privateDigitalCertificatePath);
    if (exists) {
      return this.http.get(this.privateDigitalCertificatePath, { responseType: 'text' }).toPromise();
    } else {
      throw new Error('El certificado digital no se encuentra en el directorio especificado.');
    }
  }

  // Función para convertir la clave PEM a ArrayBuffer
  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64Lines = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '').trim();
    const b64 = b64Lines.replace(/\n/g, '');
    const binaryString = atob(b64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async connect(): Promise<void> {
    if (!qz.websocket.isActive()) {
      try {
        const digitalCertificate = await this.loadDigitalCertificateKey(); // Esperar a que se cargue el certificado
        const privateKeyPem = await this.loadPrivateKey(); // Cargar la clave privada

        // Usar el certificado digital desde la cadena de texto
        qz.security.setCertificatePromise((resolve, reject) => {
          resolve(digitalCertificate); // Pasar el certificado cargado
        });

        qz.security.setSignatureAlgorithm("SHA512"); // Since 2.1
        qz.security.setSignaturePromise(async (toSign) => {
          try {
            const privateKeyPem = await this.loadPrivateKey();
            const keyBuffer = this.pemToArrayBuffer(privateKeyPem);
            const privateKey = await crypto.subtle.importKey(
              "pkcs8",
              keyBuffer,
              {
                name: "RSASSA-PKCS1-v1_5",
                hash: { name: "SHA-512" }  // Cambiado a SHA-512
              },
              true,
              ["sign"]
            );

            const signature = await crypto.subtle.sign(
              "RSASSA-PKCS1-v1_5",
              privateKey,
              new TextEncoder().encode(toSign)
            );

            return btoa(String.fromCharCode.apply(null, new Uint8Array(signature)));
          } catch (error) {
            console.error('Error al firmar los datos:', error);
            throw new Error('Error en la firma de datos');
          }
        });

        await qz.websocket.connect(); // Conectar con QZ Tray

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

  async printPDF(ByteTicket: any, printerName: string): Promise<boolean> {
    try {
      if (this.isBase64(ByteTicket)) {

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
        } else {
          const defaultPrinter = await qz.printers.getDefault();
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
        return true;

      } else {
        console.error("Error: ByteTicket no está codificado correctamente en base64");
      }

    } catch (error) {
      console.error('Error al imprimir:', error);
      return false;
    }
  }

  private isBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch (err) {
      return false;
    }
  }

  async isPrinterAvailable(printerName: string): Promise<boolean> {
    const printers = await qz.printers.find();
    return printers.includes(printerName);
  }

  async isQzTrayRunning(): Promise<boolean> {
    try {

      // Primero intenta conectar si no está activo
      await this.connect();
      if (!qz.websocket.isActive()) { // Llama a la función que maneja la conexión con QZ Tray
        await qz.websocket.disconnect();
      }

      return true;
    } catch (error) {
      console.error('QZ Tray no está corriendo:', error);
      return false;
    }
  }
}
