import { useState } from 'react';
import {
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  Award,
  Plus,
  Activity,
  Footprints,
  Apple,
  Moon,
  Droplet,
  X,
  Loader2,
} from 'lucide-react';

interface HealthGoal {
  id: string;
  title: string;
  category: string;
  target: string;
  current: string;
  progress: number;
  startDate: string;
  targetDate: string;
  status: 'active' | 'completed' | 'paused';
  icon: string;
}

export default function HealthGoalsPage() {
  const [goals, setGoals] = useState<HealthGoal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'activity': return Activity;
      case 'footprints': return Footprints;
      case 'apple': return Apple;
      case 'moon': return Moon;
      case 'droplet': return Droplet;
      default: return Target;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Weight Loss': return 'bg-blue-100 text-blue-600';
      case 'Exercise': return 'bg-green-100 text-green-600';
      case 'Nutrition': return 'bg-orange-100 text-orange-600';
      case 'Sleep': return 'bg-slate-100 text-slate-600';
      case 'Hydration': return 'bg-cyan-100 text-cyan-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const handleAddGoal = (goal: Omit<HealthGoal, 'id'>) => {
    setGoals((prev) => [...prev, { ...goal, id: Date.now().toString() }]);
    setShowAddGoal(false);
  };

  const handleUpdateProgress = (goalId: string) => {
    const input = prompt('Enter new progress percentage (0-100):');
    if (input === null) return;
    const progress = Math.min(100, Math.max(0, parseInt(input) || 0));
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, progress, status: progress >= 100 ? 'completed' : 'active' }
          : g
      )
    );
  };

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');
  const averageProgress = activeGoals.length
    ? activeGoals.reduce((sum, goal) => sum + goal.progress, 0) / activeGoals.length
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Health Goals</h1>
          <p className="text-gray-600 mt-1">Set and track your health and wellness goals</p>
        </div>
        <button
          onClick={() => setShowAddGoal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Goal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-900">{activeGoals.length}</p>
              <p className="text-sm text-blue-700">Active Goals</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-green-900">{completedGoals.length}</p>
              <p className="text-sm text-green-700">Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-teal-900">{Math.round(averageProgress)}%</p>
              <p className="text-sm text-teal-700">Avg Progress</p>
            </div>
          </div>
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No health goals yet</h3>
          <p className="text-gray-600 mb-4">
            Set your first health goal to start tracking your wellness journey.
          </p>
          <button
            onClick={() => setShowAddGoal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Goals</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {activeGoals.map((goal) => {
                  const Icon = getIcon(goal.icon);
                  const daysRemaining = Math.ceil(
                    (new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <div key={goal.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 ${getCategoryColor(goal.category)} rounded-full flex items-center justify-center`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                            <p className="text-sm text-gray-600">{goal.category}</p>
                          </div>
                        </div>
                        <Award className="w-5 h-5 text-yellow-500" />
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-semibold text-gray-900">{goal.progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Current</p>
                            <p className="font-medium text-gray-900">{goal.current}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Target</p>
                            <p className="font-medium text-gray-900">{goal.target}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 pt-3 border-t">
                          <Clock className="w-4 h-4" />
                          <span>{daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Overdue'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleUpdateProgress(goal.id)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Update Progress
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-500" />
                Completed Goals
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedGoals.map((goal) => {
                  const Icon = getIcon(goal.icon);

                  return (
                    <div key={goal.id} className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <CheckCircle className="w-6 h-6 text-green-600 ml-auto" />
                      </div>
                      <h3 className="text-lg font-semibold text-green-900 mb-1">{goal.title}</h3>
                      <p className="text-sm text-green-700 mb-3">{goal.category}</p>
                      <div className="flex items-center gap-2 text-xs text-green-700">
                        <Calendar className="w-3 h-3" />
                        <span>Completed on {new Date(goal.targetDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {showAddGoal && (
        <AddGoalModal
          onClose={() => setShowAddGoal(false)}
          onSave={handleAddGoal}
        />
      )}
    </div>
  );
}

const AddGoalModal: React.FC<{
  onClose: () => void;
  onSave: (goal: any) => void;
}> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Exercise',
    target: '',
    current: '',
    targetDate: '',
    icon: 'activity',
  });

  const categories = [
    { label: 'Exercise', icon: 'footprints' },
    { label: 'Weight Loss', icon: 'activity' },
    { label: 'Nutrition', icon: 'apple' },
    { label: 'Sleep', icon: 'moon' },
    { label: 'Hydration', icon: 'droplet' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.target) return;

    const cat = categories.find((c) => c.label === formData.category);
    onSave({
      ...formData,
      icon: cat?.icon || 'activity',
      progress: 0,
      startDate: new Date().toISOString().split('T')[0],
      status: 'active',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Create Health Goal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Walk 10,000 steps daily"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              {categories.map((cat) => (
                <option key={cat.label} value={cat.label}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Value *</label>
              <input
                type="text"
                required
                value={formData.current}
                onChange={(e) => setFormData({ ...formData, current: e.target.value })}
                placeholder="e.g., 5,000 steps"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target *</label>
              <input
                type="text"
                required
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                placeholder="e.g., 10,000 steps"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
            <input
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Create Goal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
