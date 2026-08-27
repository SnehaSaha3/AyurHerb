import CropMap from "../maps/CropMap";

export default function CompanyExplore() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">
          Farm Network
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Explore geo-tagged farmers and available crops.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="h-[650px]">
          <CropMap />
        </div>
      </div>
    </div>
  );
}