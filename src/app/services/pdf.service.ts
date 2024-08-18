import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  private basePathPrint = environment.apiPrintUrl + '/print';

  constructor(private http: HttpClient) {}

  imprimirTicket(ByteTicket: any, printerName?: string) {
    const pdfBase64 = ByteTicket;
  
    this.http.post(this.basePathPrint, {
      pdfBase64: pdfBase64,
      printerName: printerName || null,
    }, { responseType: 'text' }).subscribe(
      response => {
        console.log('Print job sent successfully');
        console.log('Response from server:', response);
      },
      error => {
        console.error('Error sending print job:', error);
        if (error.error instanceof ErrorEvent) {
          console.error('Client-side error:', error.error.message);
        } else {
          console.error(`Server returned code: ${error.status}, body was: ${error.error}`);
        }
      }
    );
  }
  
}
