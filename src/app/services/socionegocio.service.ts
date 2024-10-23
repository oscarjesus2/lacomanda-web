
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { SocioNegocio } from '../models/socionegocio.models';
import { ApiResponse } from '../interfaces/apirResponse.interface';

@Injectable({
  providedIn: 'root'
})
export class SocioNegocioService {
    private basePath = environment.apiUrl + '/SocioNegocio/';

  constructor(private http: HttpClient) {}

  getSocioNegocios(): Observable<ApiResponse<SocioNegocio[]>> {
    return this.http.get<ApiResponse<SocioNegocio[]>>(this.basePath);
  }
}
