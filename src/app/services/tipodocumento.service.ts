
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoDocumentoPais } from '../models/tipodocumentopais.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
  providedIn: 'root'
})
export class TipoDocumentoService {
    private basePath = environment.apiUrl + '/tipodocumentopais/';

  constructor(private http: HttpClient) {}

  getTipoDocumento(): Observable<ApiResponse<TipoDocumentoPais[]>> {
    return this.http.get<ApiResponse<TipoDocumentoPais[]>>(this.basePath);
  }
}
