import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API, Addon, CheckIn, MeStats, Pass, Press, Review, StudioToday } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  presses() {
    return this.http.get<Press[]>(`${API}/presses`);
  }
  press(id: string) {
    return this.http.get<Press>(`${API}/presses/${id}`);
  }
  addons() {
    return this.http.get<Addon[]>(`${API}/addons`);
  }
  studioDays() {
    return this.http.get<{ date: string; open: boolean; capacity: number; id: string }[]>(
      `${API}/studio-days`,
    );
  }
  today() {
    return this.http.get<StudioToday>(`${API}/studio-days/today`);
  }
  createPass(addonIds: string[]) {
    return this.http.post<Pass>(`${API}/passes`, { addonIds });
  }
  passes() {
    return this.http.get<Pass[]>(`${API}/passes`);
  }
  pass(id: string) {
    return this.http.get<Pass>(`${API}/passes/${id}`);
  }
  passByCode(code: string) {
    return this.http.get<Pass>(`${API}/passes/by-code/${code}`);
  }
  cancel(id: string) {
    return this.http.post<Pass>(`${API}/passes/${id}/cancel`, {});
  }
  stamp(passId?: string) {
    return this.http.post<CheckIn>(`${API}/check-ins`, passId ? { passId } : {});
  }
  checkIns() {
    return this.http.get<CheckIn[]>(`${API}/check-ins`);
  }
  reviews(pressId?: string) {
    return this.http.get<Review[]>(`${API}/reviews`, pressId ? { params: { pressId } } : {});
  }
  review(body: { pressId: string; rating: number; body: string }) {
    return this.http.post<Review>(`${API}/reviews`, body);
  }
  stats() {
    return this.http.get<MeStats>(`${API}/stats/me`);
  }
  staffToday() {
    return this.http.get<{ studioDay: StudioToday; checkIns: CheckIn[] }>(`${API}/staff/today`);
  }
  staffCheckIn(codeOrUrl: string) {
    return this.http.post<CheckIn>(`${API}/staff/check-in`, { codeOrUrl });
  }
  patchDay(id: string, body: { open?: boolean; capacity?: number }) {
    return this.http.patch(`${API}/staff/studio-days/${id}`, body);
  }
}
