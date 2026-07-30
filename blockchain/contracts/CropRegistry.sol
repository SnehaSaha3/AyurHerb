// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CropRegistry {
    struct Crop {
        uint256 id;
        string name;
        string area;
        string season;
        string soil;
        int256 lat;
        int256 lng;
        uint256 createdAt;
        uint256 updatedAt;
        address farmer;
    }

    mapping(uint256 => Crop) public crops;
    mapping(address => uint256[]) public farmerCrops;
    uint256 public cropCount;

    event CropAdded(uint256 indexed cropId, address indexed farmer, string name);
    event CropUpdated(uint256 indexed cropId, address indexed farmer, string name);

    /// @notice Adds a crop attributed to `_farmerAddr`, not msg.sender.
    /// @dev Since a single relayer wallet submits transactions on behalf of
    ///      all farmers, the farmer's identity must be passed explicitly.
    ///      Add access control (e.g. onlyRelayer / signature check) if this
    ///      contract is public, so one farmer can't spoof another's address.
    function upsertCrop(
        address _farmerAddr,
        string memory _name,
        string memory _area,
        string memory _season,
        string memory _soil,
        int256 _lat,
        int256 _lng
    ) public returns (uint256 cropId, bool isNew) {
        require(_farmerAddr != address(0), "Invalid farmer address");

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
            farmer: _farmerAddr
        });

        farmerCrops[_farmerAddr].push(cropId);
        cropCount++;

        emit CropAdded(cropId, _farmerAddr, _name);
        return (cropId, true);
    }

    function getCropsByFarmer(address _farmer) public view returns (Crop[] memory) {
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