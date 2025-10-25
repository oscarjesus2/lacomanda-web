import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Cliente } from '../models/cliente.models';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private basePath = environment.apiUrl + '/cliente';

  constructor(private http: HttpClient) { }

  ServicioBuscarCliente(numeroRuc: string, idTipoEntidad: string): Observable<Cliente[]> {
    return this.http.get<[Cliente]>(this.basePath + '/servicio/' + numeroRuc + '/' + idTipoEntidad);
  }
  getClientes(): Observable<any> {
    return this.http.get<any>(this.basePath);
  }

  getCliente(id: string): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.basePath}/${id}`);
  }

  createCliente(cliente: Cliente): Observable<any> {
    return this.http.post<Cliente>(this.basePath, cliente);
  }

  updateCliente(cliente: Cliente): Observable<any> {
    return this.http.put<Cliente>(`${this.basePath}/${cliente.IdCliente}`, cliente);
  }

  deleteCliente(id: string): Observable<void> {
    return this.http.delete<void>(`${this.basePath}/${id}`);
  }
}
