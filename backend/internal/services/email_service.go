package services

import (
	"fmt"
	"net/smtp"
	"os"
)

type EmailService struct{}

func NewEmailService() *EmailService {
	return &EmailService{}
}

func (s *EmailService) Send(to, subject, htmlBody string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	from := os.Getenv("SMTP_FROM")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")

	if host == "" {
		return nil
	}

	if port == "" {
		port = "587"
	}

	auth := smtp.PlainAuth("", user, pass, host)

	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		from, to, subject, htmlBody,
	)

	return smtp.SendMail(host+":"+port, auth, from, []string{to}, []byte(msg))
}

func (s *EmailService) SendInvitation(to, familyName, inviteURL string) error {
	subject := fmt.Sprintf("You're invited to the %s family tree on Shajarah", familyName)
	body := fmt.Sprintf(`
<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
<h2 style="color:#1a1a2e">You've been invited to join <strong>%s</strong></h2>
<p>Someone has invited you to collaborate on their family tree on Shajarah.</p>
<p>
  <a href="%s" style="display:inline-block;padding:12px 24px;background:#4361ee;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
    Accept Invitation
  </a>
</p>
<p style="color:#888;font-size:13px">Or copy this link: %s</p>
</body></html>`, familyName, inviteURL, inviteURL)
	return s.Send(to, subject, body)
}

func (s *EmailService) SendNotification(to, message string) error {
	subject := "Shajarah — New notification"
	body := fmt.Sprintf(`
<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
<h2 style="color:#1a1a2e">New update on your family tree</h2>
<p>%s</p>
<p><a href="http://localhost:3000" style="color:#4361ee">Open Shajarah</a></p>
</body></html>`, message)
	return s.Send(to, subject, body)
}
