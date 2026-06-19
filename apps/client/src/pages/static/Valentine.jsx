import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const Valentine = () => {
  const [isAccepted, setIsAccepted] = useState(false);
  const [noBtnPos, setNoBtnPos] = useState({ position: 'relative' });
  const [hearts, setHearts] = useState([]);
  const containerRef = useRef(null);

  // Background floating hearts
  useEffect(() => {
    const interval = setInterval(() => {
      const id = Date.now() + Math.random();
      const newHeart = {
        id,
        left: Math.random() * 100 + 'vw',
        size: Math.random() * 20 + 20 + 'px',
        duration: Math.random() * 5 + 5 + 's',
      };
      setHearts((prev) => [...prev, newHeart]);

      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== id));
      }, 8000);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const moveNoBtn = () => {
    if (!containerRef.current) return;

    // Dimensions of the card (the container)
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    // Estimates for button size
    const btnWidth = 150;
    const btnHeight = 60;
    const padding = 20;

    // Calculate the maximum possible coordinates within the card
    const maxX = containerWidth - btnWidth - padding;
    const maxY = containerHeight - btnHeight - padding;

    // Generate random positions relative to the card
    const x = Math.min(maxX, Math.max(padding, Math.random() * maxX));
    const y = Math.min(maxY, Math.max(padding, Math.random() * maxY));

    setNoBtnPos({
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      right: 'auto',
      bottom: 'auto',
      zIndex: 50,
      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    });
  };

  const [celebration, setCelebration] = useState([]);

  const handleYes = () => {
    setIsAccepted(true);
    // Create professional party celebration elements
    const newCelebration = [];
    for (let i = 0; i < 150; i++) {
      newCelebration.push({
        id: i,
        x: Math.random() * 100 + 'vw',
        y: Math.random() * 100 + 'vh',
        color: [
          '#ff4d6d',
          '#ff758f',
          '#c9184a',
          '#ffb3c1',
          '#ffd43b',
          '#69db7c',
          '#4dabf7',
          '#748ffc',
        ][Math.floor(Math.random() * 8)],
        delay: Math.random() * 3 + 's',
        size: Math.random() * 12 + 6 + 'px',
        rotation: Math.random() * 360 + 'deg',
        duration: Math.random() * 2 + 2 + 's',
      });
    }
    setCelebration(newCelebration);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff0f3] via-[#ffccd5] to-[#fff0f3] overflow-hidden flex items-center justify-center font-['Dancing_Script',cursive] relative select-none">
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&display=swap');`}
      </style>

      {/* Dynamic Romantic Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.4)_0%,transparent_100%)]" />
        {hearts.map((heart) => (
          <div
            key={heart.id}
            className="absolute text-[#ff4d6d] opacity-20 animate-valentine-float flex flex-col items-center"
            style={{
              left: heart.left,
              fontSize: heart.size,
              animationDuration: heart.duration,
              bottom: '-10%',
            }}
          >
            {Math.random() > 0.5 ? '❤️' : '🌹'}
            <div className="w-1 h-1 bg-white rounded-full blur-[1px] mt-1 opacity-50" />
          </div>
        ))}
      </div>

      {!isAccepted ? (
        <div
          ref={containerRef}
          className={cn(
            'relative z-10 text-center p-8 md:p-16 bg-white/40 backdrop-blur-2xl rounded-[40px] md:rounded-[60px] border-[4px] md:border-[6px] border-white/80 shadow-[0_20px_60px_rgba(255,77,109,0.25)] w-[calc(100vw-32px)] max-w-xl transition-all duration-1000 overflow-hidden min-h-[450px] md:min-h-[500px] flex flex-col justify-center items-center',
            isAccepted
              ? 'scale-[2] opacity-0 blur-xl'
              : 'scale-100 opacity-100',
          )}
        >
          {/* Decorative Corner Icons */}
          <div className="absolute top-4 left-4 md:top-6 md:left-6 text-2xl md:text-3xl opacity-40">
            ✨
          </div>
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 text-2xl md:text-3xl opacity-40">
            💖
          </div>

          <div className="mb-4 md:mb-6 inline-block p-3 md:p-4 bg-pink-50 rounded-full animate-bounce">
            <span className="text-4xl md:text-5xl">💌</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl text-[#c9184a] mb-4 md:mb-6 font-['Great_Vibes',cursive] animate-valentine-heartbeat font-bold leading-tight">
            My Dearest...
          </h1>

          <p className="text-2xl md:text-3xl lg:text-4xl text-[#ff758f] mb-8 md:mb-12 font-semibold">
            Will you be my Valentine?
          </p>

          <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12 w-full">
            <Button
              variant="ghost"
              onClick={handleYes}
              className="group relative px-10 md:px-14 py-4 md:py-5 text-2xl md:text-4xl font-bold bg-[#ff4d6d] text-white rounded-full shadow-[0_10px_30px_rgba(255,77,109,0.4)] hover:scale-110 md:hover:scale-125 hover:bg-[#c9184a] transition-all duration-500 ring-4 md:ring-8 ring-pink-100/50 active:scale-95 z-20 overflow-hidden w-full md:w-auto"
            >
              <span className="relative z-10 font-['Great_Vibes',cursive]">
                Yes, Forever
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Button>

            <Button
              variant="ghost"
              id="noBtn"
              onMouseEnter={moveNoBtn}
              onClick={moveNoBtn}
              style={noBtnPos}
              className="px-8 md:px-10 py-3 md:py-4 text-xl md:text-2xl font-bold bg-white/80 text-[#ff4d6d] rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out border-2 border-pink-100 whitespace-nowrap z-10 opacity-80 hover:opacity-100 flex items-center justify-center gap-2 w-full md:w-auto mt-2 md:mt-0"
            >
              <span>No</span>
              <span className="text-lg md:text-xl">😢</span>
            </Button>
          </div>

          <div className="mt-8 md:mt-12 text-[#ff758f] opacity-60 text-base md:text-xl tracking-widest font-sans text-center">
            CLICK YES TO OPEN YOUR SURPRISE
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center text-center p-4 md:p-8 bg-gradient-to-b from-[#fff0f3] to-[#ffccd5] animate-valentine-fade-in overflow-hidden">
          {/* Enhanced Celebration */}
          {celebration.map((p) => (
            <div
              key={p.id}
              className="absolute pointer-events-none animate-valentine-celebrate"
              style={{
                left: p.x,
                top: '-10%',
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '3px',
                transform: `rotate(${p.rotation})`,
                animationDelay: p.delay,
                animationDuration: p.duration,
                boxShadow: `0 0 10px ${p.color}`,
              }}
            >
              {Math.random() > 0.8 && (
                <span className="text-white opacity-40">✨</span>
              )}
            </div>
          ))}

          <div className="relative z-10 animate-valentine-party-reveal flex flex-col items-center w-full">
            {/* Glowing Aura */}
            <div className="absolute -inset-10 md:-inset-20 bg-gradient-to-r from-pink-300/40 via-red-300/40 to-pink-300/40 blur-[40px] md:blur-[80px] rounded-full animate-pulse" />

            <div className="relative p-2 md:p-3 bg-white rounded-[30px] md:rounded-[50px] shadow-[0_20px_60px_rgba(255,77,109,0.5)] transform hover:rotate-2 transition-transform duration-500 w-[95%] max-w-sm md:max-w-none">
              <img
                src="https://res.cloudinary.com/dzfcf4sqf/image/upload/v1771002943/IMG_5955_smytwn.jpg"
                alt="Our Love"
                className="w-full h-auto max-h-[55vh] md:max-h-[70vh] rounded-[24px] md:rounded-[40px] border-[6px] md:border-[10px] border-white relative z-20 object-cover"
              />
              {/* Photo Caption Label */}
              <div className="absolute -bottom-4 -right-2 md:-bottom-6 md:-right-6 bg-[#c9184a] text-white px-5 md:px-8 py-2 md:py-3 rounded-full text-xl md:text-2xl font-bold shadow-xl rotate-3 z-30 font-['Great_Vibes',cursive]">
                You & Me ❤️
              </div>
            </div>
          </div>

          <div className="mt-8 md:mt-12 relative z-30 flex flex-col items-center px-4">
            <h2 className="text-4xl md:text-6xl lg:text-8xl text-[#c9184a] animate-valentine-party-text font-bold leading-tight drop-shadow-[0_4px_4px_rgba(0,0,0,0.1)] font-['Great_Vibes',cursive]">
              I Love You More Than Words!
            </h2>
            <p className="text-xl md:text-3xl lg:text-4xl text-[#ff4d6d] mt-4 opacity-0 animate-valentine-slide-up animation-delay-1000 font-semibold">
              Happy Valentine's Day, My Queen 👑
            </p>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .animation-delay-1000 { animation-delay: 1s; animation-fill-mode: forwards; }
        
        @keyframes valentine-float {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 0; }
          10% { opacity: 0.25; }
          50% { transform: translateY(-50vh) rotate(180deg) scale(1.2); }
          90% { opacity: 0.25; }
          100% { transform: translateY(-110vh) rotate(360deg) scale(0.8); opacity: 0; }
        }
        .animate-valentine-float {
          animation: valentine-float linear infinite;
        }
        @keyframes valentine-heartbeat {
          0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(201, 24, 74, 0)); }
          50% { transform: scale(1.03); filter: drop-shadow(0 0 20px rgba(201, 24, 74, 0.2)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(201, 24, 74, 0)); }
        }
        .animate-valentine-heartbeat {
          animation: valentine-heartbeat 2s ease-in-out infinite;
        }
        @keyframes valentine-fade-in {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(10px); }
        }
        .animate-valentine-fade-in {
          animation: valentine-fade-in 1s ease-out forwards;
        }
        @keyframes valentine-pop {
          0% { transform: scale(0.3) rotate(-10deg) translateY(100px); opacity: 0; }
          70% { transform: scale(1.05) rotate(5deg) translateY(-20px); opacity: 1; }
          100% { transform: scale(1) rotate(0deg) translateY(0); opacity: 1; }
        }
        .animate-valentine-pop {
          animation: valentine-pop 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes valentine-celebrate {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(1080deg); opacity: 0; }
        }
        .animate-valentine-celebrate {
          animation: valentine-celebrate 4s cubic-bezier(0.1, 0, 0.9, 1) infinite;
        }
        @keyframes valentine-party-reveal {
          0% { transform: translateY(100px) scale(0.8); opacity: 0; filter: blur(20px); }
          100% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0px); }
        }
        .animate-valentine-party-reveal {
          animation: valentine-party-reveal 1.2s ease-out forwards;
        }
        @keyframes valentine-party-text {
          0% { transform: scale(0.5); opacity: 0; }
          80% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-valentine-party-text {
          animation: valentine-party-text 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.6s forwards;
        }
        @keyframes valentine-slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-valentine-slide-up {
          animation: valentine-slide-up 1s ease-out forwards;
        }
      `,
        }}
      />
    </div>
  );
};

export default Valentine;
