import { GraduationCap, Award, Languages, CreditCard, Clock, Video } from 'lucide-react';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ProviderAboutTabProps {
  provider: any;
  specialties: any[];
  credentials: any[];
  languages: any[];
  procedures: any[];
  insuranceAccepted: any[];
  timeBlocks: any[];
  hasVirtualVisits: boolean;
}

export default function ProviderAboutTab({
  provider,
  specialties,
  credentials,
  languages,
  procedures,
  insuranceAccepted,
  timeBlocks,
  hasVirtualVisits,
}: ProviderAboutTabProps) {
  return (
    <div className="space-y-8">
      {provider.bio && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">About</h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{provider.bio}</p>
          {provider.years_of_experience > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sky-600">
              <Award className="w-5 h-5" />
              <span className="font-medium">{provider.years_of_experience} years of experience</span>
            </div>
          )}
        </div>
      )}

      {provider.video_intro_url && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Video Introduction</h3>
          <video controls className="w-full max-w-2xl rounded-lg shadow">
            <source src={provider.video_intro_url} type="video/mp4" />
          </video>
        </div>
      )}

      {specialties.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-sky-600" />
            Specialties
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specialties.map((spec: any) => (
              <div key={spec.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{spec.specialties_master?.name || spec.specialty}</h4>
                    {spec.sub_specialty && <p className="text-sm text-gray-600 mt-1">{spec.sub_specialty}</p>}
                    {spec.certification_body && (
                      <p className="text-sm text-gray-600 mt-1">
                        {spec.certification_body}{spec.certification_year && ` (${spec.certification_year})`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {spec.is_primary && (
                      <span className="px-2 py-1 bg-sky-100 text-sky-700 text-xs rounded font-medium">Primary</span>
                    )}
                    {spec.board_certified && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">Board Certified</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {credentials.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-sky-600" />
            Education & Credentials
          </h3>
          <div className="space-y-4">
            {credentials.map((cred) => (
              <div key={cred.id} className="border-l-4 border-sky-600 pl-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{cred.credential_name}</h4>
                    <p className="text-gray-600">{cred.issuing_organization}</p>
                    {cred.issue_date && (
                      <p className="text-sm text-gray-500">Issued {new Date(cred.issue_date).getFullYear()}</p>
                    )}
                    {cred.credential_number && (
                      <p className="text-sm text-gray-500">License: {cred.credential_number}</p>
                    )}
                  </div>
                  {cred.is_verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      <Award className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {languages.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Languages className="w-5 h-5 text-sky-600" />
            Languages Spoken
          </h3>
          <div className="flex flex-wrap gap-3">
            {languages.map((lang: any) => (
              <div key={lang.id} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
                <div className="font-medium">{lang.language}</div>
                <div className="text-xs text-gray-500 mt-0.5 capitalize">{lang.proficiency}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {procedures.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Procedures</h3>
          <div className="space-y-3">
            {procedures.map((proc: any) => (
              <div key={proc.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{proc.procedure_name}</h4>
                    {proc.description && <p className="text-sm text-gray-600 mt-1">{proc.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      {proc.duration_minutes && (
                        <span className="text-gray-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {proc.duration_minutes} min
                        </span>
                      )}
                      {proc.requires_referral && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">Referral Required</span>
                      )}
                      {proc.available_virtually && (
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-xs rounded">Available Virtually</span>
                      )}
                    </div>
                  </div>
                  {proc.price_cents > 0 && (
                    <div className="text-lg font-bold text-sky-600">${(proc.price_cents / 100).toFixed(2)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {timeBlocks.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-600" />
            Office Hours
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DAY_NAMES.map((day, idx) => {
              const dayBlocks = timeBlocks.filter((b: any) => b.day_of_week === idx);
              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-24 font-medium text-gray-700">{day}</div>
                  <div className="flex-1">
                    {dayBlocks.length === 0 ? (
                      <span className="text-gray-400">Closed</span>
                    ) : (
                      <div className="space-y-1">
                        {dayBlocks.map((block: any, bidx: number) => (
                          <div key={bidx} className="text-gray-700">
                            {block.start_time?.slice(0, 5)} - {block.end_time?.slice(0, 5)}
                            {block.appointment_type !== 'both' && (
                              <span className="ml-2 text-xs text-gray-500 capitalize">({block.appointment_type})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {insuranceAccepted.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-sky-600" />
            Insurance & Payment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insuranceAccepted.map((ins: any) => (
              <div key={ins.id} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {ins.insurance_providers_master?.name || 'Insurance Provider'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 capitalize">
                      {ins.insurance_providers_master?.provider_type}
                    </div>
                    {ins.coverage_limitations && (
                      <p className="text-xs text-gray-600 mt-1">{ins.coverage_limitations}</p>
                    )}
                  </div>
                  {ins.direct_billing_enabled && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">Direct Billing</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-4">Self-pay options also available. Contact the office for pricing details.</p>
        </div>
      )}

      {hasVirtualVisits && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-sky-600" />
            Virtual Consultations
          </h3>
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-5">
            <p className="text-gray-700 mb-3">Secure video consultations available from the comfort of your home.</p>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Secure, encrypted video platform</p>
              <p>No software installation required</p>
              <p>Works on computer, tablet, or smartphone</p>
            </div>
            {provider.virtual_consultation_fee_cents > 0 && (
              <p className="mt-3 font-semibold text-sky-700">
                Virtual consultation fee: ${(provider.virtual_consultation_fee_cents / 100).toFixed(2)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
