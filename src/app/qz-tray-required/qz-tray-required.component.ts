import { Component } from '@angular/core';

@Component({
  selector: 'app-qz-tray-required',
  templateUrl: './qz-tray-required.component.html',
  styleUrls: ['./qz-tray-required.component.css']
})
export class QzTrayRequiredComponent {
  readonly qzTrayDownloadUrl = 'https://qz.io/download/';
  readonly certificateUrl = 'assets/signing/certificate.pem';
  readonly manualUrl = 'assets/manuales/manual-instalacion-configuracion-qz-tray.pdf';
}
