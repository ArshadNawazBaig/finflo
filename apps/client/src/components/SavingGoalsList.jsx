import {
  PiggyBank,
  Target,
  Calendar,
  Plus,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPKR } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const SavingGoalsList = ({
  goals = [],
  onAddGoal,
  onDeleteGoal,
  onContribute,
}) => {
  return (
    <div className="space-y-6 sm:space-y-8 h-full flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-black tracking-tighter">Savings Goals</h3>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            Track your progress towards your financial dreams
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-full gap-2 text-xs font-bold px-5 h-10 border-dashed border-2"
          onClick={onAddGoal}
        >
          <Plus size={14} strokeWidth={3} />
          New Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-muted/20 rounded-[2.5rem] border border-dashed border-border/60 text-center">
          <div className="p-5 bg-card rounded-3xl shadow-sm mb-4">
            <PiggyBank className="text-muted-foreground/40" size={40} />
          </div>
          <p className="font-bold text-muted-foreground/60 mb-1">
            No goals set yet
          </p>
          <p className="text-xs text-muted-foreground/40 max-w-[200px]">
            Save for a car, emergency fund, or travel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 flex-1 overflow-y-auto pr-2 max-h-[500px] scrollbar-hide">
          {goals.map((goal) => (
            <div
              key={goal._id}
              className="p-6 rounded-[2rem] border border-border/50 bg-card hover:bg-muted/10 transition-all group relative overflow-hidden"
            >
              {/* Progress Background */}
              <div
                className="absolute bottom-0 left-0 h-1.5 bg-primary/20 transition-all duration-1000"
                style={{ width: `${goal.progress}%` }}
              />

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                    <Target size={20} />
                  </div>
                  <div>
                    <h4 className="font-black tracking-tight text-lg">
                      {goal.title}
                    </h4>
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mt-1">
                      {goal.category}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteGoal(goal._id)}
                  className="p-2 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">
                      Current Balance
                    </p>
                    <p className="text-xl font-black tracking-tighter">
                      {formatPKR(goal.currentAmount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">
                      Target
                    </p>
                    <p className="font-bold">{formatPKR(goal.targetAmount)}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-primary">
                      {goal.progress}% Complete
                    </span>
                    {goal.deadline && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar size={10} />
                        <span>
                          {new Date(goal.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <Progress value={goal.progress} className="h-1.5" />
                </div>

                <Button
                  variant="ghost"
                  className="w-full rounded-2xl h-10 text-xs font-black uppercase tracking-widest bg-muted/30 hover:bg-primary hover:text-white transition-all border border-border/20"
                  onClick={() => onContribute(goal)}
                >
                  Contribute Funds
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavingGoalsList;
