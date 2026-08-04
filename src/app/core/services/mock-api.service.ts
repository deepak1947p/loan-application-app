import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MockApiService {
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  constructor(private readonly http: HttpClient) {}

  get<T>(resource: string, params?: Record<string, string>): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${resource}`, {
      params: params ? new HttpParams({ fromObject: params }) : undefined,
    });
  }
  getResponse<T>(resource: string, params: HttpParams): Observable<HttpResponse<T>> {
    return this.http.get<T>(`${this.baseUrl}/${resource}`, { params, observe: 'response' });
  }
  post<T>(resource: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${resource}`, body);
  }
  patch<T>(resource: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}/${resource}`, body);
  }
}
