// Gemini API 유틸리티 - 팀별 투자 분석 with 이미지 분석

import { Transaction } from './types';
import { INFO_CARD_IMAGES } from './constants';

// Gemini API 키 (환경변수로 관리)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// 종목 인덱스 -> 종목 ID 매핑
const STOCK_INDEX_TO_ID: { [key: number]: string } = {
  1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G', 8: 'H', 9: 'I',
  10: 'J', 11: 'K', 12: 'L', 13: 'M', 14: 'N', 15: 'O', 16: 'P', 17: 'Q', 18: 'R', 19: 'S'
};

// 종목 ID -> 인덱스 매핑
const STOCK_ID_TO_INDEX: { [key: string]: number } = {
  'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9,
  'J': 10, 'K': 11, 'L': 12, 'M': 13, 'N': 14, 'O': 15, 'P': 16, 'Q': 17, 'R': 18, 'S': 19
};

interface AnalysisInput {
  teamNumber: number;
  teamName: string;
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
  transactionHistory?: Transaction[];
}

export interface AnalysisReport {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  infoCardAnalysis: string[]; // 정보카드 기반 투자 vs 협상 투자 분석
  overallScore: number;
  timestamp: string;
}

// 팀이 특정 종목에 대한 정보카드를 가지고 있는지 확인
const hasInfoCardForStock = (unlockedCards: string[], stockId: string, maxRound: number): { hasCard: boolean; rounds: number[] } => {
  const stockIndex = STOCK_ID_TO_INDEX[stockId];
  if (!stockIndex) return { hasCard: false, rounds: [] };

  const rounds: number[] = [];

  // 카테고리 0(업종정보) 및 1~maxRound까지 확인
  for (let category = 0; category <= maxRound; category++) {
    const cardId = `${category}-${stockIndex}`;
    if (unlockedCards.includes(cardId)) {
      rounds.push(category);
    }
  }

  return { hasCard: rounds.length > 0, rounds };
};

// 거래 내역에서 구매한 종목과 정보카드 보유 여부 분석
const analyzeInvestmentDecisions = (
  transactionHistory: Transaction[],
  unlockedCards: string[],
  maxRounds: number
): { withInfoCard: string[]; withoutInfoCard: string[]; details: { stockId: string; hasCard: boolean; cardRounds: number[]; buyRound: number }[] } => {
  const withInfoCard: Set<string> = new Set();
  const withoutInfoCard: Set<string> = new Set();
  const details: { stockId: string; hasCard: boolean; cardRounds: number[]; buyRound: number }[] = [];

  // 매수 거래만 필터
  const buyTransactions = transactionHistory.filter(tx => tx.type === 'BUY');

  buyTransactions.forEach(tx => {
    const { hasCard, rounds } = hasInfoCardForStock(unlockedCards, tx.stockId, maxRounds);

    if (hasCard) {
      withInfoCard.add(tx.stockId);
    } else {
      withoutInfoCard.add(tx.stockId);
    }

    // 중복 방지
    if (!details.find(d => d.stockId === tx.stockId && d.buyRound === tx.round)) {
      details.push({
        stockId: tx.stockId,
        hasCard,
        cardRounds: rounds,
        buyRound: tx.round
      });
    }
  });

  return {
    withInfoCard: Array.from(withInfoCard),
    withoutInfoCard: Array.from(withoutInfoCard),
    details
  };
};

// 정보카드 이미지 URL 가져오기
const getInfoCardImageUrls = (unlockedCards: string[]): { cardId: string; imageUrl: string }[] => {
  return unlockedCards
    .filter(cardId => INFO_CARD_IMAGES[cardId])
    .map(cardId => ({
      cardId,
      imageUrl: INFO_CARD_IMAGES[cardId]
    }));
};

// 이미지를 base64로 변환
const fetchImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // data:image/...;base64, 부분 제거
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('이미지 로드 실패:', imageUrl, error);
    return null;
  }
};

// Gemini Vision API로 이미지 분석
const analyzeInfoCardImages = async (
  infoCards: { cardId: string; imageUrl: string }[],
  maxRounds: number
): Promise<{ [cardId: string]: string }> => {
  if (!GEMINI_API_KEY || infoCards.length === 0) {
    return {};
  }

  const results: { [cardId: string]: string } = {};

  // 최대 5개 카드만 분석 (API 비용 관리)
  const cardsToAnalyze = infoCards.slice(0, 5);

  for (const card of cardsToAnalyze) {
    try {
      const base64Image = await fetchImageAsBase64(card.imageUrl);
      if (!base64Image) continue;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image
                }
              },
              {
                text: `이 이미지는 모의투자 게임의 정보 카드입니다. 카드 ID는 "${card.cardId}"입니다.
이 정보 카드의 내용을 분석하여 투자 판단에 어떤 도움이 되는지 2-3문장으로 요약해주세요.
주가 상승/하락 힌트가 있다면 언급해주세요. 한국어로 답변해주세요.`
              }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 256,
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          results[card.cardId] = text;
        }
      }
    } catch (error) {
      console.error(`카드 ${card.cardId} 분석 실패:`, error);
    }
  }

  return results;
};

