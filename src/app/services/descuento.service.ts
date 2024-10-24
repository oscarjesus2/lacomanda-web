
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { Descuento } from '../models/descuento.models';

@Injectable({
  providedIn: 'root'
})
export class DescuentoService {
    private basePath = environment.apiUrl + '/Descuento/';

  constructor(private http: HttpClient) {}

  getDescuentos(): Observable<ApiResponse<Descuento[]>> {
    return this.http.get<ApiResponse<Descuento[]>>(this.basePath);
  }
}
