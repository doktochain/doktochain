import { CheckCircle } from 'lucide-react';

type Step = 'service' | 'method' | 'location' | 'datetime' | 'questionnaire' | 'consent' | 'payment' | 'review' | 'confirmation';

interface BookingStepIndicatorProps {
  steps: { key: Step; label: string; icon: React.ElementType }[];
  currentStep: Step;
  hiddenSteps?: Step[];
}

export default function BookingStepIndicator({ steps, currentStep, hiddenSteps = [] }: BookingStepIndicatorProps) {
  const visibleSteps = steps.filter(s => !hiddenSteps.includes(s.key));

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {visibleSteps.map((step, index) => {
          const isCurrent = step.key === currentStep;
          const isCompleted = visibleSteps.findIndex(s => s.key === currentStep) > index;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-sky-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className="text-xs mt-2 text-center">{step.label}</span>
              </div>
              {index < visibleSteps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
