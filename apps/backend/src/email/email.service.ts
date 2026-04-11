import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: SESClient;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    this.sesClient = new SESClient({
      region: this.configService.get<string>('AWS_REGION') ?? 'ap-northeast-2',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
    this.fromEmail = this.configService.get<string>('SES_FROM_EMAIL') ?? 'noreply@yueeroom.com';
  }

  async sendApprovalEmail(to: string, name: string): Promise<void> {
    await this.send(to, '[유이룸] 회원가입이 승인되었습니다', this.approvalTemplate(name));
  }

  async sendRejectionEmail(to: string, name: string): Promise<void> {
    await this.send(to, '[유이룸] 회원가입 신청 결과 안내', this.rejectionTemplate(name));
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'}/reset-password?token=${token}`;
    await this.send(to, '[유이룸] 비밀번호 재설정 안내', this.passwordResetTemplate(resetUrl));
  }

  private async send(to: string, subject: string, htmlBody: string): Promise<void> {
    const command = new SendEmailCommand({
      Source: this.fromEmail,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: { Html: { Data: htmlBody, Charset: 'UTF-8' } },
      },
    });

    try {
      await this.sesClient.send(command);
    } catch (error) {
      this.logger.error(`이메일 발송 실패: ${String(error)}`);
      throw error;
    }
  }

  private approvalTemplate(name: string): string {
    return `
      <h2>안녕하세요, ${name}님!</h2>
      <p>유이룸 회원가입 신청이 <strong>승인</strong>되었습니다.</p>
      <p>지금 바로 로그인하여 서비스를 이용해보세요.</p>
    `;
  }

  private rejectionTemplate(name: string): string {
    return `
      <h2>안녕하세요, ${name}님.</h2>
      <p>유이룸 회원가입 신청이 <strong>거절</strong>되었습니다.</p>
      <p>문의사항이 있으시면 관리자에게 연락해주세요.</p>
    `;
  }

  private passwordResetTemplate(resetUrl: string): string {
    return `
      <h2>비밀번호 재설정</h2>
      <p>아래 링크를 클릭하여 비밀번호를 재설정하세요.</p>
      <p>링크는 30분 후 만료됩니다.</p>
      <a href="${resetUrl}">비밀번호 재설정하기</a>
    `;
  }
}
