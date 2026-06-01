import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiInstance: SibApiV3Sdk.TransactionalEmailsApi;
  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor(private configService: ConfigService) {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = this.configService.get<string>('BREVO_API_KEY');

    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    this.senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL') || 'noreply@jook.com';
this.senderName = this.configService.get<string>('BREVO_SENDER_NAME') || 'Jook ERP';
  }

  async sendVerificationEmail(
    email: string,
    firstName: string,
    code: string,
  ): Promise<void> {
    try {
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      sendSmtpEmail.sender = {
        name: this.senderName,
        email: this.senderEmail,
      };

      sendSmtpEmail.to = [
        {
          email: email,
          name: firstName,
        },
      ];

      sendSmtpEmail.subject = 'Verifica tu cuenta - Jook ERP';
      sendSmtpEmail.htmlContent = this.getVerificationEmailTemplate(
        firstName,
        code,
      );

      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);

      this.logger.log(`Email enviado exitosamente a ${email}. MessageId: ${result.messageId}`);
    } catch (error) {
      this.logger.error(
        `Error enviando email a ${email}:`,
        error.response?.text || error.message,
      );
      throw new Error('Error al enviar el email de verificación');
    }
  }

  private getVerificationEmailTemplate(
    firstName: string,
    code: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
          }
          .email-container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .header-subtitle {
            font-size: 14px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #1a1a1a;
          }
          .message {
            font-size: 16px;
            color: #555;
            margin-bottom: 30px;
            line-height: 1.8;
          }
          .code-container {
            background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
            border: 2px dashed #667eea;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          .code-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
          }
          .code {
            font-size: 48px;
            font-weight: bold;
            color: #667eea;
            letter-spacing: 12px;
            font-family: 'Courier New', monospace;
            user-select: all;
          }
          .expiry-notice {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px 20px;
            margin: 30px 0;
            border-radius: 4px;
          }
          .expiry-icon {
            font-size: 24px;
          }
          .expiry-text {
            color: #856404;
            font-weight: 600;
            font-size: 14px;
          }
          .info-box {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .info-text {
            font-size: 14px;
            color: #666;
            line-height: 1.6;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e0e0e0;
          }
          .footer-text {
            font-size: 13px;
            color: #999;
            margin-bottom: 10px;
          }
          .footer-brand {
            font-size: 12px;
            color: #bbb;
            margin-top: 15px;
          }
          .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #e0e0e0, transparent);
            margin: 30px 0;
          }
          @media only screen and (max-width: 600px) {
            .email-container {
              margin: 20px;
              border-radius: 8px;
            }
            .content {
              padding: 30px 20px;
            }
            .code {
              font-size: 36px;
              letter-spacing: 8px;
            }
            .greeting {
              font-size: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="logo">🎯 Jook ERP</div>
            <div class="header-subtitle">Sistema de Gestión Empresarial</div>
          </div>

          <div class="content">
            <div class="greeting">¡Hola ${firstName}! 👋</div>

            <div class="message">
              Gracias por registrarte en <strong>Jook ERP</strong>. Estás a un paso de comenzar a gestionar tu negocio de manera eficiente.
            </div>

            <div class="message">
              Para completar tu registro y verificar tu cuenta, utiliza el siguiente código de verificación:
            </div>

            <div class="code-container">
              <div class="code-label">Tu código de verificación</div>
              <div class="code">${code}</div>
            </div>

            <div class="expiry-notice">
              <div class="expiry-icon">⏱️</div>
              <div class="expiry-text">Este código expirará en 90 segundos</div>
            </div>

            <div class="divider"></div>

            <div class="info-box">
              <div class="info-text">
                <strong>📌 Nota de seguridad:</strong><br>
                Si no solicitaste este registro, puedes ignorar este correo de forma segura. Tu información está protegida.
              </div>
            </div>

            <div class="message" style="margin-top: 30px;">
              ¿Tienes problemas? Contáctanos en cualquier momento.<br>
              Estamos aquí para ayudarte.
            </div>

            <div class="message" style="margin-top: 20px; font-weight: 600;">
              Saludos,<br>
              El equipo de Jook ERP 🚀
            </div>
          </div>

          <div class="footer">
            <div class="footer-text">
              Este es un correo automático, por favor no respondas a este mensaje.
            </div>
            <div class="footer-brand">
              © ${new Date().getFullYear()} Jook ERP. Todos los derechos reservados.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    try {
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      sendSmtpEmail.sender = {
        name: this.senderName,
        email: this.senderEmail,
      };

      sendSmtpEmail.to = [
        {
          email: email,
          name: firstName,
        },
      ];

      sendSmtpEmail.subject = '¡Bienvenido a Jook ERP! 🎉';
      sendSmtpEmail.htmlContent = this.getWelcomeEmailTemplate(firstName);

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);

      this.logger.log(`Email de bienvenida enviado a ${email}`);
    } catch (error) {
      this.logger.error(
        `Error enviando email de bienvenida a ${email}:`,
        error.response?.text || error.message,
      );
      // No lanzamos error aquí para no bloquear el flujo principal
    }
  }

  private getWelcomeEmailTemplate(firstName: string): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 40px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Bienvenido a Jook ERP!</h1>
          </div>
          <div class="content">
            <h2>¡Hola ${firstName}!</h2>
            <p>Tu cuenta ha sido verificada exitosamente. Ahora puedes acceder a todas las funcionalidades de Jook ERP.</p>
            <p><strong>¿Qué puedes hacer ahora?</strong></p>
            <ul>
              <li>✅ Gestionar facturas y pagos</li>
              <li>✅ Administrar inventario</li>
              <li>✅ Generar reportes financieros</li>
              <li>✅ Y mucho más...</li>
            </ul>
            <p>Estamos emocionados de tenerte con nosotros.</p>
            <p>Saludos,<br>El equipo de Jook ERP</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendSoftwareInfoEmail(
    email: string,
    data: {
      businessName: string;
      contactName?: string;
      city?: string;
      category?: string;
      unsubscribeUrl?: string;
    },
  ): Promise<void> {
    try {
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      sendSmtpEmail.sender = {
        name: this.senderName,
        email: this.senderEmail,
      };

      sendSmtpEmail.to = [
        {
          email,
          name: data.contactName || data.businessName,
        },
      ];

      sendSmtpEmail.subject = 'Consulta rapida sobre su operacion';
      sendSmtpEmail.htmlContent = this.getSoftwareInfoEmailTemplate(data);

      await this.apiInstance.sendTransacEmail(sendSmtpEmail);

      this.logger.log(`Informacion comercial enviada a ${email}`);
    } catch (error) {
      this.logger.error(
        `Error enviando informacion comercial a ${email}:`,
        error.response?.text || error.message,
      );
      throw new Error('Error al enviar la informacion comercial');
    }
  }

  private getSoftwareInfoEmailTemplate(data: {
    businessName: string;
    contactName?: string;
    city?: string;
    category?: string;
    unsubscribeUrl?: string;
  }): string {
    const greeting = data.contactName || data.businessName;
    const cityText = data.city ? ` en ${data.city}` : '';
    const categoryText = data.category ? ` de ${data.category}` : '';
    const unsubscribeBlock = data.unsubscribeUrl
      ? `<p style="font-size:12px;color:#666;margin-top:24px;">Si prefieres no recibir mas mensajes, puedes darte de baja aqui: <a href="${data.unsubscribeUrl}" style="color:#2563eb;">${data.unsubscribeUrl}</a></p>`
      : '';

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;background:#ffffff;color:#222;font-family:Arial,sans-serif;">
        <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
          <div style="padding:8px 0;">
            <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">Hola ${greeting},</p>
            <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">
              Vi su negocio${cityText} y quise escribirle porque en Jook ERP estamos ayudando a empresas${categoryText} a organizar mejor ventas, inventario y facturacion.
            </p>
            <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">
              Queria hacerle una pregunta puntual: hoy esa parte la manejan con sistema o todavia con Excel, WhatsApp o procesos manuales?
            </p>
            <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">
              Si quiere ver una demo corta, aqui le dejo el video:
            </p>
            <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">
              <a href="https://www.youtube.com/watch?v=FuIgcq--0Ic" style="color:#2563eb;">https://www.youtube.com/watch?v=FuIgcq--0Ic</a>
            </p>
            <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">
              Si le interesa, con gusto le comparto mas informacion o coordinamos una demo breve enfocada en su negocio.
            </p>
            <p style="font-size:14px;line-height:1.7;color:#444;margin:20px 0 0;">
              Saludos,<br>
              Equipo Jook ERP
            </p>
            ${unsubscribeBlock}
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
