import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const TableSearch = ({ value, onChange, placeholder = 'Search...' }) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 w-[200px] sm:w-[300px] bg-background/50 border-border/50 focus:bg-background transition-all"
      />
    </div>
  );
};

export default TableSearch;
