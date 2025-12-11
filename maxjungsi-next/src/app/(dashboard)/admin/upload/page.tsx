'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

interface Template {
  name: string;
  description: string;
}

interface PreviewData {
  columns: string[];
  totalRows: number;
  sampleData: Record<string, any>[];
}

export default function AdminUploadPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    insertedCount?: number;
    updatedCount?: number;
    errors?: string[];
  } | null>(null);

  // 템플릿 목록 조회
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await apiFetch('/api/admin/upload/template');
        const data = await res.json();
        if (data.success) {
          const templateList = data.templates.map((name: string) => ({
            name,
            description: data.descriptions[name] || '',
          }));
          setTemplates(templateList);
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error);
      }
    };
    fetchTemplates();
  }, []);

  // 템플릿 다운로드
  const handleDownloadTemplate = async () => {
    if (!selectedTable) {
      alert('테이블을 선택해주세요.');
      return;
    }

    try {
      const res = await apiFetch(`/api/admin/upload/template?table=${selectedTable}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('템플릿 다운로드에 실패했습니다.');
    }
  };

  // 파일 선택
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(null);
      setResult(null);
    }
  };

  // 미리보기
  const handlePreview = async () => {
    if (!file || !selectedTable) {
      alert('테이블과 파일을 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('table', selectedTable);
      formData.append('mode', 'preview');

      const res = await apiFetch('/api/admin/upload/process', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setPreview(data.preview);
      } else {
        alert(data.message || '미리보기에 실패했습니다.');
      }
    } catch (error) {
      alert('미리보기에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 업로드 실행
  const handleUpload = async () => {
    if (!file || !selectedTable) {
      alert('테이블과 파일을 선택해주세요.');
      return;
    }

    if (!confirm(`${selectedTable} 테이블에 데이터를 업로드하시겠습니까?\n기존 데이터가 업데이트될 수 있습니다.`)) {
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('table', selectedTable);
      formData.append('mode', 'execute');

      const res = await apiFetch('/api/admin/upload/process', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: '업로드에 실패했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">데이터 업로드</h1>
        <p className="text-gray-500 mt-1">엑셀 파일로 데이터를 일괄 업로드합니다.</p>
      </div>

      {/* 1단계: 테이블 선택 */}
      <Card>
        <CardHeader>
          <CardTitle>1단계: 테이블 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {templates.map((template) => (
              <button
                key={template.name}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  selectedTable === template.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedTable(template.name);
                  setFile(null);
                  setPreview(null);
                  setResult(null);
                }}
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-gray-500 mt-1">{template.description}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2단계: 템플릿 다운로드 */}
      {selectedTable && (
        <Card>
          <CardHeader>
            <CardTitle>2단계: 템플릿 다운로드</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              템플릿을 다운로드하여 데이터를 입력한 후 업로드해주세요.
            </p>
            <Button onClick={handleDownloadTemplate}>
              {selectedTable} 템플릿 다운로드
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 3단계: 파일 업로드 */}
      {selectedTable && (
        <Card>
          <CardHeader>
            <CardTitle>3단계: 파일 업로드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {file && (
              <div className="flex gap-2">
                <Button onClick={handlePreview} disabled={loading} variant="outline">
                  {loading ? '처리 중...' : '미리보기'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4단계: 미리보기 */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>4단계: 데이터 확인</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-gray-600">
                총 <span className="font-bold text-blue-600">{preview.totalRows}개</span>의 데이터가
                업로드됩니다.
              </p>
            </div>

            {/* 샘플 데이터 테이블 */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {preview.columns.map((col) => (
                      <th key={col} className="px-3 py-2 text-left font-medium text-gray-600">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sampleData.map((row, i) => (
                    <tr key={i} className="border-t">
                      {preview.columns.map((col) => (
                        <td key={col} className="px-3 py-2">
                          {row[col] !== undefined ? String(row[col]).substring(0, 50) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.totalRows > 10 && (
              <p className="text-sm text-gray-500 mt-2">
                * 상위 10개 데이터만 표시됩니다.
              </p>
            )}

            <div className="mt-4">
              <Button onClick={handleUpload} disabled={loading} size="lg">
                {loading ? '업로드 중...' : `${preview.totalRows}개 데이터 업로드`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 결과 표시 */}
      {result && (
        <Card className={result.success ? 'border-green-500' : 'border-red-500'}>
          <CardHeader>
            <CardTitle className={result.success ? 'text-green-600' : 'text-red-600'}>
              {result.success ? '업로드 완료' : '업로드 실패'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{result.message}</p>

            {result.success && (
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{result.insertedCount}</div>
                  <div className="text-sm text-gray-600">추가</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.updatedCount}</div>
                  <div className="text-sm text-gray-600">수정</div>
                </div>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-red-600 mb-2">오류 목록:</h4>
                <ul className="list-disc list-inside text-sm text-red-500 space-y-1">
                  {result.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
