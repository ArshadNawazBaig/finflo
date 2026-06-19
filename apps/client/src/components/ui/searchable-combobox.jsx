import React, { useState } from 'react';
import { Check, ChevronsUpDown, Search, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function SearchableCombobox({
  options = [],
  value,
  onChange,
  onDelete,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No option found.',
  className,
  disabled = false,
  allowCustom = false,
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = React.useMemo(() => {
    const existing = options.find((opt) => opt.value === value);
    if (existing) return existing;
    if (allowCustom && value) {
      return { value, label: value.charAt(0).toUpperCase() + value.slice(1) };
    }
    return null;
  }, [options, value, allowCustom]);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [options, searchQuery]);

  const showAddCustom = React.useMemo(() => {
    if (!allowCustom || !searchQuery) return false;
    return !options.some(
      (opt) => opt.label.toLowerCase() === searchQuery.trim().toLowerCase(),
    );
  }, [allowCustom, searchQuery, options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between h-14 rounded-2xl bg-muted/20 border-border/40 font-bold text-sm capitalize',
            !selectedOption && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-2xl border border-border/40 bg-popover backdrop-blur-none overflow-hidden shadow-xl z-[9999]">
        <div className="flex flex-col h-full max-h-[300px]">
          <div className="flex items-center border-b px-3 border-border/40 sticky top-0 bg-popover z-10 shrink-0">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-foreground" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              autoFocus // Focus the input when popover opens
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 outline-none focus:ring-0 focus:border-0 focus-visible:!outline-none focus-visible:ring-0 focus-visible:border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar p-1">
            {filteredOptions.length === 0 && !showAddCustom ? (
              <p className="py-6 text-center text-sm text-muted-foreground font-medium">
                {emptyText}
              </p>
            ) : (
              <div className="flex flex-col gap-1 w-full">
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className="group relative flex w-full items-center"
                  >
                    <button
                      type="button"
                      className={cn(
                        'relative flex flex-1 cursor-default select-none items-center rounded-xl py-2 pl-8 pr-10 text-sm font-medium outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent hover:text-accent-foreground text-left',
                        value === option.value &&
                          'bg-accent/50 font-bold text-accent-foreground',
                      )}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                        setSearchQuery(''); // Reset search when selected
                      }}
                    >
                      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check
                          className={cn(
                            'h-4 w-4',
                            value === option.value
                              ? 'opacity-100 text-primary'
                              : 'opacity-0',
                          )}
                        />
                      </span>
                      {option.label}
                    </button>
                    {onDelete && option.deletable && (
                      <button
                        type="button"
                        className="absolute right-2 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all z-20"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(option.value);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}

                {showAddCustom && (
                  <div className="p-1 mt-1 border-t border-border/10">
                    <button
                      type="button"
                      className={cn(
                        'relative flex w-full cursor-default select-none items-center rounded-xl py-3 pl-10 pr-4 text-xs font-black uppercase tracking-widest outline-none transition-all duration-300 bg-primary/5 hover:bg-primary/10 text-primary group',
                      )}
                      onClick={() => {
                        const newValue = searchQuery.trim().toLowerCase();
                        onChange(newValue);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <div className="absolute left-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Plus className="h-3 w-3" />
                      </div>
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-[10px] opacity-70">
                          Create New Classification
                        </span>
                        <span className="text-sm font-black lowercase truncate max-w-[200px]">
                          "{searchQuery.trim()}"
                        </span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
