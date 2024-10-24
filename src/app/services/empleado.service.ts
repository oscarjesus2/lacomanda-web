import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Empleado  } from '../models/empleado.models';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { EmpleadoTaxistaDTO } from '../interfaces/empladoTaxistaDTO.interface';

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
  private basePath = environment.apiUrl + '/empleado';

  constructor(private http: HttpClient) {}

  getAllEmpleados(): Observable<ApiResponse<Empleado[]>> {
    return this.http.get<ApiResponse<Empleado[]>>(this.basePath );
  }

  getEmpleado(id: string): Observable<Empleado> {
    return this.http.get<Empleado>(`${this.basePath }/${id}`);
  }

  createEmpleado(empleado: Empleado): Observable<any> {
    return this.http.post<Empleado>(this.basePath , empleado);
  }

  updateEmpleado(empleado: Empleado): Observable<any> {
    return this.http.put<Empleado>(`${this.basePath }/${empleado.IdEmpleado}`, empleado);
  }
  
  deleteEmpleado(id: string): Observable<void> {
    return this.http.delete<void>(`${this.basePath }/${id}`);
  }
}
