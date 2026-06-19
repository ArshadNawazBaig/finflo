import { Check, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PricingCard = ({
  title,
  price,
  description,
  features,
  current,
  onSubscribe,
  loading,
}) => {
  return (
    <Card
      className={`relative flex flex-col ${current ? 'border-primary ring-1 ring-primary' : ''}`}
    >
      {current && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
          Current Plan
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
        <div className="mt-4">
          <span className="text-3xl sm:text-4xl font-bold">
            {formatCurrency(price)}
          </span>
          <span className="text-muted-foreground">/month</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-500" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          variant="ghost"
          onClick={onSubscribe}
          disabled={current || loading}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
            ${
              current
                ? 'bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted hover:text-muted-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }
          `}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {current ? 'Current Plan' : 'Subscribe'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PricingCard;
