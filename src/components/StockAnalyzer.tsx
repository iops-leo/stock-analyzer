
// src/components/StockAnalyzer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const RECENT_SEARCHES_KEY = 'recent_stock_searches';
const MAX_RECENT_SEARCHES = 5;

interface StockData {
  date: string;
  price: number;
  MA: number;
  Upper: number;
  Lower: number;
}

// 매수 신호 분석 함수
const analyzeBuySignal = (data: StockData[]) => {
    if (!data || data.length === 0) return null;
    
    const latestData = data[data.length - 1];
    const prevData = data[data.length - 2];
    
    const currentPrice = latestData.price;
    const lowerBand = latestData.Lower;
    const upperBand = latestData.Upper;
    const ma = latestData.MA;
    
    // 밴드 폭 계산 (변동성)
    const bandWidth = ((upperBand - lowerBand) / ma) * 100;
    
    // 하단 밴드까지의 거리 비율
    const distanceToLower = ((currentPrice - lowerBand) / lowerBand) * 100;
    
    let signal = '';
    let strength = 0;
    let reason = [];
    let recommendedBuyPrice = 0;
    let targetPrice = 0;
  
    // 매수가 계산 로직
    if (currentPrice < lowerBand) {
      strength += 2;
      reason.push('현재 가격이 하단 밴드 아래에 있어 과매도 상태입니다.');
      recommendedBuyPrice = currentPrice; // 현재가에 매수
      targetPrice = currentPrice * 1.02;
    } else if (distanceToLower <= 1) {
      strength += 1;
      reason.push('현재 가격이 하단 밴드에 매우 근접해있습니다.');
      recommendedBuyPrice = lowerBand;
      targetPrice = ma;
    } else {
      // 하단 밴드의 1% 위에서 매수 대기
      recommendedBuyPrice = lowerBand * 1.01;
      targetPrice = ma;
    }
  
    if (bandWidth > 5) {
      strength += 1;
      reason.push('밴드 폭이 넓어 변동성이 큰 상태입니다.');
    }
  
    if (prevData && prevData.price > currentPrice && distanceToLower <= 3) {
      strength += 1;
      reason.push('하락 추세에서 하단 밴드에 접근 중입니다.');
    }
  
    switch (strength) {
      case 0:
        signal = '매수 신호 없음';
        break;
      case 1:
        signal = '약한 매수 신호';
        break;
      case 2:
        signal = '중간 매수 신호';
        break;
      default:
        signal = '강한 매수 신호';
    }
  
    return {
      signal,
      currentPrice: currentPrice.toFixed(2),
      recommendedBuyPrice: recommendedBuyPrice.toFixed(2),
      targetPrice: targetPrice.toFixed(2),
      stopLoss: (lowerBand * 0.98).toFixed(2),
      reasons: reason,
      ma: ma.toFixed(2),
      upperBand: upperBand.toFixed(2),
      lowerBand: lowerBand.toFixed(2),
      bandWidth: bandWidth.toFixed(2)
    };
  };

