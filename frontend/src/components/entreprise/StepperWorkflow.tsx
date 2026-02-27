import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Step {
  step: number;
  label: string;
  statut: 'completed' | 'active' | 'pending';
  description: string;
}

interface StepperWorkflowProps {
  steps: Step[];
}

export default function StepperWorkflow({ steps }: StepperWorkflowProps) {
  return (
    <div className="stepper">
      {steps.map(({ step, label, statut, description }) => (
        <div
          key={step}
          className={cn('step', statut === 'active' && 'active', statut === 'completed' && 'completed')}
        >
          <div className="step-circle">
            {statut === 'completed' ? <Check className="w-5 h-5" /> : step}
          </div>
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-xs text-gray-500 mt-1 hidden sm:block">{description}</div>
        </div>
      ))}
    </div>
  );
}
