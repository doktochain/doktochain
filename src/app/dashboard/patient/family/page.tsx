import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  familyManagementService,
  ChildProfile,
  GrowthRecord,
  DevelopmentalMilestone,
  Vaccination,
} from '../../../../services/familyManagementService';
import { Users, Plus, X, Baby, Calendar, Activity, Syringe, TrendingUp, Heart, AlertCircle, CheckCircle, Clock, User, Phone, School, FileText, CreditCard as Edit } from 'lucide-react';

const getVaccinationStatusClasses = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'administered':
      return { icon: 'text-green-600', badge: 'bg-green-100 text-green-800' };
    case 'due':
    case 'scheduled':
      return { icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-800' };
    case 'overdue':
      return { icon: 'text-red-600', badge: 'bg-red-100 text-red-800' };
    default:
      return { icon: 'text-gray-600', badge: 'bg-gray-100 text-gray-800' };
  }
};

export default function FamilyPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'growth' | 'milestones' | 'vaccinations'>('overview');
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);

  useEffect(() => {
    if (user) {
      loadChildren();
    }
  }, [user]);

  const loadChildren = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await familyManagementService.getChildren(user.id);
    if (data) {
      setChildren(data);
      if (data.length > 0 && !selectedChild) {
        setSelectedChild(data[0]);
      }
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Please log in to manage your family</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Family Members</h1>
          <p className="text-gray-600 mt-1">Manage your children's health profiles</p>
        </div>
        <button
          onClick={() => setShowAddChild(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Child
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : children.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No children added yet</h3>
          <p className="text-gray-600 mb-4">
            Add your children's profiles to manage their health information
          </p>
          <button
            onClick={() => setShowAddChild(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add First Child
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {children.map((child) => (
              <ChildSelectorCard
                key={child.id}
                child={child}
                isSelected={selectedChild?.id === child.id}
                onClick={() => setSelectedChild(child)}
              />
            ))}
          </div>

          {selectedChild && (
            <div className="bg-white rounded-lg shadow-sm">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <TabButton
                    active={activeTab === 'overview'}
                    onClick={() => setActiveTab('overview')}
                    icon={User}
                    label="Overview"
                  />
                  <TabButton
                    active={activeTab === 'growth'}
                    onClick={() => setActiveTab('growth')}
                    icon={TrendingUp}
                    label="Growth Chart"
                  />
                  <TabButton
                    active={activeTab === 'milestones'}
                    onClick={() => setActiveTab('milestones')}
                    icon={Activity}
                    label="Milestones"
                  />
                  <TabButton
                    active={activeTab === 'vaccinations'}
                    onClick={() => setActiveTab('vaccinations')}
                    icon={Syringe}
                    label="Vaccinations"
                  />
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <OverviewTab child={selectedChild} onRefresh={loadChildren} />
                )}
                {activeTab === 'growth' && <GrowthTab child={selectedChild} />}
                {activeTab === 'milestones' && <MilestonesTab child={selectedChild} />}
                {activeTab === 'vaccinations' && <VaccinationsTab child={selectedChild} />}
              </div>
            </div>
          )}
        </>
      )}

      {showAddChild && (
        <AddChildModal
          guardianId={user.id}
          onClose={() => setShowAddChild(false)}
          onSave={() => {
            setShowAddChild(false);
            loadChildren();
          }}
        />
      )}
    </div>
  );
}

const ChildSelectorCard: React.FC<{
  child: ChildProfile;
  isSelected: boolean;
  onClick: () => void;
}> = ({ child, isSelected, onClick }) => {
  const age = familyManagementService.formatAge(child.date_of_birth);

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-48 p-4 rounded-lg border-2 transition-all ${
        isSelected
          ? 'border-blue-600 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
            isSelected ? 'bg-blue-100' : 'bg-gray-100'
          }`}
        >
          {child.profile_photo_url ? (
            <img
              src={child.profile_photo_url}
              alt={`${child.first_name} ${child.last_name}`}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <Baby className={`w-8 h-8 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
          )}
        </div>
        <h3 className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
          {child.first_name}
        </h3>
        <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>{age}</p>
      </div>
    </button>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<any>;
  label: string;
}> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
      active
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

