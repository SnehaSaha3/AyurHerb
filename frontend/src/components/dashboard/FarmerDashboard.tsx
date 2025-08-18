import DashboardLayout from "./DashboardLayout"

function FarmerDashboard(){
    const farmerLinks = [
        {name:"Home",path:""},
        {name:"My Crops",path:""},
        {name:"Geo Tagging",path:""},
        {name:"Profile",path:""}
    ]
    return <DashboardLayout userType="farmer" links={farmerLinks} />
}

export default FarmerDashboard