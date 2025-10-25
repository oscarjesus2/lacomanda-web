
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { ImpuestoPais } from '../models/impuestopais.models';

@Injectable({
  providedIn: 'root'
})
export class ImpuestoPaisService {
    private basePath = environment.apiUrl + '/impuestopais';

  constructor(private http: HttpClient) {}

  getImpuestoPais(): Observable<ApiResponse<ImpuestoPais[]>> {
                  return this.http.get<ApiResponse<ImpuestoPais[]>>(this.basePath);
    }
}