const StockAnalyzer = () => {
  const [ticker, setTicker] = useState('');
  const [data, setData] = useState<StockData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveRecentSearch = (newTicker: string) => {
    const updated = [
      newTicker,
      ...recentSearches.filter(t => t !== newTicker)
    ].slice(0, MAX_RECENT_SEARCHES);
    
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const removeRecentSearch = (tickerToRemove: string) => {
    const updated = recentSearches.filter(t => t !== tickerToRemove);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const handleAnalyze = async (tickerToAnalyze: string) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    
    try {
      const response = await fetch(`/api/stock/${tickerToAnalyze}`);
      if (!response.ok) throw new Error('API 요청 실패');
      
      const stockData = await response.json();
      if (stockData.error) {
        throw new Error(stockData.error);
      }
      
      setData(stockData);
      const analysisResult = analyzeBuySignal(stockData);
      setAnalysis(analysisResult);
      saveRecentSearch(tickerToAnalyze);
      setTicker('');
    } catch (err: any) {
      setError(err.message || '데이터를 가져오는데 실패했습니다.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">볼린저 밴드 기반 주식 매수 분석</h1>
      
      <div className="space-y-6">
        {/* 검색 영역 */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="종목 코드를 입력하세요 (예: 005930.KS)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="w-full px-10 py-2 border rounded"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button 
            onClick={() => handleAnalyze(ticker)}
            disabled={loading || !ticker}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            분석하기
          </button>
        </div>

        {/* 최근 검색 기록 */}
        {recentSearches.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">최근 검색</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item) => (
                <div 
                  key={item} 
                  className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1"
                >
                  <button
                    onClick={() => handleAnalyze(item)}
                    className="text-sm hover:text-blue-600"
                  >
                    {item}
                  </button>
                  <button
                    onClick={() => removeRecentSearch(item)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {/* 로딩 상태 */}
        {loading && (
          <div className="text-center py-4">
            데이터를 불러오는 중...
          </div>
        )}

        {/* 분석 결과 표시 */}
{analysis && (
  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
    <h2 className="text-xl font-semibold mb-4">매매 신호 분석</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="font-medium">매수 신호:</span>
          <span className={`font-bold ${
            analysis.signal.includes('강한') ? 'text-green-600' :
            analysis.signal.includes('중간') ? 'text-yellow-600' :
            analysis.signal.includes('약한') ? 'text-blue-600' :
            'text-gray-600'
          }`}>{analysis.signal}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">현재 가격:</span>
          <span>${analysis.currentPrice}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">권장 매수가:</span>
          <span className="text-blue-600 font-bold">${analysis.recommendedBuyPrice}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">목표 가격:</span>
          <span className="text-green-600">${analysis.targetPrice}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">손절가:</span>
          <span className="text-red-600">${analysis.stopLoss}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">예상 수익률:</span>
          <span className="text-green-600">
            {((Number(analysis.targetPrice) / Number(analysis.recommendedBuyPrice) - 1) * 100).toFixed(2)}%
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="font-medium">이동평균:</span>
          <span>${analysis.ma}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">상단 밴드:</span>
          <span>${analysis.upperBand}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">하단 밴드:</span>
          <span>${analysis.lowerBand}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">밴드 폭:</span>
          <span>{analysis.bandWidth}%</span>
        </div>
      </div>
    </div>

    <div className="mt-4">
      <h3 className="font-medium mb-2">매매 전략:</h3>
      <ul className="list-disc list-inside space-y-1">
        <li className="text-sm text-gray-700">
          매수가 ${analysis.recommendedBuyPrice}에 주문 걸기
        </li>
        <li className="text-sm text-gray-700">
          손절가 ${analysis.stopLoss}에 손절 주문 걸기
        </li>
        <li className="text-sm text-gray-700">
          목표가 ${analysis.targetPrice}에 익절 주문 걸기
        </li>
        {analysis.reasons.map((reason: string, index: number) => (
          <li key={index} className="text-sm text-gray-700">{reason}</li>
        ))}
      </ul>
    </div>
  </div>
)}

        {/* 차트 표시 */}
{data && analysis && (
  <div className="mt-6 h-[400px]">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          interval={Math.floor(data.length / 10)}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          domain={['auto', 'auto']}
        />
        <Tooltip content={({ active, payload }) => {
          if (active && payload && payload.length) {
            return (
              <div className="bg-white p-3 border rounded shadow">
                <p className="text-sm">날짜: {payload[0].payload.date}</p>
                <p className="text-sm">가격: ${payload[0].payload.price.toFixed(2)}</p>
                <p className="text-sm">이동평균: ${payload[0].payload.MA.toFixed(2)}</p>
                <p className="text-sm">상단밴드: ${payload[0].payload.Upper.toFixed(2)}</p>
                <p className="text-sm">하단밴드: ${payload[0].payload.Lower.toFixed(2)}</p>
              </div>
            );
          }
          return null;
        }}/>
        <Legend />
        {/* 예상 매수가격 수평선 */}
        <ReferenceLine 
          y={Number(analysis.recommendedBuyPrice)} 
          stroke="#4CAF50" 
          strokeDasharray="3 3"
          label={{ 
            position: 'right',
            value: `매수가 $${analysis.recommendedBuyPrice}`,
            fill: '#4CAF50',
            fontSize: 12,
          }} 
        />
        <ReferenceLine 
          y={Number(analysis.targetPrice)} 
          stroke="#2196F3" 
          strokeDasharray="3 3" 
          label={{ 
            position: 'right',
            value: `목표가 $${analysis.targetPrice}`,
            fill: '#2196F3',
            fontSize: 12,
          }} 
        />
        <ReferenceLine 
          y={Number(analysis.stopLoss)} 
          stroke="#FF5722" 
          strokeDasharray="3 3" 
          label={{ 
            position: 'right',
            value: `손절가 $${analysis.stopLoss}`,
            fill: '#FF5722',
            fontSize: 12,
          }} 
        />
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke="#8884d8" 
          name="가격"
          dot={false}
        />
        <Line 
          type="monotone" 
          dataKey="MA" 
          stroke="#82ca9d" 
          name="이동평균"
          dot={false}
        />
        <Line 
          type="monotone" 
          dataKey="Upper" 
          stroke="#ff7300" 
          name="상단밴드"
          dot={false}
        />
        <Line 
          type="monotone" 
          dataKey="Lower" 
          stroke="#ff7300" 
          name="하단밴드"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
)} 
      </div>
    </div>
  );
};

export default StockAnalyzer;