import PatientEHRViewer from '../../../../components/ehr/PatientEHRViewer';
import ConsentManager from '../../../../components/patient/ConsentManager';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs';
import { FileText, Shield } from 'lucide-react';

export default function HealthRecordsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Health Records</h1>
          <p className="text-muted-foreground mt-1">View your medical records and manage data sharing</p>
        </div>
      </div>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Medical Records
          </TabsTrigger>
          <TabsTrigger value="consents" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Data Sharing & Consents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <PatientEHRViewer />
        </TabsContent>
        <TabsContent value="consents">
          <ConsentManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
