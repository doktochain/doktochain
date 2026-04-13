import GatewaySetupInterface from '../../../../../components/billing/GatewaySetupInterface';

export default function GatewaySetupPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Payment Gateway Setup
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure your payment processors to accept patient payments
        </p>
      </div>

      <GatewaySetupInterface />
    </div>
  );
}
