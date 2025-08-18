import React, { useState } from "react"

interface RegistrationFormProps{
    role: "farmer" | "company"
    cropOptions?: string[]
}
function RegistrationForms({role, cropOptions}: RegistrationFormProps){
    const [formData, setFormData] = useState<any>({
        name:"",
        contact:"",
        address:"",
        herb: cropOptions?.[0] || "",
        image: null
    })
    const handleChange =(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>{
            const {name , value}= e.target
            setFormData((prev: any)=> ({ ...prev,[name]: value}))
        }
    const handleImageChange =(e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
           setFormData((prev: any) => ({ ...prev, image: e.target.files![0] }));
       }
    }
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
         console.log("Form Data:", formData)
           alert(`${role} registered successfully!`)
    }
    return (
        <div className="max-w-lg mx-auto bg-white shadow-lg p-6 rounded-xl">
           <h2 className="text-2xl font-bold mb-4 text-green-700 capitalize">
               {role} Registration
           </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder={`${role} Name`}
          value={formData.name}
          onChange={handleChange}
          className="w-full border rounded-lg p-2"
          required
        />

        <input
          type="tel"
          name="contact"
          placeholder="Contact Number"
          value={formData.contact}
          onChange={handleChange}
          className="w-full border rounded-lg p-2"
          required
        />

        <input
          type="text"
          name="address"
          placeholder="Address / Village / Location"
          value={formData.address}
          onChange={handleChange}
          className="w-full border rounded-lg p-2"
          required
        />

        {/* Farmer-specific fields */}
        {role === "farmer" && cropOptions && (
          <>
            <select
              name="herb"
              value={formData.herb}
              onChange={handleChange}
              className="w-full border rounded-lg p-2"
            >
              {cropOptions.map((crop) => (
                <option key={crop} value={crop}>
                  {crop}
                </option>
              ))}
            </select>

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full border rounded-lg p-2"
              required
            />
          </>
        )}

        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg"
        >
          Register {role}
        </button>
      </form>
    </div>
  )
    
}

export default RegistrationForms