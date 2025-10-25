import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { TipoDocumentoPais } from '../models/tipodocumentopais.models';

@Injectable({ providedIn: 'root' })
export class TipoDocumentoPaisService {
  private base = environment.apiUrl + '/tipodocumentopais';
  constructor(private http: HttpClient) {}

  GetTiposDocumentos(): Observable<TipoDocumentoPais[]> {
    return this.http.get<ApiResponse<TipoDocumentoPais[]>>(this.base)
      .pipe(map(r => r.Data));
  }
}