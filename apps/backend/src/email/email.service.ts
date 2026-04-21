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

  async sendLowStockEmail(data: {
    sku: string;
    quantity: number;
    threshold: number;
  }): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL') ?? 'admin@yueeroom.com';
    await this.send(adminEmail, '[유이룸] 재고 부족 알림', this.lowStockTemplate(data));
  }

  async sendOrderStatusEmail(
    to: string,
    name: string,
    orderId: string,
    status: string,
  ): Promise<void> {
    const statusLabel: Record<string, string> = {
      PENDING: '주문 접수',
      PAID: '결제 완료',
      SHIPPING: '배송 중',
      DELIVERED: '배송 완료',
      CANCELLED: '취소됨',
      REFUNDED: '환불됨',
    };
    const label = statusLabel[status] ?? status;
    await this.send(
      to,
      `[유이룸] 주문 상태가 변경되었습니다: ${label}`,
      this.orderStatusTemplate(name, orderId, label),
    );
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

  private lowStockTemplate(data: { sku: string; quantity: number; threshold: number }): string {
    return `
      <h2>재고 부족 알림</h2>
      <p>상품 변형 <strong>${data.sku}</strong>의 재고가 임계값 이하로 떨어졌습니다.</p>
      <p>현재 수량: <strong>${data.quantity}개</strong> (임계값: ${data.threshold}개)</p>
      <p>재고를 보충해 주세요.</p>
    `;
  }

  private orderStatusTemplate(name: string, orderId: string, statusLabel: string): string {
    return `
      <h2>안녕하세요, ${name}님!</h2>
      <p>주문 번호 <strong>${orderId}</strong>의 상태가 <strong>${statusLabel}</strong>(으)로 변경되었습니다.</p>
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
