
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoDocumento } from '../models/tipodocumento.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TipoDocumentoService {
    private basePath = environment.apiUrl + '/tipodocumento/';

  constructor(private http: HttpClient) {}

  getTipoDocumento(): Observable<TipoDocumento[]> {
    return this.http.get<[TipoDocumento]>(this.basePath + 'listar');
}
}
