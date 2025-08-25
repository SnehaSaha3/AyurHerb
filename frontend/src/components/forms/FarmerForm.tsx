import RegistrationForms from "./RegistrationForms"

function FarmerForm() {
  return (
    <div className="py-10 bg-gray-50">
      <RegistrationForms
        role="farmer"
        cropOptions={["Tulsi", "Ashwagandha", "Neem", "Brahmi", "Aloe Vera"]}
      />
    </div>
  );
}

export default FarmerForm