export const analyzeTeamPerformance = async (input: AnalysisInput): Promise<AnalysisReport> => {
  const { transactionHistory = [], unlockedCards, maxRounds } = input;

  // 정보카드 기반 투자 vs 협상 투자 분석
  const investmentAnalysis = analyzeInvestmentDecisions(transactionHistory, unlockedCards, maxRounds);

  // 정보카드 이미지 분석 (API 키가 있을 때만)
  let cardImageAnalysis: { [cardId: string]: string } = {};
  if (GEMINI_API_KEY) {
    const infoCardImages = getInfoCardImageUrls(unlockedCards);
    cardImageAnalysis = await analyzeInfoCardImages(infoCardImages, maxRounds);
  }

  if (!GEMINI_API_KEY) {
    // API 키가 없으면 샘플 분석 결과 반환
    return generateSampleAnalysis(input, investmentAnalysis);
  }

  try {
    const prompt = buildAnalysisPrompt(input, investmentAnalysis, cardImageAnalysis);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return parseAnalysisResponse(text, input, investmentAnalysis);
  } catch (error) {
    console.error('Gemini API 호출 실패:', error);
    return generateSampleAnalysis(input, investmentAnalysis);
  }
};

const buildAnalysisPrompt = (
  input: AnalysisInput,
  investmentAnalysis: { withInfoCard: string[]; withoutInfoCard: string[]; details: { stockId: string; hasCard: boolean; cardRounds: number[]; buyRound: number }[] },
  cardImageAnalysis: { [cardId: string]: string }
): string => {
  const { teamNumber, teamName, unlockedCards, roundResults, finalCash, stockPrices, maxRounds } = input;

  const lastResult = roundResults[roundResults.length - 1];
  const cumulativeRate = lastResult?.cumulativeProfitRate || 0;

  // 카드 카테고리 분석
  const cardCategories = unlockedCards.reduce((acc, cardId) => {
    const category = parseInt(cardId.split('-')[0]);
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as { [key: number]: number });

  // 정보카드 이미지 분석 결과 포맷팅
  let imageAnalysisText = '';
  if (Object.keys(cardImageAnalysis).length > 0) {
    imageAnalysisText = `
### 정보카드 내용 분석 결과
${Object.entries(cardImageAnalysis).map(([cardId, analysis]) => {
  const [category, stockIdx] = cardId.split('-').map(Number);
  const stockId = STOCK_INDEX_TO_ID[stockIdx];
  const categoryName = category === 0 ? '업종정보' : `${category}R 정보`;
  return `- ${stockId}사 ${categoryName}: ${analysis}`;
}).join('\n')}`;
  }

  return `
당신은 모의투자 게임의 투자 전략 분석가입니다. 아래 팀의 투자 결과를 분석하고 피드백을 제공해주세요.
특히, 정보카드를 보유하고 투자한 종목과 협상을 통해 정보를 얻어 투자한 종목을 구분하여 분석해주세요.

## ${teamName} (Team ${teamNumber}) 투자 분석 요청

### 게임 설정
- 총 라운드: ${maxRounds}R
- 시드머니: 1,000만원

### 정보 카드 보유 현황
- 총 ${unlockedCards.length}개의 정보 카드 보유
- 업종정보: ${cardCategories[0] || 0}개
${Array.from({ length: maxRounds }, (_, i) => `- ${i + 1}R 정보: ${cardCategories[i + 1] || 0}개`).join('\n')}

### 투자 결정 분석 (중요!)
**정보카드를 보유하고 투자한 종목**: ${investmentAnalysis.withInfoCard.length > 0 ? investmentAnalysis.withInfoCard.join(', ') + '사' : '없음'}
**정보카드 없이 (협상으로) 투자한 종목**: ${investmentAnalysis.withoutInfoCard.length > 0 ? investmentAnalysis.withoutInfoCard.join(', ') + '사' : '없음'}

투자 상세:
${investmentAnalysis.details.map(d => {
  if (d.hasCard) {
    return `- ${d.stockId}사 (R${d.buyRound} 매수): 정보카드 보유 (카테고리: ${d.cardRounds.join(', ')})`;
  } else {
    return `- ${d.stockId}사 (R${d.buyRound} 매수): 정보카드 미보유 → 협상으로 정보 획득 추정`;
  }
}).join('\n')}
${imageAnalysisText}

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
  "infoCardAnalysis": [
    "정보카드 기반 투자에 대한 피드백1",
    "협상으로 얻은 정보 기반 투자에 대한 피드백2",
    "정보 활용 전략에 대한 종합 피드백3"
  ],
  "overallScore": 1-100 사이의 점수
}

**특히 infoCardAnalysis에서는:**
1. 정보카드를 보유하고 투자한 종목의 결과 분석
2. 협상으로 정보를 얻어 투자한 종목의 결과 분석 (정보카드 없이 투자한 경우)
3. 정보 카드 내용과 실제 투자 결정의 일치도 평가
`;
};

const parseAnalysisResponse = (
  text: string,
  input: AnalysisInput,
  investmentAnalysis: { withInfoCard: string[]; withoutInfoCard: string[]; details: { stockId: string; hasCard: boolean; cardRounds: number[]; buyRound: number }[] }
): AnalysisReport => {
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
        infoCardAnalysis: parsed.infoCardAnalysis || [],
        overallScore: Math.min(100, Math.max(0, parsed.overallScore || 50)),
        timestamp: new Date().toISOString()
      };
    }
  } catch (e) {
    console.error('분석 결과 파싱 실패:', e);
  }

  return generateSampleAnalysis(input, investmentAnalysis);
};

