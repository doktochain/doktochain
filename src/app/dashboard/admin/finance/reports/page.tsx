import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';

export default function FinancialReportsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/dashboard/admin/dashboard/finance', { replace: true });
  }, [navigate]);

  return (
    <div className="p-6 flex items-center justify-center h-96">
      <div className="text-center">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
        <p className="text-gray-600">Redirecting to Finance Dashboard...</p>
      </div>
    </div>
  );
}
