import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const fallbackReviews = [
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

// Generate a consistent color from a name string
const getInitialColor = (name) => {
  const colors = [
    'from-indigo-500 to-violet-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-blue-500 to-cyan-600',
    'from-purple-500 to-fuchsia-600',
    'from-lime-500 to-green-600',
    'from-red-500 to-rose-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const Testimonials = () => {
  const [reviews, setReviews] = useState(fallbackReviews);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Fetch real reviews from API
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const apiBase =
          import.meta.env.VITE_API_URL ||
          (window.location.hostname === 'finflo.org'
            ? 'https://app.finflo.org/api'
            : '/api');

        const res = await fetch(`${apiBase}/reviews/public`);
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
          // Map API reviews to the display format
          const apiReviews = data.data.map((r, idx) => ({
            id: r._id || idx + 1,
            name: r.reviewerName,
            role: `${r.reviewerRole}${r.businessName ? ` at ${r.businessName}` : ''}`,
            content: r.content,
            rating: r.rating,
            // No image for real reviews — we'll use initials
            image: null,
          }));
          // Show real reviews first, then pad with fallbacks if needed
          if (apiReviews.length >= 3) {
            setReviews(apiReviews);
          } else {
            setReviews([...apiReviews, ...fallbackReviews.slice(0, 10 - apiReviews.length)]);
          }
        }
      } catch {
        // API unavailable — keep fallback reviews
      }
    };
    fetchReviews();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [currentIndex, reviews.length]);

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
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.96,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.96,
    }),
  };

  const review = reviews[currentIndex];

  return (
    <section className="py-28 lg:py-36 bg-slate-50/50 dark:bg-white/[0.01] relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-primary/[0.03] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-violet-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Trusted Voices
          </p>
          <h2 className="text-4xl lg:text-[3.5rem] font-extrabold tracking-[-0.035em] leading-[0.95] text-slate-900 dark:text-white">
            What our users{' '}
            <span className="text-gradient-primary">
              are saying
            </span>
          </h2>
        </motion.div>

        {/* Testimonial card */}
        <div className="relative max-w-3xl mx-auto min-h-[340px] flex items-center justify-center">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 350, damping: 35 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.3 },
              }}
              className="absolute w-full px-4"
            >
              <div className="relative bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] p-8 md:p-12 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-sm">
                {/* Quote icon */}
                <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/10 rotate-180" />

                <div className="flex flex-col items-center text-center space-y-6">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full ring-2 ring-slate-100 dark:ring-white/10 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 overflow-hidden">
                    {review.image ? (
                      <img
                        src={review.image}
                        alt={review.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-full h-full bg-gradient-to-br ${getInitialColor(review.name)} flex items-center justify-center text-white font-bold text-lg`}
                      >
                        {getInitials(review.name)}
                      </div>
                    )}
                  </div>

                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 text-amber-400 fill-amber-400"
                      />
                    ))}
                    {[...Array(5 - review.rating)].map((_, i) => (
                      <Star
                        key={`empty-${i}`}
                        className="w-4 h-4 text-slate-200 dark:text-slate-700"
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-lg md:text-xl font-normal text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                    "{review.content}"
                  </p>

                  {/* Author */}
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                      {review.name}
                    </h4>
                    <p className="text-sm font-normal text-slate-400">
                      {review.role}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-14 w-10 h-10 rounded-full bg-white dark:bg-white/[0.05] border border-slate-100 dark:border-white/[0.06] shadow-sm flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-all z-20"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-14 w-10 h-10 rounded-full bg-white dark:bg-white/[0.05] border border-slate-100 dark:border-white/[0.06] shadow-sm flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-all z-20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mt-10">
          {reviews.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'w-6 bg-primary'
                  : 'w-1.5 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
