package kz.healthcare.platform.shared.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.email.from}")
    private String from;

    @Value("${app.email.enabled}")
    private boolean enabled;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Async
    public void sendPasswordReset(String toEmail, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;

        if (!enabled) {
            log.info("password_reset.email_disabled — reset link: {}", resetUrl);
            return;
        }

        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(toEmail);
            helper.setSubject("Сброс пароля — MedAI");
            helper.setText(buildResetHtml(resetUrl), true);
            mailSender.send(message);
            log.info("password_reset.email_sent to={}", toEmail);
        } catch (Exception e) {
            log.error("password_reset.email_failed to={} error={}", toEmail, e.getMessage());
        }
    }

    private String buildResetHtml(String resetUrl) {
        return """
                <!DOCTYPE html>
                <html lang="ru">
                <head><meta charset="UTF-8"></head>
                <body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
                  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
                    <div style="background:linear-gradient(135deg,#0d9488,#059669);padding:32px 24px;text-align:center">
                      <h1 style="color:#fff;margin:0;font-size:22px">🏥 MedAI Healthcare</h1>
                    </div>
                    <div style="padding:32px 24px">
                      <h2 style="color:#111827;margin:0 0 12px">Сброс пароля</h2>
                      <p style="color:#6b7280;line-height:1.6;margin:0 0 24px">
                        Вы запросили сброс пароля. Нажмите кнопку ниже, чтобы задать новый пароль.
                        Ссылка действительна <strong>1 час</strong>.
                      </p>
                      <a href="%s"
                         style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;
                                padding:12px 28px;border-radius:8px;font-weight:bold;font-size:15px">
                        Сбросить пароль
                      </a>
                      <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;line-height:1.5">
                        Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.<br>
                        Ссылка для копирования: <a href="%s" style="color:#0d9488">%s</a>
                      </p>
                    </div>
                    <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb">
                      <p style="color:#9ca3af;font-size:11px;margin:0">© 2026 MedAI Healthcare Platform</p>
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(resetUrl, resetUrl, resetUrl);
    }
}