const OverviewTab: React.FC<{ child: ChildProfile; onRefresh: () => void }> = ({
  child,
  onRefresh,
}) => {
  const age = familyManagementService.formatAge(child.date_of_birth);
  const [upcomingVaccinations, setUpcomingVaccinations] = useState<Vaccination[]>([]);

  useEffect(() => {
    loadUpcomingVaccinations();
  }, [child.id]);

  const loadUpcomingVaccinations = async () => {
    const { data } = await familyManagementService.getUpcomingVaccinations(child.id);
    if (data) setUpcomingVaccinations(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
            {child.first_name[0]}{child.last_name[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {child.first_name} {child.last_name}
            </h2>
            <p className="text-gray-600">{age} old</p>
            <p className="text-sm text-gray-500 mt-1">
              Born: {new Date(child.date_of_birth).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <Edit className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Basic Information</h3>
          <div className="space-y-3 text-sm">
            {child.gender && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Gender:</span>
                <span className="font-medium capitalize">{child.gender}</span>
              </div>
            )}
            {child.blood_type && (
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Blood Type:</span>
                <span className="font-medium">{child.blood_type}</span>
              </div>
            )}
            {child.health_card_number && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Health Card:</span>
                <span className="font-medium">{child.health_card_number}</span>
              </div>
            )}
            {child.school_name && (
              <div className="flex items-center gap-2">
                <School className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">School:</span>
                <span className="font-medium">{child.school_name}</span>
                {child.grade_level && <span className="text-gray-500">({child.grade_level})</span>}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Emergency Contact</h3>
          <div className="space-y-3 text-sm">
            {child.emergency_contact_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{child.emergency_contact_name}</span>
              </div>
            )}
            {child.emergency_contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{child.emergency_contact_phone}</span>
              </div>
            )}
            {child.emergency_contact_relationship && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Relationship:</span>
                <span className="font-medium capitalize">{child.emergency_contact_relationship}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {child.allergies && child.allergies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Allergies</h3>
              <div className="flex flex-wrap gap-2">
                {child.allergies.map((allergy, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium"
                  >
                    {allergy}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {child.medical_conditions && child.medical_conditions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">Medical Conditions</h3>
              <div className="flex flex-wrap gap-2">
                {child.medical_conditions.map((condition, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium"
                  >
                    {condition}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {upcomingVaccinations.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Upcoming Vaccinations</h3>
          <div className="space-y-2">
            {upcomingVaccinations.map((vaccine) => (
              <div
                key={vaccine.id}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Syringe className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{vaccine.vaccine_name}</p>
                    {vaccine.dose_number && vaccine.total_doses && (
                      <p className="text-sm text-gray-600">
                        Dose {vaccine.dose_number} of {vaccine.total_doses}
                      </p>
                    )}
                  </div>
                </div>
                {vaccine.due_date && (
                  <span className="text-sm text-gray-600">
                    Due: {new Date(vaccine.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {child.pediatrician_name && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Pediatrician</h3>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-gray-900">{child.pediatrician_name}</p>
            {child.pediatrician_phone && (
              <p className="text-gray-600">{child.pediatrician_phone}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const GrowthTab: React.FC<{ child: ChildProfile }> = ({ child }) => {
  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGrowthRecords();
  }, [child.id]);

  const loadGrowthRecords = async () => {
    setLoading(true);
    const { data } = await familyManagementService.getGrowthRecords(child.id);
    if (data) setGrowthRecords(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Growth Chart</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" />
          Add Record
        </button>
      </div>

      {growthRecords.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p>No growth records yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {growthRecords.map((record) => (
            <div key={record.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(record.record_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">{record.age_months} months old</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {record.height_cm && (
                  <div>
                    <p className="text-gray-600">Height</p>
                    <p className="font-semibold text-gray-900">{record.height_cm} cm</p>
                    {record.height_percentile && (
                      <p className="text-xs text-gray-500">{record.height_percentile}th percentile</p>
                    )}
                  </div>
                )}
                {record.weight_kg && (
                  <div>
                    <p className="text-gray-600">Weight</p>
                    <p className="font-semibold text-gray-900">{record.weight_kg} kg</p>
                    {record.weight_percentile && (
                      <p className="text-xs text-gray-500">{record.weight_percentile}th percentile</p>
                    )}
                  </div>
                )}
                {record.bmi && (
                  <div>
                    <p className="text-gray-600">BMI</p>
                    <p className="font-semibold text-gray-900">{record.bmi}</p>
                    {record.bmi_percentile && (
                      <p className="text-xs text-gray-500">{record.bmi_percentile}th percentile</p>
                    )}
                  </div>
                )}
                {record.head_circumference_cm && (
                  <div>
                    <p className="text-gray-600">Head Circumference</p>
                    <p className="font-semibold text-gray-900">{record.head_circumference_cm} cm</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MilestonesTab: React.FC<{ child: ChildProfile }> = ({ child }) => {
  const [milestones, setMilestones] = useState<DevelopmentalMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const currentAgeMonths = familyManagementService.calculateAgeMonths(child.date_of_birth);

  useEffect(() => {
    loadMilestones();
  }, [child.id]);

  const loadMilestones = async () => {
    setLoading(true);
    const { data } = await familyManagementService.getMilestones(child.id);
    if (data) setMilestones(data);
    setLoading(false);
  };

  const groupedMilestones = milestones.reduce((acc, milestone) => {
    const category = milestone.milestone_category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(milestone);
    return acc;
  }, {} as Record<string, DevelopmentalMilestone[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Developmental Milestones</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" />
          Add Milestone
        </button>
      </div>

      {Object.keys(groupedMilestones).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p>No milestones tracked yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMilestones).map(([category, categoryMilestones]) => (
            <div key={category}>
              <h4 className="font-semibold text-gray-900 capitalize mb-3">{category}</h4>
              <div className="space-y-2">
                {categoryMilestones.map((milestone) => {
                  const statusColor = familyManagementService.getMilestoneStatusColor(
                    milestone.achieved,
                    milestone.expected_age_months,
                    currentAgeMonths
                  );
                  return (
                    <div
                      key={milestone.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {milestone.achieved ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{milestone.milestone_name}</p>
                        {milestone.milestone_description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {milestone.milestone_description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {milestone.expected_age_months && (
                            <span>Expected: {milestone.expected_age_months} months</span>
                          )}
                          {milestone.achieved && milestone.achieved_age_months && (
                            <span className="text-green-600">
                              Achieved: {milestone.achieved_age_months} months
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const VaccinationsTab: React.FC<{ child: ChildProfile }> = ({ child }) => {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVaccinations();
  }, [child.id]);

  const loadVaccinations = async () => {
    setLoading(true);
    const { data } = await familyManagementService.getVaccinations(child.id);
    if (data) setVaccinations(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Vaccination Schedule</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" />
          Add Vaccination
        </button>
      </div>

      {vaccinations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Syringe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p>No vaccinations recorded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {vaccinations.map((vaccine) => {
            const statusClasses = getVaccinationStatusClasses(vaccine.status);
            return (
              <div
                key={vaccine.id}
                className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <Syringe className={`w-5 h-5 flex-shrink-0 mt-1 ${statusClasses.icon}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{vaccine.vaccine_name}</p>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses.badge}`}
                      >
                        {vaccine.status}
                      </span>
                    </div>
                    {vaccine.dose_number && vaccine.total_doses && (
                      <p className="text-sm text-gray-600 mt-1">
                        Dose {vaccine.dose_number} of {vaccine.total_doses}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      {vaccine.administered_date && (
                        <span>
                          Given: {new Date(vaccine.administered_date).toLocaleDateString()}
                        </span>
                      )}
                      {vaccine.due_date && !vaccine.administered_date && (
                        <span>Due: {new Date(vaccine.due_date).toLocaleDateString()}</span>
                      )}
                      {vaccine.next_dose_due && (
                        <span>
                          Next: {new Date(vaccine.next_dose_due).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AddChildModal: React.FC<{
  guardianId: string;
  onClose: () => void;
  onSave: () => void;
}> = ({ guardianId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'prefer_not_to_say' as any,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await familyManagementService.addChild({
      ...formData,
      guardian_id: guardianId,
      is_active: true,
    });
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Add Child</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth *
            </label>
            <input
              type="date"
              required
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Add Child
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};