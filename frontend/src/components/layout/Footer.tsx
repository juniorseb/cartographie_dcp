export default function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
        <p>&copy; {new Date().getFullYear()} ARTCI - Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire</p>
        <p className="text-gray-400">Conforme à la Loi N°2013-450 relative à la protection des données personnelles</p>
      </div>
    </footer>
  );
}
