export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold">이용약관</h1>

      <p className="mb-6 text-sm text-gray-600">
        본 약관은 유이룸(이하 &quot;회사&quot;)이 제공하는 온라인 쇼핑몰 서비스(이하
        &quot;서비스&quot;)의 이용 조건 및 절차에 관한 사항을 규정합니다. 본 약관은 2026년 4월
        24일부터 시행됩니다.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">제1조 (목적)</h2>
        <p className="text-sm text-gray-700">
          이 약관은 유이룸이 운영하는 인터넷 쇼핑몰(이하 &quot;몰&quot;)에서 제공하는 인터넷 관련
          서비스(이하 &quot;서비스&quot;)를 이용함에 있어 몰과 이용자의 권리·의무 및 책임 사항을
          규정함을 목적으로 합니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">제2조 (정의)</h2>
        <ul className="list-disc pl-6 text-sm text-gray-700">
          <li>
            &quot;몰&quot;이란 유이룸이 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등
            정보통신설비를 이용하여 재화 또는 용역을 거래할 수 있도록 설정한 가상의 영업장을
            말합니다.
          </li>
          <li>
            &quot;이용자&quot;란 몰에 접속하여 이 약관에 따라 몰이 제공하는 서비스를 받는 회원을
            말합니다.
          </li>
          <li>
            &quot;회원&quot;이란 몰에 개인정보를 제공하여 회원가입을 한 자로서, 관리자 승인 후
            서비스를 지속적으로 이용할 수 있는 자를 말합니다.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">제3조 (회원가입 및 서비스 이용)</h2>
        <ul className="list-disc pl-6 text-sm text-gray-700">
          <li>
            이용자는 몰이 정한 가입 양식에 따라 회원정보를 기입한 후 서비스 이용을 신청합니다.
          </li>
          <li>본 서비스는 관리자 승인 후 이용 가능한 비공개 쇼핑몰입니다.</li>
          <li>회사는 승인 여부를 신청 후 이메일 또는 서비스 내 알림으로 안내합니다.</li>
          <li>
            다음에 해당하는 경우 가입 신청을 거절하거나 승인을 취소할 수 있습니다.
            <ul className="list-disc pl-6 mt-1">
              <li>실명이 아니거나 타인의 명의를 이용한 경우</li>
              <li>허위 정보를 기재하거나 회사가 요구하는 내용을 기재하지 않은 경우</li>
              <li>기타 회원으로 등록하는 것이 서비스 운영에 지장이 있다고 판단되는 경우</li>
            </ul>
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">제4조 (구매 및 결제)</h2>
        <ul className="list-disc pl-6 text-sm text-gray-700">
          <li>
            이용자는 몰에서 상품을 선택하여 주문서를 작성하고 결제를 완료함으로써 구매계약이
            성립됩니다.
          </li>
          <li>결제 방법은 신용카드, 카카오페이, 네이버페이 등 회사가 정한 방법에 따릅니다.</li>
          <li>미성년자가 결제하는 경우 법정대리인의 동의를 얻어야 합니다.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">제5조 (청약철회 및 환불)</h2>
        <ul className="list-disc pl-6 text-sm text-gray-700">
          <li>
            이용자는 구매 확정 전 또는 상품 수령 후 7일 이내에 청약철회(반품)를 신청할 수 있습니다.
          </li>
          <li>
            다음의 경우에는 청약철회가 제한될 수 있습니다.
            <ul className="list-disc pl-6 mt-1">
              <li>이용자에게 책임 있는 사유로 상품이 훼손된 경우</li>
              <li>포장을 개봉하거나 일부 사용하여 상품 가치가 감소한 경우</li>
            </ul>
          </li>
          <li>환불은 청약철회 확인 후 3영업일 이내에 처리됩니다.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">제6조 (개인정보 보호)</h2>
        <p className="text-sm text-gray-700">
          회사는 이용자의 개인정보를 보호하기 위해 개인정보 처리방침을 수립·공개하며, 관련 법령에
          따라 안전하게 관리합니다. 자세한 사항은{' '}
          <a href="/privacy" className="text-blue-600 underline">
            개인정보 처리방침
          </a>
          을 확인하세요.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">제7조 (면책조항)</h2>
        <ul className="list-disc pl-6 text-sm text-gray-700">
          <li>
            천재지변, 불가항력적 사유로 서비스를 제공할 수 없는 경우 회사는 책임을 지지 않습니다.
          </li>
          <li>이용자의 귀책 사유로 인한 서비스 이용 장애에 대해서 회사는 책임을 지지 않습니다.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">제8조 (분쟁 해결)</h2>
        <p className="text-sm text-gray-700">
          이 약관에서 발생한 분쟁에 대해서는 대한민국 법을 적용하며, 분쟁이 발생할 경우 회사의 본사
          소재지를 관할하는 법원을 전속 관할 법원으로 합니다.
        </p>
      </section>

      <p className="text-xs text-gray-400">부칙: 본 약관은 2026년 4월 24일부터 시행됩니다.</p>
    </main>
  );
}
