import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WORKER_CATEGORIES } from '../../constants/workers';
import { FARMERS_SERVICES } from '../../constants/farmers';

export function Workers() {
  const navigate = useNavigate();
  React.useEffect(() => {
    console.log('FARMERS_SERVICES:', FARMERS_SERVICES);
    if (FARMERS_SERVICES.length === 0) {
      console.error('FARMERS_SERVICES is empty. Check the import or data file.');
    }
  }, []);
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Worker Categories</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {WORKER_CATEGORIES.map((category) => (
          <div
            key={category.category}
            className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transform transition-transform duration-300 hover:scale-105"
            onClick={() => navigate(`/dashboard/workers/${category.category}`)}
          >
            <div className="relative h-48">
              <img
                src={category.image}
                alt={category.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                <category.icon className="w-12 h-12 text-white" />
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">{category.title}</h3>
              <p className="text-gray-600 mb-4">{category.description}</p>
              <button className="text-emerald-600 font-medium hover:text-emerald-700">
                View Workers →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}