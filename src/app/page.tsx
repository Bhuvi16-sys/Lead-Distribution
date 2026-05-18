import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden text-center p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Prowider</h1>
        <p className="text-gray-500 mb-8">Lead Distribution System</p>
        
        <div className="space-y-4">
          <Link href="/request-service" className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors">
            Customer Request Form
          </Link>
          <Link href="/dashboard" className="block w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 rounded-lg transition-colors">
            Provider Dashboard
          </Link>
          <Link href="/test-tools" className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors">
            Testing Panel
          </Link>
        </div>
      </div>
    </div>
  );
}
