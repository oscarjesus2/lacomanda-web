import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  private apiUrl = 'http://localhost:3000/print';

  constructor(private http: HttpClient) {}

  imprimirTicket(ByteTicket: any, printerName?: string) {
    const pdfBase64 = ByteTicket;

    this.http.post(this.apiUrl, {
      pdfBase64: pdfBase64,
      printerName: printerName || null,
    }).subscribe(
      response => console.log('Print job sent successfully'),
      error => console.error('Error sending print job:', error)
    );
  }
}