const generateSampleAnalysis = (
  input: AnalysisInput,
  investmentAnalysis: { withInfoCard: string[]; withoutInfoCard: string[]; details: { stockId: string; hasCard: boolean; cardRounds: number[]; buyRound: number }[] }
): AnalysisReport => {
  const { teamName, unlockedCards, roundResults } = input;
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
  const infoCardAnalysis: string[] = [];

  // 수익률 분석
  if (cumulativeRate > 20) {
    strengths.push('높은 수익률을 달성했습니다.');
  } else if (cumulativeRate > 0) {
    strengths.push('안정적인 양의 수익을 기록했습니다.');
  } else {
    weaknesses.push('손실이 발생했습니다. 리스크 관리가 필요합니다.');
  }

  // 정보 카드 기반 투자 분석
  if (investmentAnalysis.withInfoCard.length > 0) {
    infoCardAnalysis.push(
      `정보카드를 보유하고 투자한 종목: ${investmentAnalysis.withInfoCard.join(', ')}사. 정보에 기반한 합리적인 투자 결정이었습니다.`
    );
    strengths.push(`${investmentAnalysis.withInfoCard.length}개 종목에 대해 정보카드를 활용하여 투자했습니다.`);
  }

  // 협상 기반 투자 분석
  if (investmentAnalysis.withoutInfoCard.length > 0) {
    infoCardAnalysis.push(
      `정보카드 없이 투자한 종목: ${investmentAnalysis.withoutInfoCard.join(', ')}사. 다른 팀과의 협상을 통해 정보를 획득한 것으로 추정됩니다.`
    );
    if (investmentAnalysis.withoutInfoCard.length > investmentAnalysis.withInfoCard.length) {
      weaknesses.push('협상에 의존한 투자 비중이 높습니다. 직접 정보를 확보하는 전략도 고려해보세요.');
    } else {
      strengths.push('협상을 통한 정보 수집 능력이 좋습니다.');
    }
  }

  // 정보 활용 종합 분석
  const totalInvested = investmentAnalysis.withInfoCard.length + investmentAnalysis.withoutInfoCard.length;
  if (totalInvested > 0) {
    const infoCardRatio = (investmentAnalysis.withInfoCard.length / totalInvested) * 100;
    infoCardAnalysis.push(
      `총 ${totalInvested}개 종목 투자 중 ${investmentAnalysis.withInfoCard.length}개(${infoCardRatio.toFixed(0)}%)는 정보카드 기반, ${investmentAnalysis.withoutInfoCard.length}개(${(100 - infoCardRatio).toFixed(0)}%)는 협상 기반 투자입니다.`
    );
  }

  // 정보 카드 수 분석
  if (cardCount >= 10) {
    strengths.push('많은 정보 카드를 확보하여 충분한 정보를 바탕으로 투자했습니다.');
  } else if (cardCount < 5) {
    weaknesses.push('정보 카드 확보가 부족했습니다. 미니게임에서 더 좋은 성과를 내세요.');
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
  recommendations.push('미니게임을 통해 정보 열람권을 적극 확보하세요.');
  if (investmentAnalysis.withoutInfoCard.length > 0) {
    recommendations.push('협상 시 정보의 신뢰도를 꼭 확인하세요. 잘못된 정보에 속을 수 있습니다.');
  }
  if (cumulativeRate < 0) {
    recommendations.push('손실 발생 시 손절매 기준을 설정하여 큰 손실을 방지하세요.');
  }

  return {
    summary: `${teamName}은(는) 총 ${roundResults.length}라운드 동안 ${cardCount}개의 정보 카드를 활용하여 ${cumulativeRate >= 0 ? '+' : ''}${cumulativeRate.toFixed(1)}%의 누적 수익률을 달성했습니다. ${investmentAnalysis.withInfoCard.length}개 종목은 정보카드 기반, ${investmentAnalysis.withoutInfoCard.length}개 종목은 협상을 통해 투자했습니다.`,
    strengths,
    weaknesses,
    recommendations,
    infoCardAnalysis,
    overallScore: Math.round(score),
    timestamp: new Date().toISOString()
  };
};

export default analyzeTeamPerformance;
