import { Video, MapPin, Phone, Home } from 'lucide-react';

interface ConsultationMethodStepProps {
  selected?: string;
  onSelect: (method: 'in_person' | 'virtual' | 'phone' | 'home_visit') => void;
  onBack: () => void;
}

const METHODS = [
  { key: 'in_person' as const, label: 'In-Person Visit', desc: 'Visit the clinic for face-to-face consultation', icon: MapPin, color: 'text-sky-600' },
  { key: 'virtual' as const, label: 'Video Consultation', desc: 'Connect via secure video call from anywhere', icon: Video, color: 'text-teal-600' },
  { key: 'phone' as const, label: 'Phone Consultation', desc: 'Speak with your provider over the phone', icon: Phone, color: 'text-green-600' },
  { key: 'home_visit' as const, label: 'Home Visit', desc: 'Provider visits you at your home', icon: Home, color: 'text-orange-600', extra: 'Additional fee may apply' },
];

export default function ConsultationMethodStep({ selected, onSelect, onBack }: ConsultationMethodStepProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Choose Consultation Method</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {METHODS.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => onSelect(m.key)}
              className={`p-6 border-2 rounded-lg transition text-left ${
                selected === m.key ? 'border-sky-600 bg-sky-50' : 'border-gray-200 hover:border-sky-400'
              }`}
            >
              <Icon className={`w-8 h-8 ${m.color} mb-4`} />
              <h3 className="font-bold text-lg">{m.label}</h3>
              <p className="text-sm text-gray-600 mt-2">{m.desc}</p>
              {m.extra && (
                <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                  {m.extra}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button
        onClick={onBack}
        className="mt-6 px-6 py-2 text-sky-600 border border-sky-600 rounded-lg hover:bg-sky-50"
      >
        Back
      </button>
    </div>
  );
}
