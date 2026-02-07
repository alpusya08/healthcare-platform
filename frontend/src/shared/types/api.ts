export type ErrorResponse = {
  status: number;
  message: string;
  timestamp: string;
};

export type UserInfo = {
  id: string;
  email: string;
  fullName: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserInfo;
};

export type RegisterResponse = {
  userId: string;
  email: string;
  role: string;
};
