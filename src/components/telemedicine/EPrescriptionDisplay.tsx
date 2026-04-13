import React, { useState } from 'react';
import {
  Pill,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  MapPin,
  Download,
  Printer,
  RefreshCw,
  DollarSign,
  ShieldCheck,
  FileText,
  Info
} from 'lucide-react';

interface Prescription {
  id: string;
  prescriptionNumber: string;
  medicationName: string;
  medicationGeneric: string;
  medicationBrand: string;
  dosage: string;
  frequency: string;
  quantity: number;
  refills: number;
  refillsRemaining: number;
  specialInstructions: string;
  sideEffects: string[];
  warnings: string[];
  drugInteractions: string[];
  providerName: string;
  providerId: string;
  status: 'pending' | 'sent' | 'received' | 'filled' | 'picked_up' | 'cancelled';
  prescribedDate: Date;
  expiryDate: Date;
  digitalSignature: string;
  pharmacyName?: string;
  priceComparison: PriceOption[];
}

interface PriceOption {
  pharmacyId: string;
  pharmacyName: string;
  pharmacyAddress: string;
  distance: string;
  price: number;
  inStock: boolean;
  estimatedReadyTime: string;
}

interface EPrescriptionDisplayProps {
  prescription: Prescription;
  onRequestRefill: (prescriptionId: string) => void;
  onSelectPharmacy: (pharmacyId: string) => void;
}

