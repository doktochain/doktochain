import { useState } from 'react';
import { Circle, Move, Ruler, Pencil, Eraser, X } from 'lucide-react';

interface VirtualExaminationToolsProps {
  onClose: () => void;
}

export default function VirtualExaminationTools({ onClose }: VirtualExaminationToolsProps) {
  const [selectedTool, setSelectedTool] = useState<'pointer' | 'circle' | 'measure' | 'draw' | null>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const tools = [
    { id: 'pointer', icon: Move, label: 'Point', color: 'bg-blue-600' },
    { id: 'circle', icon: Circle, label: 'Circle', color: 'bg-green-600' },
    { id: 'measure', icon: Ruler, label: 'Measure', color: 'bg-blue-600' },
    { id: 'draw', icon: Pencil, label: 'Draw', color: 'bg-orange-600' },
  ];

  const clearAnnotations = () => {
    setAnnotations([]);
  };

  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 dark:text-white">Examination Tools</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id as any)}
              className={`flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-all ${
                selectedTool === tool.id
                  ? `${tool.color} text-white`
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tool.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={clearAnnotations}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
        >
          <Eraser className="w-4 h-4" />
          Clear All
        </button>
      </div>

      {selectedTool && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>{tools.find((t) => t.id === selectedTool)?.label}</strong> tool selected.{' '}
            {selectedTool === 'pointer' && 'Click on the video to point.'}
            {selectedTool === 'circle' && 'Click and drag to draw a circle.'}
            {selectedTool === 'measure' && 'Click two points to measure distance.'}
            {selectedTool === 'draw' && 'Click and drag to draw freehand.'}
          </p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
        Annotations are visible to both provider and patient
      </div>
    </div>
  );
}
