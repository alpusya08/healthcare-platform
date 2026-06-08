import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Send, Phone, Calendar, Clock,
  Stethoscope, MessageCircle, Video,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { useAuthStore } from "@/features/auth/model/authStore";
import { chatApi, type ChatMessage } from "@/features/chat/api/chatApi";
import { appointmentsApi } from "@/features/appointments/api/appointmentsApi";
import { doctorApi } from "@/features/doctor/api/doctorApi";
import type { Appointment } from "@/features/appointments/types";
import type { DoctorAppointment } from "@/features/doctor/api/doctorApi";

/* ─── helpers ─────────────────────────────────────────────────── */

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function fmtMsgTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday)
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* ─── contact card ─────────────────────────────────────────────── */

function PatientContactCard({ appt }: { appt: Appointment }) {
  const initials = appt.doctorName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-4 p-4 bg-card border-b border-border">
      <div className="shrink-0">
        {appt.doctorPhotoUrl ? (
          <img
            src={appt.doctorPhotoUrl}
            alt={appt.doctorName}
            className="w-12 h-12 rounded-2xl object-cover shadow-sm"
          />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-bold text-white text-sm shadow-sm">
            {initials}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{appt.doctorName}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <Stethoscope className="w-3 h-3" />
          {appt.specialization}
        </p>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>{fmtDateTime(appt.startTime)}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          <Clock className="w-3 h-3" />
          <span>
            {fmtTime(appt.startTime)} – {fmtTime(appt.endTime)} ·{" "}
            {appt.type === "ONLINE" ? "Онлайн" : "Офлайн"}
          </span>
        </div>
      </div>
      {appt.type === "ONLINE" && appt.meetingLink && (
        <Button
          size="sm"
          className="rounded-xl h-8 text-xs shrink-0"
          onClick={() => window.open(appt.meetingLink, "_blank", "noopener,noreferrer")}
        >
          <Video className="w-3.5 h-3.5 mr-1.5" />
          Войти
        </Button>
      )}
    </div>
  );
}

function DoctorContactCard({ appt }: { appt: DoctorAppointment }) {
  const initials = appt.patientName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-4 p-4 bg-card border-b border-border">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center font-bold text-white text-sm shadow-sm shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{appt.patientName}</p>
        {appt.patientPhone && (
          <a
            href={`tel:${appt.patientPhone}`}
            className="text-xs text-primary flex items-center gap-1 mt-0.5 hover:underline"
          >
            <Phone className="w-3 h-3" />
            {appt.patientPhone}
          </a>
        )}
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          <span>{fmtDateTime(appt.startTime)}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          <Clock className="w-3 h-3" />
          <span>
            {fmtTime(appt.startTime)} – {fmtTime(appt.endTime)} ·{" "}
            {appt.type === "ONLINE" ? "Онлайн" : "Офлайн"}
          </span>
        </div>
      </div>
      {appt.type === "ONLINE" && appt.meetingLink && (
        <Button
          size="sm"
          className="rounded-xl h-8 text-xs shrink-0"
          onClick={() => window.open(appt.meetingLink, "_blank", "noopener,noreferrer")}
        >
          <Video className="w-3.5 h-3.5 mr-1.5" />
          Войти
        </Button>
      )}
    </div>
  );
}

/* ─── message bubble ───────────────────────────────────────────── */

function MessageBubble({ msg, isMine }: { msg: ChatMessage; isMine: boolean }) {
  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[75%] space-y-1", isMine ? "items-end" : "items-start")}>
        {!isMine && (
          <p className="text-xs text-muted-foreground px-1">{msg.senderName}</p>
        )}
        <div
          className={cn(
            "px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words",
            isMine
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-secondary text-foreground rounded-tl-sm"
          )}
        >
          {msg.content}
        </div>
        <p className={cn("text-[10px] text-muted-foreground px-1", isMine ? "text-right" : "text-left")}>
          {fmtMsgTime(msg.createdAt)}
          {isMine && (
            <span className="ml-1 opacity-70">{msg.read ? "✓✓" : "✓"}</span>
          )}
        </p>
      </div>
    </div>
  );
}

/* ─── date separator ───────────────────────────────────────────── */

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground px-2 shrink-0">{date}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/* ─── main chat page ───────────────────────────────────────────── */

export function ChatPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isDoctor = user?.role === "DOCTOR";

  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch appointment info
  const { data: patientAppointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: appointmentsApi.myAppointments,
    enabled: !isDoctor,
  });

  const { data: doctorAppointments = [] } = useQuery({
    queryKey: ["doctor", "appointments"],
    queryFn: doctorApi.myAppointments,
    enabled: isDoctor,
  });

  const patientAppt = !isDoctor
    ? (patientAppointments as Appointment[]).find((a) => a.id === appointmentId) ?? null
    : null;

  const doctorAppt = isDoctor
    ? (doctorAppointments).find((a) => a.id === appointmentId) ?? null
    : null;

  // Fetch messages with polling
  const { data: messages = [] } = useQuery({
    queryKey: ["chat", appointmentId],
    queryFn: () => chatApi.getMessages(appointmentId!),
    enabled: !!appointmentId,
    refetchInterval: 3000,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(appointmentId!, content),
    onSuccess: (newMsg) => {
      queryClient.setQueryData<ChatMessage[]>(["chat", appointmentId], (old = []) => [
        ...old,
        newMsg,
      ]);
      setText("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    },
    onError: () => toast.error("Не удалось отправить сообщение"),
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date for separators
  const grouped: Array<{ date: string | null; msg: ChatMessage }> = [];
  let lastDate = "";
  for (const msg of messages) {
    const d = new Date(msg.createdAt).toLocaleDateString("ru-RU", {
      day: "numeric", month: "long", year: "numeric",
    });
    grouped.push({ date: d !== lastDate ? d : null, msg });
    lastDate = d;
  }

  const contactName = isDoctor
    ? (doctorAppt?.patientName ?? "Пациент")
    : (patientAppt?.doctorName ?? "Врач");

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-background">

      {/* ── Top bar ── */}
      <div className="shrink-0 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MessageCircle className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">
              Чат · {contactName}
            </p>
            <p className="text-xs text-muted-foreground">
              Обновляется каждые 3 секунды
            </p>
          </div>
        </div>
      </div>

      {/* ── Contact card ── */}
      {isDoctor && doctorAppt && <DoctorContactCard appt={doctorAppt} />}
      {!isDoctor && patientAppt && <PatientContactCard appt={patientAppt} />}

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary/40" />
            </div>
            <p className="font-semibold text-foreground">Начните диалог</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Задайте вопрос врачу или уточните детали записи
            </p>
          </div>
        ) : (
          grouped.map(({ date, msg }) => (
            <div key={msg.id}>
              {date && <DateSeparator date={date} />}
              <MessageBubble
                msg={msg}
                isMine={msg.senderId === user?.id}
              />
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div className="shrink-0 border-t border-border bg-card px-4 py-3">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение... (Enter — отправить, Shift+Enter — новая строка)"
            rows={1}
            className="resize-none flex-1 rounded-2xl min-h-[44px] max-h-32 py-3 text-sm border-border focus-visible:ring-primary/30"
            style={{ height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            className="rounded-2xl w-11 h-11 p-0 shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Чат предназначен для уточнения деталей записи. При экстренных ситуациях звоните 103.
        </p>
      </div>
    </div>
  );
}
