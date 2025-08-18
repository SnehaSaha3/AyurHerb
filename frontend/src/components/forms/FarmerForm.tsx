import RegistrationForms from "./RegistrationForms"

function FarmerForm() {
  return (
    <div className="py-10 bg-gray-50">
      <RegistrationForms
        role="farmer"
        cropOptions={["Tulsi", "Ashwagandha"]}
      />
    </div>
  );
}

export default FarmerForm;

