import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';

const reviews = [
  {
    id: 1,
    name: 'Sarah Jenkins',
    role: 'Small Business Owner',
    image: 'https://i.pravatar.cc/150?img=1',
    content:
      'FinFlo transformed how I manage my business finances. The approval process was incredibly fast!',
    rating: 5,
  },
  {
    id: 2,
    name: 'Michael Chen',
    role: 'Freelance Designer',
    image: 'https://i.pravatar.cc/150?img=11',
    content:
      'The P2P transfer feature is a game-changer. I can move funds instantly between my accounts.',
    rating: 5,
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    role: 'Real Estate Investor',
    image: 'https://i.pravatar.cc/150?img=5',
    content:
      'The ROI tracking on the member portal is fantastic. I can see my portfolio growth in real-time.',
    rating: 5,
  },
  {
    id: 4,
    name: 'David Kim',
    role: 'Tech Entrepreneur',
    image: 'https://i.pravatar.cc/150?img=3',
    content:
      'Bank-grade security was my top priority. FinFlo delivers that and more with its audit ledger.',
    rating: 5,
  },
  {
    id: 5,
    name: 'Lisa Patel',
    role: 'Retail Manager',
    image: 'https://i.pravatar.cc/150?img=9',
    content:
      'Customer support is top-notch. Any question I have is answered within minutes.',
    rating: 4,
  },
  {
    id: 6,
    name: 'James Wilson',
    role: 'Construction Lead',
    image: 'https://i.pravatar.cc/150?img=8',
    content:
      'Applying for a loan was seamless. The mobile app works perfectly in the field.',
    rating: 5,
  },
  {
    id: 7,
    name: 'Jessica Wong',
    role: 'E-commerce Seller',
    image: 'https://i.pravatar.cc/150?img=6',
    content:
      'The low interest rates and transparent fee structure made me switch to FinFlo.',
    rating: 5,
  },
  {
    id: 8,
    name: 'Robert Thompson',
    role: 'Restaurant Owner',
    image: 'https://i.pravatar.cc/150?img=12',
    content:
      'I appreciate the flexibility in repayment schedules. It really helps with cash flow management.',
    rating: 5,
  },
  {
    id: 9,
    name: 'Amanda Garcia',
    role: 'Marketing Consultant',
    image: 'https://i.pravatar.cc/150?img=20',
    content:
      'The dashboard is so intuitive. verifying my documents took less than 2 minutes.',
    rating: 5,
  },
  {
    id: 10,
    name: 'Thomas Anderson',
    role: 'Software Engineer',
    image: 'https://i.pravatar.cc/150?img=60',
    content:
      "As a developer, I'm impressed by the platform's responsiveness and modern UI. Very well built.",
    rating: 5,
  },
];

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  const nextSlide = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.5,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.5,
    }),
  };

  return (
    <section className="py-24 bg-white dark:bg-[#020617] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary">
            Trusted Voices
          </h2>
          <h3 className="text-4xl lg:text-[3.5rem] font-black tracking-tighter leading-none dark:text-white">
            What our Users <br />
            <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500">
              Are Saying.
            </span>
          </h3>
        </div>

        <div className="relative max-w-4xl mx-auto h-[400px] flex items-center justify-center">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="absolute w-full px-4"
            >
              <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-8 md:p-12 rounded-[2.5rem] shadow-xl backdrop-blur-sm relative">
                <Quote className="absolute top-8 left-8 w-12 h-12 text-primary/10 rotate-180" />

                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-br from-primary to-indigo-500">
                    <img
                      src={reviews[currentIndex].image}
                      alt={reviews[currentIndex].name}
                      className="w-full h-full rounded-full object-cover border-4 border-white dark:border-slate-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-center gap-1">
                      {[...Array(reviews[currentIndex].rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 text-amber-500 fill-amber-500"
                        />
                      ))}
                    </div>
                    <p className="text-lg md:text-xl font-medium text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl">
                      "{reviews[currentIndex].content}"
                    </p>
                  </div>

                  <div>
                    <h4 className="text-lg font-black dark:text-white">
                      {reviews[currentIndex].name}
                    </h4>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">
                      {reviews[currentIndex].role}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 w-12 h-12 rounded-full bg-white dark:bg-white/10 shadow-lg flex items-center justify-center text-slate-900 dark:text-white hover:scale-110 transition-transform z-20"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 w-12 h-12 rounded-full bg-white dark:bg-white/10 shadow-lg flex items-center justify-center text-slate-900 dark:text-white hover:scale-110 transition-transform z-20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="flex justify-center gap-2 mt-8">
          {reviews.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'w-8 bg-primary'
                  : 'bg-slate-300 dark:bg-white/20 hover:bg-primary/50'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
