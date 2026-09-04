import { Button } from './ui/button';

export const BirthdayCelebration = ({ name, onClose }) => (
  <div className="view-enter fixed inset-0 z-[30000] flex items-center justify-center backdrop-blur-md" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
    <div className="p-10 text-center">
      <div className="birthday-float mb-5 text-8xl">🎂</div>
      <h1 className="mb-2.5 text-3xl text-white">Parabéns, {name}! 🥳</h1>
      <p className="mb-8 text-lg text-white/70">A equipe Kairós deseja-te um dia incrível!</p>
      <Button onClick={onClose} size="lg" className="px-8">Obrigado!</Button>
    </div>
    <style>{`
      @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }
      .birthday-float { animation: float 3s ease-in-out infinite; }
    `}</style>
  </div>
);
