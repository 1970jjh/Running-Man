
import React, { useState } from 'react';
import { Team } from '../types';
import { INITIAL_SEED_MONEY } from '../constants';

interface TeamSetupFormProps {
  onSubmit: (team: Team) => void;
}

const TeamSetupForm: React.FC<TeamSetupFormProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [target, setTarget] = useState(20000000);
  const [philosophy, setPhilosophy] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('회사명을 입력하세요.');
    
    onSubmit({
      id: Math.random().toString(36).substr(2, 9),
      name,
      targetAmount: target,
      philosophy,
      currentCash: INITIAL_SEED_MONEY,
      portfolio: {},
      results: {}
    });
  };

  return (
    <div className="flex-1 p-6 flex flex-col items-center justify-center bg-white">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-xl mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <h2 className="text-2xl font-black text-slate-800">투자 회사 설립</h2>
          <p className="text-slate-500 text-sm">성공적인 모의 투자를 위한 회사 정보를 입력하세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-2">회사명</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 미래투자파트너스"
              className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-2">목표 금액 (원)</label>
            <input
              type="number"
              required
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase mb-2">경영 철학</label>
            <textarea
              value={philosophy}
              onChange={(e) => setPhilosophy(e.target.value)}
              placeholder="회사의 비전과 투자 원칙을 적어주세요."
              className="w-full px-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all h-32 font-semibold"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-lg"
          >
            설립 완료 및 시작하기
          </button>
        </form>
      </div>
    </div>
  );
};

export default TeamSetupForm;
