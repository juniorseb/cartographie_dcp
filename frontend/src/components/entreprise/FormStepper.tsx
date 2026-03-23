import { cn } from '@/utils/cn';

const FORM_PARTS = [
  { step: 1, label: 'Identification' },
  { step: 2, label: 'Cadre juridique' },
  { step: 3, label: 'Registre & Traitements' },
  { step: 4, label: 'Sous-traitance & Transferts' },
  { step: 5, label: 'Sécurité' },
];

interface FormStepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  filledCount?: number;
  totalCount?: number;
}

export default function FormStepper({ currentStep, onStepClick, filledCount = 0, totalCount = 50 }: FormStepperProps) {
  const pct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  return (
    <div>
      {/* Barre de progression */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Progression : <strong>{pct}%</strong> ({filledCount}/{totalCount} questions)</span>
        </div>
        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: pct === 100 ? '#228B22' : '#FF8C00' }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="stepper">
        {FORM_PARTS.map(({ step, label }) => {
          const isCompleted = step < currentStep;
          const isActive = step === currentStep;

          return (
            <div
              key={step}
              className={cn('step cursor-pointer', isActive && 'active', isCompleted && 'completed')}
              onClick={() => onStepClick(step)}
            >
              <div className="step-circle">{isCompleted ? '✓' : step}</div>
              <div className="text-xs font-semibold hidden sm:block">{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
