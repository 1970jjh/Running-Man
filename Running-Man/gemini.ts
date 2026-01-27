// Gemini API 유틸리티

// Gemini API 키 (환경변수 또는 상수로 관리)
// 실제 배포 시에는 환경변수로 관리해야 합니다
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

interface AnalysisInput {
  teamNumber: number;
  unlockedCards: string[];
  roundResults: {
    round: number;
    portfolioValue: number;
    totalValue: number;
    profitRate: number;
    cumulativeProfitRate: number;
  }[];
  finalCash: number;
  portfolio: { [stockId: string]: number };
  stockPrices: { [stockId: string]: number[] };
  maxRounds: number;
}

export interface AnalysisReport {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  overallScore: number;
  timestamp: string;
}

export const analyzeTeamPerformance = async (input: AnalysisInput): Promise<AnalysisReport> => {
  if (!GEMINI_API_KEY) {
    // API 키가 없으면 샘플 분석 결과 반환
    return generateSampleAnalysis(input);
  }

  try {
    const prompt = buildAnalysisPrompt(input);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return parseAnalysisResponse(text, input);
  } catch (error) {
    console.error('Gemini API 호출 실패:', error);
    return generateSampleAnalysis(input);
  }
};

const buildAnalysisPrompt = (input: AnalysisInput): string => {
  const { teamNumber, unlockedCards, roundResults, finalCash, stockPrices, maxRounds } = input;

  const lastResult = roundResults[roundResults.length - 1];
  const cumulativeRate = lastResult?.cumulativeProfitRate || 0;

  // 카드 카테고리 분석
  const cardCategories = unlockedCards.reduce((acc, cardId) => {
    const category = parseInt(cardId.split('-')[0]);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as { [key: number]: number });

  return `
당신은 모의투자 게임의 투자 전략 분석가입니다. 아래 팀의 투자 결과를 분석하고 피드백을 제공해주세요.

## Team ${teamNumber} 투자 분석 요청

### 게임 설정
- 총 라운드: ${maxRounds}R
- 시드머니: 1,000만원

### 정보 카드 보유 현황
- 총 ${unlockedCards.length}개의 정보 카드 보유
- 업종정보: ${cardCategories[0] || 0}개
${Array.from({ length: maxRounds }, (_, i) => `- ${i + 1}R 정보: ${cardCategories[i + 1] || 0}개`).join('\n')}

### 라운드별 수익률
${roundResults.map(r => `- Round ${r.round}: ${r.profitRate >= 0 ? '+' : ''}${r.profitRate.toFixed(1)}% (누적: ${r.cumulativeProfitRate >= 0 ? '+' : ''}${r.cumulativeProfitRate.toFixed(1)}%)`).join('\n')}

### 최종 결과
- 최종 자산: ${(lastResult?.totalValue || finalCash).toLocaleString()}원
- 누적 수익률: ${cumulativeRate >= 0 ? '+' : ''}${cumulativeRate.toFixed(1)}%

다음 형식으로 분석 결과를 JSON으로 제공해주세요:
{
  "summary": "전체 투자 성과에 대한 2-3문장 요약",
  "strengths": ["강점1", "강점2", "강점3"],
  "weaknesses": ["개선점1", "개선점2"],
  "recommendations": ["조언1", "조언2", "조언3"],
  "overallScore": 1-100 사이의 점수
}
`;
};

const parseAnalysisResponse = (text: string, input: AnalysisInput): AnalysisReport => {
  try {
    // JSON 부분 추출 시도
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || '분석을 완료했습니다.',
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        recommendations: parsed.recommendations || [],
        overallScore: Math.min(100, Math.max(0, parsed.overallScore || 50)),
        timestamp: new Date().toISOString()
      };
    }
  } catch (e) {
    console.error('분석 결과 파싱 실패:', e);
  }

  return generateSampleAnalysis(input);
};

const generateSampleAnalysis = (input: AnalysisInput): AnalysisReport => {
  const { teamNumber, unlockedCards, roundResults } = input;
  const lastResult = roundResults[roundResults.length - 1];
  const cumulativeRate = lastResult?.cumulativeProfitRate || 0;
  const cardCount = unlockedCards.length;

  // 점수 계산 (수익률 + 정보 활용도 기반)
  let score = 50;
  score += Math.min(30, cumulativeRate * 0.5); // 수익률 반영
  score += Math.min(20, cardCount * 2); // 정보 카드 활용도 반영
  score = Math.max(0, Math.min(100, score));

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  // 수익률 분석
  if (cumulativeRate > 20) {
    strengths.push('높은 수익률을 달성했습니다.');
  } else if (cumulativeRate > 0) {
    strengths.push('안정적인 양의 수익을 기록했습니다.');
  } else {
    weaknesses.push('손실이 발생했습니다. 리스크 관리가 필요합니다.');
  }

  // 정보 카드 분석
  if (cardCount >= 10) {
    strengths.push('많은 정보 카드를 확보하여 충분한 정보를 바탕으로 투자했습니다.');
  } else if (cardCount < 5) {
    weaknesses.push('정보 카드 확보가 부족했습니다. 더 많은 정보 수집이 필요합니다.');
  }

  // 라운드별 일관성 분석
  const positiveRounds = roundResults.filter(r => r.profitRate > 0).length;
  if (positiveRounds === roundResults.length) {
    strengths.push('모든 라운드에서 양의 수익을 기록하며 일관된 성과를 보였습니다.');
  } else if (positiveRounds === 0) {
    weaknesses.push('모든 라운드에서 손실이 발생했습니다.');
  }

  // 추천사항
  recommendations.push('다양한 섹터에 분산투자하여 리스크를 관리하세요.');
  recommendations.push('정보 카드를 적극적으로 활용하여 투자 결정의 정확도를 높이세요.');
  if (cumulativeRate < 0) {
    recommendations.push('손실 발생 시 손절매 기준을 설정하여 큰 손실을 방지하세요.');
  }

  return {
    summary: `Team ${teamNumber}은(는) 총 ${roundResults.length}라운드 동안 ${cardCount}개의 정보 카드를 활용하여 ${cumulativeRate >= 0 ? '+' : ''}${cumulativeRate.toFixed(1)}%의 누적 수익률을 달성했습니다. ${cumulativeRate > 10 ? '우수한 투자 성과를 보였습니다.' : cumulativeRate >= 0 ? '안정적인 투자를 진행했습니다.' : '투자 전략 개선이 필요합니다.'}`,
    strengths,
    weaknesses,
    recommendations,
    overallScore: Math.round(score),
    timestamp: new Date().toISOString()
  };
};

export default analyzeTeamPerformance;
