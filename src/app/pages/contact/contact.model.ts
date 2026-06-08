export interface ContactRequest {
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  message: string;
}

export interface ContactResponse {
  id?: string;
  message?: string;
  status?: string;
  createdAt?: string;
}
