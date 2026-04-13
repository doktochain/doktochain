import { useState } from 'react';
import { toast } from 'sonner';
import { FileText, Send, Calendar, DollarSign, BookOpen, CheckCircle, ArrowRight } from 'lucide-react';

interface PostVisitWorkflowProps {
  sessionId: string;
  appointmentId: string;
  patientId: string;
  onComplete: () => void;
}

export default function PostVisitWorkflow({
  sessionId,
  appointmentId,
  patientId,
  onComplete,
}: PostVisitWorkflowProps) {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      id: 'finalize-notes',
      title: 'Finalize Clinical Notes',
      description: 'Review and finalize SOAP notes',
      icon: FileText,
      action: 'Finalize Notes',
    },
    {
      id: 'send-prescriptions',
      title: 'Send Prescriptions',
      description: 'Send prescriptions to patient pharmacy',
      icon: Send,
      action: 'Send to Pharmacy',
    },
    {
      id: 'schedule-followup',
      title: 'Schedule Follow-up',
      description: 'Book follow-up appointment if needed',
      icon: Calendar,
      action: 'Schedule Appointment',
      optional: true,
    },
    {
      id: 'submit-billing',
      title: 'Submit Billing',
      description: 'Submit insurance claim and billing codes',
      icon: DollarSign,
      action: 'Submit Claim',
    },
    {
      id: 'patient-education',
      title: 'Patient Education',
      description: 'Share educational materials with patient',
      icon: BookOpen,
      action: 'Send Materials',
      optional: true,
    },
    {
      id: 'visit-summary',
      title: 'Generate Visit Summary',
      description: 'Create and send visit summary to patient',
      icon: FileText,
      action: 'Generate Summary',
    },
  ];

  const handleStepComplete = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkipStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleCompleteWorkflow = () => {
    const requiredSteps = steps.filter(s => !s.optional).map(s => s.id);
    const allRequiredCompleted = requiredSteps.every(id => completedSteps.includes(id));

    if (!allRequiredCompleted) {
      toast.error('Please complete all required steps before finishing.');
      return;
    }

    onComplete();
  };

  const allRequiredCompleted = steps
    .filter(s => !s.optional)
    .every(s => completedSteps.includes(s.id));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Post-Visit Workflow
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Complete the following steps to finalize this consultation
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                {completedSteps.length} of {steps.filter(s => !s.optional).length} required steps completed
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {steps.filter(s => s.optional).length} optional steps available
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {Math.round((completedSteps.length / steps.length) * 100)}%
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">Complete</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = index === currentStep;

          return (
            <div
              key={step.id}
              className={`relative p-6 rounded-lg border-2 transition-all ${
                isCompleted
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                  : isCurrent
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              {isCompleted && (
                <div className="absolute top-4 right-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              )}

              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                      ? 'bg-green-600'
                      : isCurrent
                      ? 'bg-blue-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {step.title}
                    </h3>
                    {step.optional && (
                      <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded font-medium">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {step.description}
                  </p>

                  {!isCompleted && isCurrent && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStepComplete(step.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        {step.action}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      {step.optional && (
                        <button
                          onClick={handleSkipStep}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          Skip
                        </button>
                      )}
                    </div>
                  )}

                  {isCompleted && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Completed
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {allRequiredCompleted
            ? 'All required steps completed. You can finish the workflow.'
            : `${steps.filter(s => !s.optional).length - completedSteps.filter(id => !steps.find(s => s.id === id)?.optional).length} required steps remaining`}
        </p>
        <button
          onClick={handleCompleteWorkflow}
          disabled={!allRequiredCompleted}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            allRequiredCompleted
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          Complete Workflow
        </button>
      </div>
    </div>
  );
}
