// PDF 생성 유틸리티 (클라이언트 사이드)
// html2canvas와 jspdf는 동적 import로 사용

interface StudentInfo {
  name: string;
  school: string;
  gender: 'M' | 'F';
}

interface ScoreInfo {
  국어_표점: number;
  국어_백분: number;
  수학_표점: number;
  수학_백분: number;
  영어_등급: number;
  탐구1_과목: string;
  탐구1_표점: number;
  탐구1_백분: number;
  탐구2_과목: string;
  탐구2_표점: number;
  탐구2_백분: number;
  한국사_등급: number;
}

interface WishlistItem {
  대학명: string;
  학과명: string;
  군: string;
  수능: number;
  실기: number;
  total_score: number | null;
  suneung_score?: number | null;
  silgi_score?: number | null;
}

export async function generateCounselPDF(
  student: StudentInfo,
  score: ScoreInfo,
  wishlist: WishlistItem[],
  year: number
) {
  // 동적 import
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  // 표지 생성
  async function addCoverPage() {
    const coverContainer = document.createElement('div');
    coverContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 595px;
      height: 842px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    coverContainer.innerHTML = `
      <div style="width:100%;height:100%;background:linear-gradient(135deg,#1e293b 0%,#334155 50%,#1e293b 100%);display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:60px 40px;color:#fff;box-sizing:border-box;">
        <div style="text-align:center;">
          <div style="font-size:20px;color:rgba(255,255,255,0.6);margin-bottom:10px;">정시 상담 자료</div>
          <div style="font-size:52px;font-weight:700;letter-spacing:2px;">${year}학년도</div>
        </div>
        <div style="text-align:center;background:rgba(255,255,255,0.1);padding:40px 60px;border-radius:16px;">
          <div style="font-size:18px;color:rgba(255,255,255,0.8);margin-bottom:8px;">수험생</div>
          <div style="font-size:36px;font-weight:700;letter-spacing:3px;">${student.name}</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.6);margin-top:10px;">${student.school || ''}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:28px;font-weight:700;margin-bottom:8px;letter-spacing:2px;">
            <span style="color:#fbbf24;">MAX</span> 체대입시
          </div>
          <div style="font-size:12px;color:rgba(255,255,255,0.5);">
            생성일: ${new Date().toLocaleDateString('ko-KR')}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(coverContainer);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const canvas = await html2canvas(coverContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: null,
    });
    const imgData = canvas.toDataURL('image/png');

    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.addPage();
    currentY = margin;

    document.body.removeChild(coverContainer);
  }

  // 헤더 섹션 (학생 정보 + 성적)
  async function addHeaderSection() {
    const headerContainer = document.createElement('div');
    headerContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 800px;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #fff;
    `;
    headerContainer.innerHTML = `
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:10px;">
        <div style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #2563eb;">
          <span style="color:#2563eb;">${student.name}</span>
          <span style="font-size:14px;color:#64748b;font-weight:400;margin-left:10px;">${student.school || ''}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;">
          <div style="background:#f8fafc;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:16px;font-weight:600;">${score.국어_표점}/${score.국어_백분}</div>
            <div style="font-size:12px;color:#64748b;">국어 (표/백)</div>
          </div>
          <div style="background:#f8fafc;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:16px;font-weight:600;">${score.수학_표점}/${score.수학_백분}</div>
            <div style="font-size:12px;color:#64748b;">수학 (표/백)</div>
          </div>
          <div style="background:#f8fafc;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:16px;font-weight:600;">${score.영어_등급}등급</div>
            <div style="font-size:12px;color:#64748b;">영어</div>
          </div>
          <div style="background:#f8fafc;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:16px;font-weight:600;">${score.탐구1_표점}/${score.탐구1_백분}</div>
            <div style="font-size:12px;color:#64748b;">${score.탐구1_과목 || '탐구1'}</div>
          </div>
          <div style="background:#f8fafc;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:16px;font-weight:600;">${score.탐구2_표점}/${score.탐구2_백분}</div>
            <div style="font-size:12px;color:#64748b;">${score.탐구2_과목 || '탐구2'}</div>
          </div>
          <div style="background:#f8fafc;padding:12px;border-radius:8px;text-align:center;">
            <div style="font-size:16px;font-weight:600;">${score.한국사_등급}등급</div>
            <div style="font-size:12px;color:#64748b;">한국사</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(headerContainer);

    const canvas = await html2canvas(headerContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', margin, currentY, contentWidth, imgHeight);
    currentY += imgHeight + 5;

    document.body.removeChild(headerContainer);
  }

  // 군별 테이블 생성
  async function addGunTable(gunName: string, items: WishlistItem[]) {
    if (items.length === 0) return;

    const tableContainer = document.createElement('div');
    tableContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 800px;
      padding: 10px 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #fff;
    `;

    const rows = items
      .map(
        (item, idx) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 8px;text-align:center;">${idx + 1}</td>
        <td style="padding:10px 8px;font-weight:600;">${item.대학명}</td>
        <td style="padding:10px 8px;">${item.학과명}</td>
        <td style="padding:10px 8px;text-align:center;font-size:12px;">수능${item.수능}% / 실기${item.실기}%</td>
        <td style="padding:10px 8px;text-align:center;font-weight:600;color:#2563eb;">
          ${item.total_score !== null ? item.total_score.toFixed(2) : '-'}
        </td>
      </tr>
    `
      )
      .join('');

    tableContainer.innerHTML = `
      <h3 style="font-size:15px;color:#1e293b;padding-bottom:8px;border-bottom:2px solid #2563eb;margin:0 0 12px 0;display:flex;justify-content:space-between;">
        [${gunName}군]
        <span style="background:#e2e8f0;padding:2px 10px;border-radius:10px;font-size:12px;color:#666;">${items.length}개</span>
      </h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
            <th style="padding:10px 8px;text-align:center;width:40px;">#</th>
            <th style="padding:10px 8px;text-align:left;">대학</th>
            <th style="padding:10px 8px;text-align:left;">학과</th>
            <th style="padding:10px 8px;text-align:center;">반영비율</th>
            <th style="padding:10px 8px;text-align:center;width:80px;">환산점수</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
    document.body.appendChild(tableContainer);

    const canvas = await html2canvas(tableContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    // 페이지 넘김 체크
    if (currentY + imgHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
    }

    pdf.addImage(imgData, 'PNG', margin, currentY, contentWidth, imgHeight);
    currentY += imgHeight + 10;

    document.body.removeChild(tableContainer);
  }

  // 푸터 추가
  async function addFooter() {
    const footerContainer = document.createElement('div');
    footerContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 800px;
      padding: 10px 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #fff;
    `;
    footerContainer.innerHTML = `
      <div style="text-align:center;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#999;">
        생성일: ${new Date().toLocaleDateString('ko-KR')} | 맥스체대입시
      </div>
    `;
    document.body.appendChild(footerContainer);

    const canvas = await html2canvas(footerContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    if (currentY + imgHeight > pageHeight - margin) {
      pdf.addPage();
      currentY = margin;
    }

    pdf.addImage(imgData, 'PNG', margin, currentY, contentWidth, imgHeight);
    document.body.removeChild(footerContainer);
  }

  // PDF 생성 실행
  await addCoverPage();
  await addHeaderSection();

  // 군별 그룹화
  const gaItems = wishlist.filter((item) => item.군 === '가');
  const naItems = wishlist.filter((item) => item.군 === '나');
  const daItems = wishlist.filter((item) => item.군 === '다');

  await addGunTable('가', gaItems);
  await addGunTable('나', naItems);
  await addGunTable('다', daItems);

  await addFooter();

  // 파일 저장
  const fileName = `${year}학년도_정시상담_${student.name}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);

  return fileName;
}
