// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CropRegistry {
    struct Crop {
        uint256 id;
        string name;     
        string area;     
        string season;   
        string soil;     
        string lat;      
        string lng;      
        uint256 createdAt;
        uint256 updatedAt;
        address farmer;  // ✅ who owns this crop
    }

    mapping(uint256 => Crop) public crops;
    mapping(address => uint256[]) public farmerCrops; // ✅ farmer → cropIds
    uint256 public cropCount;

    event CropAdded(uint256 indexed cropId, address indexed farmer, string name);
    event CropUpdated(uint256 indexed cropId, address indexed farmer, string name);

    function upsertCrop(
        string memory _name,
        string memory _area,
        string memory _season,
        string memory _soil,
        string memory _lat,
        string memory _lng
    ) public returns (uint256 cropId, bool isNew) {
        // Simple new crop logic (one farmer can have multiple crops)
        cropId = cropCount;
        crops[cropId] = Crop({
            id: cropId,
            name: _name,
            area: _area,
            season: _season,
            soil: _soil,
            lat: _lat,
            lng: _lng,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            farmer: msg.sender // ✅ farmer wallet from tx
        });
        farmerCrops[msg.sender].push(cropId);
        cropCount++;

        emit CropAdded(cropId, msg.sender, _name);
        return (cropId, true);
    }

    function getCropsByFarmer(address _farmer) 
        public view returns (Crop[] memory) 
    {
        uint256[] memory ids = farmerCrops[_farmer];
        Crop[] memory list = new Crop[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            list[i] = crops[ids[i]];
        }
        return list;
    }

    function getCrop(uint256 _cropId) public view returns (Crop memory) {
        require(_cropId < cropCount, "Crop does not exist");
        return crops[_cropId];
    }

    function getAllCrops() public view returns (Crop[] memory) {
        Crop[] memory list = new Crop[](cropCount);
        for (uint256 i = 0; i < cropCount; i++) {
            list[i] = crops[i];
        }
        return list;
    }
}

