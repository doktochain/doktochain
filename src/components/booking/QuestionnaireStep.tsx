import { useState } from 'react';
import { Save } from 'lucide-react';
import { QuestionnaireQuestion } from '../../services/enhancedBookingService';

interface QuestionnaireStepProps {
  questions: QuestionnaireQuestion[];
  responses: Record<string, any>;
  onResponseChange: (questionId: string, response: any) => void;
  onSaveDraft: () => void;
  onNext: () => void;
  onBack: () => void;
}

export default function QuestionnaireStep({
  questions,
  responses,
  onResponseChange,
  onSaveDraft,
  onNext,
  onBack,
}: QuestionnaireStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    questions.forEach((question) => {
      if (question.isRequired && !responses[question.id]) {
        newErrors[question.id] = 'This field is required';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onNext();
    }
  };

  const renderQuestion = (question: QuestionnaireQuestion) => {
    const value = responses[question.id] || '';
    const error = errors[question.id];

    switch (question.questionType) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onResponseChange(question.id, e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your answer"
          />
        );
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onResponseChange(question.id, e.target.value)}
            rows={4}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter detailed information"
          />
        );
      case 'single_choice':
        return (
          <div className="space-y-2">
            {question.options?.choices?.map((choice: string) => (
              <label key={choice} className="flex items-center">
                <input
                  type="radio"
                  name={question.id}
                  value={choice}
                  checked={value === choice}
                  onChange={(e) => onResponseChange(question.id, e.target.value)}
                  className="mr-3 accent-sky-600"
                />
                <span className="text-gray-700">{choice}</span>
              </label>
            ))}
          </div>
        );
      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {question.options?.choices?.map((choice: string) => (
              <label key={choice} className="flex items-center">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(choice)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    const newValues = e.target.checked
                      ? [...currentValues, choice]
                      : currentValues.filter((v: string) => v !== choice);
                    onResponseChange(question.id, newValues);
                  }}
                  className="mr-3 accent-sky-600"
                />
                <span className="text-gray-700">{choice}</span>
              </label>
            ))}
          </div>
        );
      case 'rating':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => onResponseChange(question.id, rating)}
                className={`w-12 h-12 rounded-lg border-2 font-semibold transition ${
                  value === rating
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : 'border-gray-300 text-gray-600 hover:border-sky-600'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        );
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onResponseChange(question.id, e.target.value)}
            className={`px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        );
      case 'boolean':
        return (
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={question.id}
                checked={value === true}
                onChange={() => onResponseChange(question.id, true)}
                className="mr-2 accent-sky-600"
              />
              <span className="text-gray-700">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={question.id}
                checked={value === false}
                onChange={() => onResponseChange(question.id, false)}
                className="mr-2 accent-sky-600"
              />
              <span className="text-gray-700">No</span>
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pre-Visit Questionnaire</h2>
        <p className="text-gray-600">
          Please answer the following questions to help your provider prepare for your visit.
        </p>
      </div>

      <div className="space-y-6">
        {questions.map((question, index) => (
          <div key={question.id} className="bg-gray-50 rounded-lg p-6">
            <label className="block">
              <div className="flex items-start gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-sky-600 text-white rounded-full text-sm font-semibold flex-shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <span className="text-gray-900 font-medium">
                    {question.questionText}
                    {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                  </span>
                </div>
              </div>
              <div className="ml-10">
                {renderQuestion(question)}
                {errors[question.id] && (
                  <p className="text-red-500 text-sm mt-1">{errors[question.id]}</p>
                )}
              </div>
            </label>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-sky-600 border border-sky-600 rounded-lg hover:bg-sky-50 font-medium"
        >
          Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={onSaveDraft}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