export const EPrescriptionDisplay: React.FC<EPrescriptionDisplayProps> = ({
  prescription,
  onRequestRefill,
  onSelectPharmacy,
}) => {
  const [showPriceComparison, setShowPriceComparison] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = () => {
    switch (prescription.status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sent':
      case 'received':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'filled':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'picked_up':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getStatusIcon = () => {
    switch (prescription.status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'sent':
      case 'received':
        return <Package className="w-5 h-5" />;
      case 'filled':
        return <CheckCircle className="w-5 h-5" />;
      case 'picked_up':
        return <CheckCircle className="w-5 h-5" />;
      case 'cancelled':
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const canRequestRefill = prescription.refillsRemaining > 0 &&
    prescription.status === 'picked_up' &&
    new Date() < prescription.expiryDate;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <Pill className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{prescription.medicationBrand || prescription.medicationName}</h2>
              {prescription.medicationBrand && (
                <p className="text-blue-100">Generic: {prescription.medicationGeneric}</p>
              )}
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg border-2 flex items-center space-x-2 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="font-semibold capitalize">{prescription.status.replace('_', ' ')}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-blue-100 text-sm">Dosage</p>
            <p className="font-semibold text-lg">{prescription.dosage}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Frequency</p>
            <p className="font-semibold text-lg">{prescription.frequency}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Quantity</p>
            <p className="font-semibold text-lg">{prescription.quantity}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Prescription Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Prescription #:</span>
                  <span className="font-medium">{prescription.prescriptionNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Prescribed by:</span>
                  <span className="font-medium">{prescription.providerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Prescribed on:</span>
                  <span className="font-medium">{prescription.prescribedDate.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expires on:</span>
                  <span className="font-medium">{prescription.expiryDate.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Refills remaining:</span>
                  <span className="font-medium">
                    {prescription.refillsRemaining} of {prescription.refills}
                  </span>
                </div>
              </div>
            </div>

            {prescription.pharmacyName && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  <h4 className="font-semibold text-gray-900">Pharmacy</h4>
                </div>
                <p className="text-sm text-gray-700">{prescription.pharmacyName}</p>
              </div>
            )}

            <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
              <ShieldCheck className="w-5 h-5" />
              <span>Digitally signed and tamper-proof</span>
            </div>
          </div>

          <div className="space-y-4">
            {prescription.specialInstructions && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <Info className="w-5 h-5 mr-2" />
                  Special Instructions
                </h4>
                <p className="text-sm text-blue-800">{prescription.specialInstructions}</p>
              </div>
            )}

            {prescription.warnings.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h4 className="font-semibold text-red-900 mb-2 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Warnings
                </h4>
                <ul className="space-y-1">
                  {prescription.warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-red-800 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showDetails && (
              <>
                {prescription.sideEffects.length > 0 && (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h4 className="font-semibold text-yellow-900 mb-2">Possible Side Effects</h4>
                    <ul className="space-y-1">
                      {prescription.sideEffects.map((effect, index) => (
                        <li key={index} className="text-sm text-yellow-800 flex items-start">
                          <span className="mr-2">•</span>
                          <span>{effect}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {prescription.drugInteractions.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">Drug Interactions</h4>
                    <ul className="space-y-1">
                      {prescription.drugInteractions.map((interaction, index) => (
                        <li key={index} className="text-sm text-blue-800 flex items-start">
                          <span className="mr-2">•</span>
                          <span>{interaction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showDetails ? 'Show Less' : 'Show More Details'}
            </button>
          </div>
        </div>

        {showPriceComparison && prescription.priceComparison.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              Price Comparison
            </h3>
            <div className="grid gap-4">
              {prescription.priceComparison.map(option => (
                <div
                  key={option.pharmacyId}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{option.pharmacyName}</h4>
                      <p className="text-sm text-gray-600">{option.pharmacyAddress}</p>
                      <p className="text-xs text-gray-500 mt-1">{option.distance} away</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">${option.price.toFixed(2)}</p>
                      {option.inStock ? (
                        <p className="text-sm text-green-600">In Stock</p>
                      ) : (
                        <p className="text-sm text-red-600">Out of Stock</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Ready in {option.estimatedReadyTime}</p>
                    <button
                      onClick={() => onSelectPharmacy(option.pharmacyId)}
                      disabled={!option.inStock}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {canRequestRefill && (
            <button
              onClick={() => onRequestRefill(prescription.id)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Request Refill</span>
            </button>
          )}

          <button
            onClick={() => setShowPriceComparison(!showPriceComparison)}
            className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            <DollarSign className="w-5 h-5" />
            <span>Compare Prices</span>
          </button>

          <button className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">
            <Download className="w-5 h-5" />
            <span>Download</span>
          </button>

          <button className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">
            <Printer className="w-5 h-5" />
            <span>Print</span>
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            <span>FHIR-compliant prescription record</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PrescriptionsList: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([
    {
      id: '1',
      prescriptionNumber: 'RX-2025-001234',
      medicationName: 'Lisinopril',
      medicationGeneric: 'Lisinopril',
      medicationBrand: 'Prinivil',
      dosage: '10mg',
      frequency: 'Once daily',
      quantity: 30,
      refills: 3,
      refillsRemaining: 2,
      specialInstructions: 'Take in the morning with or without food. Monitor blood pressure regularly.',
      sideEffects: ['Dizziness', 'Dry cough', 'Headache', 'Fatigue'],
      warnings: ['Do not take if pregnant or planning to become pregnant', 'Avoid potassium supplements'],
      drugInteractions: ['NSAIDs may reduce effectiveness', 'Potassium supplements may cause hyperkalemia'],
      providerName: 'Dr. Sarah Johnson',
      providerId: 'provider1',
      status: 'filled',
      prescribedDate: new Date('2025-11-01'),
      expiryDate: new Date('2026-11-01'),
      digitalSignature: 'SHA256:a1b2c3d4...',
      pharmacyName: 'Shoppers Drug Mart - Main St',
      priceComparison: [
        {
          pharmacyId: '1',
          pharmacyName: 'Shoppers Drug Mart',
          pharmacyAddress: '123 Main St, Toronto',
          distance: '0.5 km',
          price: 15.99,
          inStock: true,
          estimatedReadyTime: '2 hours',
        },
        {
          pharmacyId: '2',
          pharmacyName: 'Rexall Pharmacy',
          pharmacyAddress: '456 Queen St, Toronto',
          distance: '1.2 km',
          price: 14.49,
          inStock: true,
          estimatedReadyTime: '3 hours',
        },
      ],
    },
  ]);

  const handleRequestRefill = (prescriptionId: string) => {
    console.log('Requesting refill for:', prescriptionId);
  };

  const handleSelectPharmacy = (pharmacyId: string) => {
    console.log('Selected pharmacy:', pharmacyId);
  };

  return (
    <div className="space-y-6">
      {prescriptions.map(prescription => (
        <EPrescriptionDisplay
          key={prescription.id}
          prescription={prescription}
          onRequestRefill={handleRequestRefill}
          onSelectPharmacy={handleSelectPharmacy}
        />
      ))}
    </div>
  );
};