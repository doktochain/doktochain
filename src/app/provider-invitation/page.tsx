import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Building2,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  ArrowRight,
  LogIn,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clinicService, ClinicInvitation } from '../../services/clinicService';
import { providerService } from '../../services/providerService';

type InvitationWithClinic = ClinicInvitation & {
  clinic_name?: string | null;
  clinic_logo_url?: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  attending_physician: 'Attending Physician',
  consulting_physician: 'Consulting Physician',
  resident: 'Resident',
  locum: 'Locum Tenens',
  specialist: 'Specialist',
  surgeon: 'Surgeon',
  nurse_practitioner: 'Nurse Practitioner',
};

function formatRole(role: string | undefined | null): string {
  if (!role) return 'Provider';
  return ROLE_LABELS[role] || role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function ProviderInvitationPage() {
  const { lang } = useParams<{ lang: string }>();
  const langPrefix = lang || 'en';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const token = searchParams.get('token') || '';
  const [invitation, setInvitation] = useState<InvitationWithClinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<null | 'accept' | 'decline'>(null);
  const [result, setResult] = useState<null | 'accepted' | 'declined'>(null);

  useEffect(() => {
    if (!token) {
      setError('No invitation token was provided. Please use the link from your invitation email.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const inv = await clinicService.getInvitationByToken(token);
        if (cancelled) return;
        if (!inv) {
          setError('This invitation link is invalid or has been cancelled.');
        } else {
          setInvitation(inv as InvitationWithClinic);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Unable to load this invitation.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const isExpired = useMemo(() => {
    if (!invitation?.expires_at) return false;
    return new Date(invitation.expires_at) < new Date();
  }, [invitation]);

  const emailMismatch = useMemo(() => {
    if (!invitation || !user?.email || !profile?.email) return false;
    return profile.email.toLowerCase() !== invitation.email.toLowerCase();
  }, [invitation, user, profile]);

  const handleAccept = async () => {
    if (!invitation || !user) return;
    try {
      setSubmitting('accept');
      setError(null);
      const provider = await providerService.getProviderByUserId(user.id);
      if (!provider) {
        setError('Your account does not have a provider profile yet. Please complete provider onboarding first.');
        return;
      }
      await clinicService.acceptInvitation(invitation.token, provider.id);
      setResult('accepted');
    } catch (err: any) {
      setError(err?.message || 'Could not accept this invitation. Please try again.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;
    try {
      setSubmitting('decline');
      setError(null);
      await clinicService.declineInvitation(invitation.token);
      setResult('declined');
    } catch (err: any) {
      setError(err?.message || 'Could not decline this invitation.');
    } finally {
      setSubmitting(null);
    }
  };

  const saveTokenAndGo = (target: string) => {
    try {
      sessionStorage.setItem('dokto_pending_invitation_token', token);
      sessionStorage.setItem('dokto_pending_invitation_email', invitation?.email || '');
    } catch {}
    navigate(target);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading invitation...</span>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} className="text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation unavailable</h1>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <Link
            to={`/${langPrefix}/provider/login`}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <LogIn size={16} /> Go to provider login
          </Link>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  const clinicName = invitation.clinic_name || 'a clinic';
  const roleLabel = formatRole(invitation.role_at_clinic);

  if (result === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re now affiliated with {clinicName}</h1>
          <p className="text-sm text-gray-600 mb-6">
            The clinic can now schedule you and share records according to your role as <strong>{roleLabel}</strong>.
          </p>
          <Link
            to={`/${langPrefix}/dashboard/provider/affiliations`}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to my affiliations <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  if (result === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} className="text-gray-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation declined</h1>
          <p className="text-sm text-gray-600 mb-6">
            We&apos;ve let {clinicName} know. You can close this tab, or head back to the Doktochain home page.
          </p>
          <Link
            to={`/${langPrefix}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Doktochain
          </Link>
        </div>
      </div>
    );
  }

  if (invitation.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            This invitation is {invitation.status}
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            No further action is needed. If you think this is a mistake, please reach out to {clinicName} directly.
          </p>
          <Link
            to={`/${langPrefix}/provider/login`}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <LogIn size={16} /> Provider login
          </Link>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">This invitation has expired</h1>
          <p className="text-sm text-gray-600 mb-6">
            Please ask {clinicName} to send you a fresh invitation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center gap-3">
            {invitation.clinic_logo_url ? (
              <img
                src={invitation.clinic_logo_url}
                alt={clinicName}
                className="w-12 h-12 rounded-xl object-cover bg-white/20"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 size={24} />
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wider opacity-80">You&apos;ve been invited</p>
              <h1 className="text-xl font-bold">{clinicName}</h1>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              Hi {invitation.first_name || 'there'}, <strong>{clinicName}</strong> would like you to join as a{' '}
              <strong>{roleLabel}</strong>.
            </p>
            {invitation.specialty && (
              <p className="text-sm text-gray-600">
                Specialty: <strong>{invitation.specialty}</strong>
              </p>
            )}
            <p className="text-xs text-gray-400 pt-2">
              Invitation sent to <strong>{invitation.email}</strong>
              {invitation.expires_at && (
                <> &middot; Expires {new Date(invitation.expires_at).toLocaleDateString()}</>
              )}
            </p>
          </div>

          {invitation.message && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Personal message</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{invitation.message}</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!user ? (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                Sign in with <strong>{invitation.email}</strong> to accept or decline this invitation.
                If you&apos;re new to Doktochain, create a provider account first.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => saveTokenAndGo(`/${langPrefix}/provider/login?returnTo=${encodeURIComponent(`/${langPrefix}/provider-invitation?token=${token}`)}`)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <LogIn size={16} /> Sign in to accept
                </button>
                <button
                  onClick={() => saveTokenAndGo(`/${langPrefix}/register?role=provider&email=${encodeURIComponent(invitation.email)}`)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <UserPlus size={16} /> Create provider account
                </button>
              </div>
            </div>
          ) : profile?.role !== 'provider' ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              You&apos;re signed in as a {profile?.role || 'non-provider'} account. To accept this invitation,
              please sign out and sign in with a provider account registered to <strong>{invitation.email}</strong>.
            </div>
          ) : emailMismatch ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              This invitation was sent to <strong>{invitation.email}</strong> but you&apos;re signed in as{' '}
              <strong>{profile?.email}</strong>. Please sign in with the correct account to accept it.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleAccept}
                disabled={submitting !== null}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting === 'accept' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} /> Accept invitation
                  </>
                )}
              </button>
              <button
                onClick={handleDecline}
                disabled={submitting !== null}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting === 'decline' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Declining...
                  </>
                ) : (
                  <>
                    <XCircle size={16} /> Decline
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
