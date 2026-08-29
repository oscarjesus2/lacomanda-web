import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import {
  SaveSunatConfiguration,
  SunatConfiguration,
} from 'src/app/models/sunat-configuration.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class SunatConfigurationService {
  private readonly basePath = `${environment.apiUrl}/configuracion/sunat`;

  constructor(private readonly http: HttpClient) {}

  get(): Observable<ApiResponse<SunatConfiguration>> {
    return this.http.get<ApiResponse<SunatConfiguration>>(this.basePath);
  }

  save(
    configuration: SaveSunatConfiguration,
  ): Observable<ApiResponse<SunatConfiguration>> {
    const formData = new FormData();
    formData.append('Ubigeo', configuration.Ubigeo);
    formData.append('UsuarioSol', configuration.UsuarioSol);
    formData.append('ClaveSol', configuration.ClaveSol);
    formData.append('ClaveCertificado', configuration.ClaveCertificado);
    formData.append(
      'Certificado',
      configuration.Certificado,
      configuration.Certificado.name,
    );
    return this.http.put<ApiResponse<SunatConfiguration>>(
      this.basePath,
      formData,
    );
  }
}
