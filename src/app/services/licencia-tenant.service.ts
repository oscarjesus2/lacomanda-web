import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { LicenciaTenant } from '../models/licencia-tenant.models';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class LicenciaTenantService {
  private readonly basePath = `${environment.apiUrl}/licencia/me`;

  constructor(private readonly http: HttpClient) {}

  obtener(): Observable<ApiResponse<LicenciaTenant | null>> {
    return this.http.get<ApiResponse<LicenciaTenant | null>>(this.basePath);
  }
}
