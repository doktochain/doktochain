import { Link } from 'react-router-dom';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { Phone, ArrowLeft } from 'lucide-react';

export default function VoiceCallPage() {
  const { currentColors } = useTheme();
  const { userProfile } = useAuth();

  if (userProfile?.role === 'admin') {
    return (
      <div className="p-6">
        <div
          className="p-8 rounded-lg border text-center"
          style={{
            backgroundColor: currentColors.cardBg,
            borderColor: currentColors.border,
          }}
        >
          <Phone size={48} className="mx-auto mb-4" style={{ color: currentColors.primary }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: currentColors.text }}>
            Call Monitoring
          </h2>
          <p className="mb-4" style={{ color: currentColors.textSecondary }}>
            Use the main Call Monitoring page to view all voice and video calls across the platform.
          </p>
          <Link
            to="/dashboard/calls"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white"
            style={{ backgroundColor: currentColors.primary }}
          >
            <ArrowLeft size={20} />
            Go to Call Monitoring
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <p>Voice call page for non-admin users coming soon.</p>
    </div>
  );
}
