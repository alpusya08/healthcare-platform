import { apiClient } from "@/shared/api/axios";

export interface ChatMessage {
  id: string;
  appointmentId: string;
  senderId: string;
  senderRole: "PATIENT" | "DOCTOR";
  senderName: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export const chatApi = {
  getMessages: (appointmentId: string) =>
    apiClient.get<ChatMessage[]>(`/chat/${appointmentId}`).then((r) => r.data),

  sendMessage: (appointmentId: string, content: string) =>
    apiClient
      .post<ChatMessage>(`/chat/${appointmentId}`, { content })
      .then((r) => r.data),

  markRead: (appointmentId: string) =>
    apiClient.patch(`/chat/${appointmentId}/read`).then(() => undefined),

  getUnreadCounts: () =>
    apiClient.get<Record<string, number>>("/chat/unread").then((r) => r.data),
};
