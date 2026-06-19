import { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  User,
  FileText,
  Layout,
  Building2,
  HelpCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SearchResultsMenu from '@/components/ui/SearchResultsMenu';

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
        <Input
          type="text"
          placeholder={isCompact ? 'Search...' : 'Search anything...'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className={cn(
            'pl-10 pr-10 py-2 bg-accent/30 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-accent/50 transition-all !text-[14px] h-auto',
            isCompact && 'pl-8 pr-4 py-1.5 rounded-full text-xs',
          )}
        />
        {query && (
          <Button
            variant="ghost"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-full text-muted-foreground"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <SearchResultsMenu
        open={isOpen && (query.length >= 2 || results.length > 0)}
        loading={loading}
        results={results}
        onSelect={(result) => {
          navigate(result.url);
          setIsOpen(false);
          setQuery('');
        }}
        getKey={(result, index) => `${result.type}-${result.id}-${index}`}
        getTitle={(result) => result.title}
        getSubtitle={(result) => `${result.type} • ${result.subtitle}`}
        renderLeading={(result) => (
          <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors">
            {getIcon(result.type)}
          </div>
        )}
        emptyMessage={`No results matching "${query}"`}
        className="fixed inset-x-4 top-[72px] sm:absolute sm:inset-x-0 sm:top-full sm:mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
      />
    </div>
  );
};

export default GlobalSearch;
