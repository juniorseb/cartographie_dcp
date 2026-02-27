import { cn } from '@/utils/cn';

const FORM_PARTS = [
  { step: 1, label: 'Identification' },
  { step: 2, label: 'Contact & Localisation' },
  { step: 3, label: 'Protection des données' },
  { step: 4, label: 'Traitements' },
  { step: 5, label: 'Sécurité' },
];

interface FormStepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export default function FormStepper({ currentStep, onStepClick }: FormStepperProps) {
  return (
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
            <div className="step-circle">{step}</div>
            <div className="text-xs font-semibold hidden sm:block">{label}</div>
          </div>
        );
      })}
    </div>
  );
}
