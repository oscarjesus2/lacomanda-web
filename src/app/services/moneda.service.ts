
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { Moneda } from '../models/moneda.models';

@Injectable({
  providedIn: 'root'
})
export class MonedaService {
    private basePath = environment.apiUrl + '/moneda';

  constructor(private http: HttpClient) {}

  getMoneda(): Observable<ApiResponse<Moneda[]>> {
                return this.http.get<ApiResponse<Moneda[]>>(this.basePath);
  }
}
