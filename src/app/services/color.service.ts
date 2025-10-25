
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { Color } from '../models/color.models';

@Injectable({
  providedIn: 'root'
})
export class ColorService {
    private basePath = environment.apiUrl + '/color';

  constructor(private http: HttpClient) {}

  getColores(): Observable<ApiResponse<Color[]>> {
          return this.http.get<ApiResponse<Color[]>>(this.basePath);
  }

  crear(c: Color): Observable<ApiResponse<Color>> {
    return this.http.post<ApiResponse<Color>>(this.basePath, c);
  }
  actualizar(c: Color): Observable<ApiResponse<Color>> {
    return this.http.put<ApiResponse<Color>>(`${this.basePath}/${c.IdColor}`, c);
  }
  eliminar(id: number): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.basePath}/${id}`);
  }
}
