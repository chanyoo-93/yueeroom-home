export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold">개인정보 처리방침</h1>

      <p className="mb-6 text-sm text-gray-600">
        {`유이룸(이하 "회사")은 한국 개인정보보호법(PIPA)을 준수하며, 이용자의 개인정보를 안전하게 보호합니다. 본 방침은 2026년 4월 24일부터 시행됩니다.`}
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">1. 수집하는 개인정보 항목 및 수집 방법</h2>
        <p className="mb-2 text-sm text-gray-700">
          {`회사는 서비스 제공을 위해 다음 항목을 수집합니다.`}
        </p>
        <p className="mt-1 pl-4 text-sm text-gray-700">필수: 이메일 주소, 이름, 비밀번호</p>
        <p className="mt-1 pl-4 text-sm text-gray-700">
          선택: 전화번호, 배송지 정보, 자녀 정보(이름, 생년월일, 성별, 신체 정보)
        </p>
        <p className="mt-1 pl-4 text-sm text-gray-700">
          자동 수집: 서비스 이용 기록, 접속 IP, 쿠키
        </p>
        <p className="mt-2 text-sm text-gray-700">
          수집 방법: 회원가입 및 서비스 이용 시 직접 입력
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">2. 개인정보 수집·이용 목적</h2>
        <p className="mt-1 pl-4 text-sm text-gray-700">회원 가입 및 관리, 본인 확인</p>
        <p className="mt-1 pl-4 text-sm text-gray-700">상품 주문, 결제, 배송 처리</p>
        <p className="mt-1 pl-4 text-sm text-gray-700">고객 상담 및 분쟁 처리</p>
        <p className="mt-1 pl-4 text-sm text-gray-700">서비스 개선 및 신규 서비스 개발</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">3. 보유 및 이용 기간</h2>
        <p className="mb-2 text-sm text-gray-700">
          개인정보는 수집·이용 목적이 달성된 후 즉시 파기합니다. 단, 관련 법령에 따라 다음 기간 동안
          보존합니다.
        </p>
        <p className="mt-1 pl-4 text-sm text-gray-700">
          계약 또는 청약철회 기록: 5년 (전자상거래법)
        </p>
        <p className="mt-1 pl-4 text-sm text-gray-700">
          소비자 불만 또는 분쟁 처리 기록: 3년 (전자상거래법)
        </p>
        <p className="mt-1 pl-4 text-sm text-gray-700">
          서비스 이용 기록, 접속 로그: 3개월 (통신비밀보호법)
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">4. 개인정보 파기 절차 및 방법</h2>
        <p className="mb-2 text-sm text-gray-700">
          목적 달성 후 내부 방침에 따라 지체 없이 파기합니다.
        </p>
        <p className="mt-1 pl-4 text-sm text-gray-700">
          전자 파일: 복구 불가능한 방법으로 영구 삭제 (개인식별정보 익명화 처리)
        </p>
        <p className="mt-1 pl-4 text-sm text-gray-700">종이 문서: 분쇄 또는 소각</p>
        <p className="mt-2 text-sm text-gray-700">
          회원 탈퇴 시 이메일, 이름, 전화번호 등 식별 정보는 즉시 익명화 처리됩니다. 주문 거래
          기록은 전자상거래법에 따라 5년간 보존됩니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">
          5. 이용자의 권리 — 열람·정정·삭제 및 처리 정지 요청
        </h2>
        <p className="mb-2 text-sm text-gray-700">
          이용자는 언제든지 자신의 개인정보에 대해 다음 권리를 행사할 수 있습니다.
        </p>
        <p className="mt-1 pl-4 text-sm text-gray-700">
          개인정보 열람 요청: 마이페이지 → 내 프로필에서 직접 확인
        </p>
        <p className="mt-1 pl-4 text-sm text-gray-700">
          개인정보 정정 요청: 마이페이지 → 프로필 수정
        </p>
        <p className="mt-1 pl-4 text-sm text-gray-700">
          개인정보 삭제 요청 (회원 탈퇴): 마이페이지 → 회원 탈퇴
        </p>
        <p className="mt-1 pl-4 text-sm text-gray-700">
          처리 정지 요청: 고객센터(privacy@yueeroom.com)로 이메일 문의
        </p>
        <p className="mt-2 text-sm text-gray-700">
          권리 행사는 법정대리인을 통해서도 가능하며, 회사는 요청 접수 후 10일 이내에 조치합니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">6. 개인정보 보호책임자</h2>
        <p className="mt-1 pl-4 text-sm text-gray-700">책임자: 개인정보 보호책임자</p>
        <p className="mt-1 pl-4 text-sm text-gray-700">이메일: privacy@yueeroom.com</p>
        <p className="mt-1 pl-4 text-sm text-gray-700">
          침해 신고: 개인정보침해 신고센터 (privacy.kisa.or.kr / 국번없이 118)
        </p>
        <p className="mt-2 text-sm text-gray-700">
          개인정보 침해 사고 발생 시 72시간 이내에 관계 기관에 신고하고 이용자에게 통지합니다.
        </p>
      </section>

      <p className="mt-8 text-xs text-gray-500">시행일: 2026년 4월 24일</p>
    </main>
  );
}
