import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { ticker: string } }
) {
  // searchParams를 사용하여 ticker 값을 가져옵니다
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const ticker = segments[segments.length - 1];
  
  if (!ticker) {
    return NextResponse.json(
      { error: '종목 코드가 필요합니다.' },
      { status: 400 }
    );
  }

  try {
    // Alpha Vantage API 호출
    const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
    const apiUrl = new URL('https://www.alphavantage.co/query');
    apiUrl.searchParams.set('function', 'TIME_SERIES_DAILY');
    apiUrl.searchParams.set('symbol', ticker);
    apiUrl.searchParams.set('outputsize', 'full');
    apiUrl.searchParams.set('apikey', ALPHA_VANTAGE_API_KEY || '');

    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      return NextResponse.json(
        { error: '주식 데이터를 가져오는데 실패했습니다.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // API 응답 데이터 처리
    const timeSeriesData = data['Time Series (Daily)'];
    if (!timeSeriesData) {
      return NextResponse.json(
        { error: '해당 종목의 데이터를 찾을 수 없습니다.' }, 
        { status: 404 }
      );
    }

    // 최근 120일 데이터 추출
    // 최근 120일 데이터 추출 및 처리 부분 수정
const dates = Object.keys(timeSeriesData).sort().slice(-120);
const processedData = dates.map(date => {
  const dayData = timeSeriesData[date];
  return {
    date,
    price: parseFloat(dayData['4. close'])
  };
});

// 이동평균과 표준편차 계산을 위한 윈도우 크기
const WINDOW_SIZE = 20;  // 20일 기준으로 변경

// 각 시점별 이동평균과 밴드 계산
const result = processedData.map((day, index) => {
  // 현재 시점까지의 윈도우 데이터 추출
  const windowStart = Math.max(0, index - WINDOW_SIZE + 1);
  const windowData = processedData.slice(windowStart, index + 1);
  const prices = windowData.map(d => d.price);
  
  // 이동평균 계산
  const ma = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  // 표준편차 계산
  const std = Math.sqrt(
    prices.reduce((sum, price) => sum + Math.pow(price - ma, 2), 0) / prices.length
  );
  
  return {
    ...day,
    MA: Number(ma.toFixed(2)),
    Upper: Number((ma + (2 * std)).toFixed(2)),
    Lower: Number((ma - (2 * std)).toFixed(2))
  };
});

    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('API 에러:', error);
    return NextResponse.json(
      { error: '데이터를 처리하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}