import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from 'src/app/interfaces/apirResponse.interface';
import {
  AeatConfiguration,
  AeatIntegrityResult,
  SaveAeatConfiguration,
  SendAeatRequirement,
} from 'src/app/models/aeat-configuration.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AeatConfigurationService {
  private readonly basePath = `${environment.apiUrl}/configuracion/aeat`;

  constructor(private readonly http: HttpClient) {}

  get(): Observable<ApiResponse<AeatConfiguration>> {
    return this.http.get<ApiResponse<AeatConfiguration>>(this.basePath);
  }

  save(
    configuration: SaveAeatConfiguration,
  ): Observable<ApiResponse<AeatConfiguration>> {
    const formData = new FormData();
    formData.append('Nif', configuration.Nif);
    formData.append('ModoFiscal', configuration.ModoFiscal.toString());
    formData.append('NumeroInstalacion', configuration.NumeroInstalacion);
    formData.append('ClaveCertificado', configuration.ClaveCertificado);
    formData.append(
      'Certificado',
      configuration.Certificado,
      configuration.Certificado.name,
    );
    return this.http.put<ApiResponse<AeatConfiguration>>(
      this.basePath,
      formData,
    );
  }

  sendRequirement(
    request: SendAeatRequirement,
  ): Observable<ApiResponse<number>> {
    return this.http.post<ApiResponse<number>>(
      `${this.basePath}/requerimiento`,
      request,
    );
  }

  verifyIntegrity(): Observable<ApiResponse<AeatIntegrityResult>> {
    return this.http.post<ApiResponse<AeatIntegrityResult>>(
      `${this.basePath}/integridad/verificar`,
      {},
    );
  }

  exportArchive(from: string, to: string): Observable<Blob> {
    return this.http.get(`${this.basePath}/exportacion`, {
      params: { desde: from, hasta: to },
      responseType: 'blob',
    });
  }
}
