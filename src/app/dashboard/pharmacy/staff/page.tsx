import { useEffect, useState } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { Users, Plus, Mail, Phone, Shield, Calendar, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Input } from '../../../../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';

interface StaffMember {
  id: string;
  pharmacy_id: string;
  user_id: string;
  staff_role: string;
  license_number: string | null;
  license_expiry: string | null;
  employment_status: string;
  hire_date: string | null;
  can_approve_prescriptions: boolean;
  can_manage_inventory: boolean;
  can_process_payments: boolean;
  can_manage_staff: boolean;
  user_profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  } | null;
}

export default function PharmacyStaff() {
  const { userProfile } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [pharmacyId, setPharmacyId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [newStaff, setNewStaff] = useState({
    email: '',
    role: 'pharmacy-technician',
    license_number: '',
    license_expiry: '',
    hire_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadPharmacyId();
  }, [userProfile]);

  useEffect(() => {
    if (pharmacyId) {
      loadStaff();
    }
  }, [pharmacyId]);

  const loadPharmacyId = async () => {
    if (!userProfile) return;

    const { data, error } = await supabase
      .from('pharmacies')
      .select('id')
      .eq('user_id', userProfile.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading pharmacy:', error);
      setError('Failed to load pharmacy information');
      setLoading(false);
      return;
    }

    if (data) {
      setPharmacyId(data.id);
    } else {
      setError('No pharmacy found for this user');
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('pharmacy_staff')
        .select(`
          *,
          user_profiles (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('pharmacy_id', pharmacyId);

      if (error) {
        console.error('Error loading staff:', error);
        setError(`Failed to load staff: ${error.message}`);
        setStaff([]);
      } else {
        setStaff(data as StaffMember[] || []);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      setError('An unexpected error occurred');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', newStaff.email)
        .maybeSingle();

      if (userError) throw userError;

      if (!userProfile) {
        setError('No user found with that email address');
        return;
      }

      const { error: insertError } = await supabase
        .from('pharmacy_staff')
        .insert({
          pharmacy_id: pharmacyId,
          user_id: userProfile.id,
          staff_role: newStaff.role,
          license_number: newStaff.license_number || null,
          license_expiry: newStaff.license_expiry || null,
          hire_date: newStaff.hire_date,
          employment_status: 'active',
          can_approve_prescriptions: newStaff.role === 'pharmacist',
          can_manage_inventory: ['pharmacist', 'pharmacy-manager'].includes(newStaff.role),
          can_process_payments: true,
          can_manage_staff: newStaff.role === 'pharmacy-manager',
        });

      if (insertError) throw insertError;

      setShowAddModal(false);
      setNewStaff({
        email: '',
        role: 'pharmacy-technician',
        license_number: '',
        license_expiry: '',
        hire_date: new Date().toISOString().split('T')[0],
      });
      loadStaff();
      setToast({ type: 'success', message: 'Staff member added successfully!' });
      setTimeout(() => setToast(null), 3000);
    } catch (error: any) {
      console.error('Error adding staff:', error);
      setError(error.message || 'Failed to add staff member');
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedStaff) return;

    try {
      const { error } = await supabase
        .from('pharmacy_staff')
        .update({
          can_approve_prescriptions: selectedStaff.can_approve_prescriptions,
          can_manage_inventory: selectedStaff.can_manage_inventory,
          can_process_payments: selectedStaff.can_process_payments,
          can_manage_staff: selectedStaff.can_manage_staff,
        })
        .eq('id', selectedStaff.id);

      if (error) throw error;

      setShowPermissionsModal(false);
      setSelectedStaff(null);
      loadStaff();
      setToast({ type: 'success', message: 'Permissions updated successfully!' });
      setTimeout(() => setToast(null), 3000);
    } catch (error: any) {
      console.error('Error updating permissions:', error);
      setToast({ type: 'error', message: 'Failed to update permissions' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, string> = {
      pharmacist: 'Pharmacist',
      'pharmacy-technician': 'Technician',
      'pharmacy-manager': 'Manager',
      cashier: 'Cashier',
      'delivery-personnel': 'Delivery',
      admin: 'Admin',
    };

    const label = config[role] || config['pharmacy-technician'];

    return (
      <Badge variant="info">
        {label}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground mt-1">Manage pharmacy staff and permissions</p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          disabled={!pharmacyId}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold text-foreground">{staff.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pharmacists</p>
                <p className="text-2xl font-bold text-foreground">
                  {staff.filter(s => s.staff_role === 'pharmacist').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Technicians</p>
                <p className="text-2xl font-bold text-foreground">
                  {staff.filter(s => s.staff_role === 'pharmacy-technician').length}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading staff...</p>
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No staff members found</p>
              <p className="text-sm text-muted-foreground">Add your first staff member to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      License
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {staff.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                              {member.user_profiles?.first_name?.charAt(0) || 'U'}
                              {member.user_profiles?.last_name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-foreground">
                              {member.user_profiles?.first_name} {member.user_profiles?.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ID: {member.id.substring(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground flex items-center gap-1 mb-1">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {member.user_profiles?.email || 'N/A'}
                        </div>
                        {member.user_profiles?.phone && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            {member.user_profiles.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(member.staff_role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {member.license_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={member.employment_status === 'active' ? 'success' : 'secondary'}>
                          {member.employment_status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => {
                            setSelectedStaff(member);
                            setShowPermissionsModal(true);
                          }}
                        >
                          Permissions
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <Label className="mb-2 block">
                Email Address *
              </Label>
              <Input
                type="email"
                required
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder="staff@example.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                User must be registered in the system
              </p>
            </div>

            <div>
              <Label className="mb-2 block">
                Role *
              </Label>
              <Select
                value={newStaff.role}
                onValueChange={(value) => setNewStaff({ ...newStaff, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pharmacy-technician">Pharmacy Technician</SelectItem>
                  <SelectItem value="pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="pharmacy-manager">Pharmacy Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="delivery-personnel">Delivery Personnel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">
                License Number
              </Label>
              <Input
                type="text"
                value={newStaff.license_number}
                onChange={(e) => setNewStaff({ ...newStaff, license_number: e.target.value })}
              />
            </div>

            <div>
              <Label className="mb-2 block">
                License Expiry
              </Label>
              <Input
                type="date"
                value={newStaff.license_expiry}
                onChange={(e) => setNewStaff({ ...newStaff, license_expiry: e.target.value })}
              />
            </div>

            <div>
              <Label className="mb-2 block">
                Hire Date
              </Label>
              <Input
                type="date"
                value={newStaff.hire_date}
                onChange={(e) => setNewStaff({ ...newStaff, hire_date: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
              >
                Add Staff
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPermissionsModal && !!selectedStaff} onOpenChange={(open) => {
        setShowPermissionsModal(open);
        if (!open) setSelectedStaff(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
          </DialogHeader>

          {selectedStaff && (
            <div className="space-y-4">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  {selectedStaff.user_profiles?.first_name} {selectedStaff.user_profiles?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedStaff.user_profiles?.email}
                </p>
              </div>

              <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                <Input
                  type="checkbox"
                  checked={selectedStaff.can_approve_prescriptions}
                  onChange={(e) => setSelectedStaff({ ...selectedStaff, can_approve_prescriptions: e.target.checked })}
                  className="rounded w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Approve Prescriptions</p>
                  <p className="text-xs text-muted-foreground">Can validate and approve prescriptions</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                <Input
                  type="checkbox"
                  checked={selectedStaff.can_manage_inventory}
                  onChange={(e) => setSelectedStaff({ ...selectedStaff, can_manage_inventory: e.target.checked })}
                  className="rounded w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Manage Inventory</p>
                  <p className="text-xs text-muted-foreground">Can add, edit, and remove inventory items</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                <Input
                  type="checkbox"
                  checked={selectedStaff.can_process_payments}
                  onChange={(e) => setSelectedStaff({ ...selectedStaff, can_process_payments: e.target.checked })}
                  className="rounded w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Process Payments</p>
                  <p className="text-xs text-muted-foreground">Can handle payments and transactions</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                <Input
                  type="checkbox"
                  checked={selectedStaff.can_manage_staff}
                  onChange={(e) => setSelectedStaff({ ...selectedStaff, can_manage_staff: e.target.checked })}
                  className="rounded w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Manage Staff</p>
                  <p className="text-xs text-muted-foreground">Can add and manage other staff members</p>
                </div>
              </label>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPermissionsModal(false);
                    setSelectedStaff(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleUpdatePermissions}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
