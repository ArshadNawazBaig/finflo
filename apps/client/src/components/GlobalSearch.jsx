import { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Loader2,
  User,
  FileText,
  Layout,
  Building2,
  HelpCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';

const GlobalSearch = ({ isMember = false, isCompact = false }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/search', {
        params: { q: query },
      });
      setResults(data.results);
      setIsOpen(true);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Customer':
        return <User className="w-4 h-4" />;
      case 'Member':
        return <User className="w-4 h-4 text-primary" />;
      case 'Loan':
        return <FileText className="w-4 h-4" />;
      case 'Branch':
        return <Building2 className="w-4 h-4" />;
      case 'Saving Goal':
        return <Layout className="w-4 h-4" />;
      case 'Staff':
        return <User className="w-4 h-4 text-amber-500" />;
      case 'Manager':
        return <User className="w-4 h-4 text-purple-500" />;
      case 'Support Ticket':
        return <HelpCircle className="w-4 h-4 text-blue-500" />;
      case 'Transaction':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
    }
  };

  return (
    <div
      className={cn('relative w-full', !isCompact && 'md:max-w-md')}
      ref={searchRef}
    >
      <div className="relative group">
        <Search
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors',
            isCompact && 'left-3 w-3 h-3 text-muted-foreground/40',
          )}
        />
        <input
          type="text"
          placeholder={isCompact ? 'Search...' : 'Search anything...'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className={cn(
            'w-full pl-10 pr-10 py-2 bg-accent/30 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-accent/50 transition-all text-sm',
            isCompact && 'pl-8 pr-4 py-1.5 rounded-full text-xs',
          )}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-full text-muted-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="fixed inset-x-4 top-[72px] sm:absolute sm:inset-x-0 sm:top-full sm:mt-2 bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-2 space-y-2 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl"
                  >
                    <div className="w-10 h-10 bg-accent/50 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-accent/50 rounded-md w-3/4" />
                      <div className="h-3 bg-accent/20 rounded-md w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="p-12 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-accent/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border/50 shadow-inner">
                  <Search className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">
                  No results matching "{query}"
                </h3>
                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                  We couldn't find anything matching your search. Try checking
                  for typos or using broader keywords.
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {results.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}-${index}`}
                    onClick={() => {
                      navigate(result.url);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left group"
                  >
                    <div className="p-2 bg-accent rounded-lg group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate group-hover:text-primary transition-colors capitalize">
                        {result.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate flex items-center gap-2 uppercase tracking-widest font-black">
                        {getIcon(result.type)} {result.type} • {result.subtitle}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
