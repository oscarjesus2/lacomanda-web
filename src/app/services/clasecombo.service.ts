
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interfaces/apirResponse.interface';
import { SeccionMenu } from '../models/seccionMenu.models';

@Injectable({
  providedIn: 'root'
})
export class SeccionMenuService {
  private basePath = environment.apiUrl + '/seccionmenu';

  constructor(private http: HttpClient) {}

  getSeccionMenu(): Observable<ApiResponse<SeccionMenu[]>> {
            return this.http.get<ApiResponse<SeccionMenu[]>>(this.basePath);
  }
}
