import React from 'react'

interface FeatureItemProps {
  name: string;
  Icon: React.ComponentType<{ className?: string }>;
}

function FeatureItem({ name, Icon }: FeatureItemProps) {
  return (
    <div className={`bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition`}>
      <Icon className="flex justify-center items-center w-16 h-16 mx-auto bg-green-100 text-green-600 rounded-full mb-4 text-3xl" />
      <h2 className="text-lg font-semibold text-gray-800">{name}</h2>
    </div>
  );
}
export default FeatureItem
